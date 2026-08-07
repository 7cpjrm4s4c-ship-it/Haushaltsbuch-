import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

async function run(path, context) {
  vm.runInContext(await source(path), context, { filename: path });
}

function makeContext(extra = {}) {
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    Intl,
    Math,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    JSON,
    ...extra,
  };
  context.globalThis = context;
  vm.createContext(context);
  return context;
}

function almost(actual, expected, epsilon = 0.01, message = '') {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${message} erwartet ${expected}, erhalten ${actual}`);
}

// ─────────────────────────────────────────────────────────────
// Fixkosten, Intervalle, Enddatum, Steigerungen und Dashboard
// ─────────────────────────────────────────────────────────────
{
  const S = {
    data: {},
    cats: [],
    recurringRules: [],
    annualAdjustments: [],
    percentageAdjustments: [],
    buchungen: [],
    budgets: {},
    ui: {},
    year: 2026,
    month: 0,
  };

  const context = makeContext({
    S,
    gv: () => 0,
    calcMonth: () => ({}),
    variableBookingGroups: () => '',
    dkey: (y, m, id) => `${y}_${m}_${id}`,
    getBuchungenForMonth: (y, m) => S.buchungen.filter(b => b.year === y && b.month === m),
    persist: () => {},
    closeGenSheet: () => {},
    render: () => {},
    toast: () => {},
    uid: () => 'test-id',
    document: { getElementById: () => null },
    esc: value => String(value),
    fmt: value => String(value),
    MF: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    managerButton: () => '',
    openBookingDialog: () => {},
    deleteBooking: () => {},
  });

  await run('js/data-consistency.js', context);

  const quarterly = { id: 'strom', g: 'Wohnen', p: 'Strom', d: 0, t: 'F' };
  S.cats = [quarterly];
  S.recurringRules = [{
    id: 'r1', catId: 'strom', amount: 120,
    intervalMonths: 3, startYear: 2026, startMonth: 2,
    endYear: 2026, endMonth: 8,
  }];

  assert.equal(context.gv(2026, 1, quarterly), 0, 'vor dem Startmonat muss der Wert 0 sein');
  assert.equal(context.gv(2026, 2, quarterly), 120, 'Startmonat muss fällig sein');
  assert.equal(context.gv(2026, 3, quarterly), 0, 'Zwischenmonat darf nicht fällig sein');
  assert.equal(context.gv(2026, 5, quarterly), 120, 'zweite Quartalszahlung muss fällig sein');
  assert.equal(context.gv(2026, 8, quarterly), 120, 'Endmonat darf noch fällig sein');
  assert.equal(context.gv(2026, 11, quarterly), 0, 'nach dem Endmonat muss der Wert 0 sein');

  const salary = { id: 'gehalt', g: 'Einnahmen', p: 'Gehalt', d: 3000, t: 'E' };
  S.cats = [salary];
  S.recurringRules = [{
    id: 'r2', catId: 'gehalt', amount: 3000,
    intervalMonths: 1, startYear: 2026, startMonth: 0,
    endYear: null, endMonth: null,
  }];
  S.percentageAdjustments = [{
    id: 'p1', catId: 'gehalt', year: 2027, month: 6,
    percent: 3, repeatAnnual: true,
  }];

  assert.equal(context.gv(2027, 5, salary), 3000, 'vor der jährlichen Erhöhung muss der Grundbetrag gelten');
  assert.equal(context.gv(2027, 6, salary), 3090, 'Erhöhung muss ab dem gewählten Monat gelten');
  assert.equal(context.gv(2028, 5, salary), 3090, 'bis zum nächsten Jahrestermin muss die erste Erhöhung gelten');
  assert.equal(context.gv(2028, 6, salary), 3182.7, 'im Folgejahr muss die Erhöhung erneut angewendet werden');

  const rent = { id: 'miete', g: 'Wohnen', p: 'Miete', d: 1000, t: 'F' };
  const loan = { id: 'rate', g: 'Kredite', p: 'Rate', d: 200, t: 'K' };
  const savings = { id: 'etf', g: 'Sparen', p: 'ETF', d: 100, t: 'S' };
  const variable = { id: 'food', g: 'Variable Ausgaben', p: 'Lebensmittel', d: 0, t: 'V' };
  S.cats = [salary, rent, loan, savings, variable];
  S.recurringRules = [
    { id:'e', catId:'gehalt', amount:3000, intervalMonths:1, startYear:2026, startMonth:0, endYear:null, endMonth:null },
    { id:'f', catId:'miete', amount:1000, intervalMonths:1, startYear:2026, startMonth:0, endYear:null, endMonth:null },
    { id:'k', catId:'rate', amount:200, intervalMonths:1, startYear:2026, startMonth:0, endYear:null, endMonth:null },
    { id:'s', catId:'etf', amount:100, intervalMonths:1, startYear:2026, startMonth:0, endYear:null, endMonth:null },
  ];
  S.percentageAdjustments = [];
  S.buchungen = [
    { id:'b1', catId:'food', betrag:80, year:2026, month:0 },
    { id:'b2', catId:'food', betrag:20, year:2026, month:0 },
    { id:'b3', catId:'food', betrag:999, year:2026, month:1 },
  ];

  const month = context.calcMonth(2026, 0);
  assert.equal(month.e, 3000);
  assert.equal(month.f, 1000);
  assert.equal(month.v, 100, 'nur variable Buchungen des ausgewählten Monats dürfen einfließen');
  assert.equal(month.k, 200);
  assert.equal(month.s, 100);
  assert.equal(month.aus, 1400);
  assert.equal(month.saldo, 1600);
}

// ─────────────────────────────────────────────────────────────
// Kreditfortschreibung: Rate minus Zinsen = Tilgung
// ─────────────────────────────────────────────────────────────
{
  const context = makeContext({
    S: { kredite: [], years: [2026, 2027], year: 2026, month: 0 },
    vKredite: () => '',
    kreditForm: () => '',
    readKreditForm: value => value,
    fmt: value => String(value),
    fmtS: value => String(value),
    esc: value => String(value),
    MF: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    toast: () => {},
    document: { getElementById: () => null },
  });

  await run('js/credit-calculation.js', context);

  const credit = {
    id: 'k1', n: 'Testkredit',
    s: 1200, r: 1200, m: 100, z: 12,
    balanceYear: 2026, balanceMonth: 0,
  };

  assert.equal(context.creditBalanceAt(credit, 2026, 0), 1200, 'Stichtagsmonat muss die eingegebene Restschuld zeigen');
  assert.equal(context.creditInterestAt(credit, 2026, 0), 12, '12 % p.a. entsprechen im ersten Monat 1 % Zins');
  assert.equal(context.creditPrincipalAt(credit, 2026, 0), 88, '100 € Rate minus 12 € Zins ergeben 88 € Tilgung');
  assert.equal(context.creditBalanceAt(credit, 2026, 1), 1112, 'nach einem Monat muss Zins addiert und Rate abgezogen sein');
  assert.equal(context.creditPaidAmountAt(credit, 2026, 1), 88);

  const lowRate = { ...credit, m: 10 };
  assert.equal(context.creditRemainingMonthsFrom(lowRate, 2026, 0), null, 'Rate unterhalb der Monatszinsen darf keine Laufzeit liefern');
  assert.equal(context.creditEndDateAt(lowRate, 2026, 0), 'Rate zu niedrig');
}

// ─────────────────────────────────────────────────────────────
// Persistenz: vollständiger Roundtrip und echte Leerzustände
// ─────────────────────────────────────────────────────────────
{
  const store = new Map();
  const localStorage = {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  };

  const S = {
    data: {}, cats: [], kredite: [], years: [2026, 2027, 2028],
    buchungen: [], budgets: {}, recurringRules: [], annualAdjustments: [], percentageAdjustments: [],
    year: 2026, month: 0,
  };

  const context = makeContext({
    S,
    localStorage,
    LS_KEY: 'hp5',
    _pTimer: null,
    persist: () => {},
    load: () => {},
    now: new Date(2026, 0, 1),
    defaultYears: () => [2026, 2027, 2028],
    applyFactoryState: () => { throw new Error('Werkseinstellungen dürfen bei vorhandenem Speicherstand nicht geladen werden'); },
    normalizeVariableCategories: () => {},
    creditStartAmount: k => Number(k.s ?? (Number(k.r || 0) + Number(k.g || 0))),
    creditReferenceYear: k => Number(k.balanceYear ?? 2026),
    creditReferenceMonth: k => Number(k.balanceMonth ?? 0),
    syncAllLoans: () => {},
    sortCategoriesInPlace: () => {},
  });

  await run('js/state-storage.js', context);

  Object.assign(S, {
    data: { '2026_0_f1': 42 },
    cats: [{ id:'f1', g:'Wohnen', p:'Test', d:42, t:'F' }],
    kredite: [],
    buchungen: [{ id:'b1', catId:'v1', betrag:8.45, year:2026, month:0 }],
    budgets: { v1: 200 },
    recurringRules: [{ id:'r1', catId:'f1', amount:42, intervalMonths:3, startYear:2026, startMonth:0, endYear:2027, endMonth:6 }],
    annualAdjustments: [{ id:'a1', catId:'f1', amount:50, year:2027, month:0 }],
    percentageAdjustments: [{ id:'p1', catId:'f1', percent:2, year:2027, month:0, repeatAnnual:true }],
  });

  context.persist();
  await new Promise(resolve => setTimeout(resolve, 350));

  const raw = JSON.parse(localStorage.getItem('hp5'));
  assert.equal(raw.kredite.length, 0, 'eine bewusst leere Kreditliste muss gespeichert werden');
  assert.equal(raw.recurringRules.length, 1, 'Intervallregeln müssen gespeichert werden');
  assert.equal(raw.annualAdjustments.length, 1, 'absolute Anpassungen müssen gespeichert werden');
  assert.equal(raw.percentageAdjustments.length, 1, 'prozentuale Anpassungen müssen gespeichert werden');
  assert.equal(raw.recurringRules[0].endMonth, 6, 'Endmonat muss erhalten bleiben');

  S.data = {};
  S.cats = [];
  S.kredite = [{ id:'unerwünscht' }];
  S.buchungen = [];
  S.budgets = {};
  S.recurringRules = [];
  S.annualAdjustments = [];
  S.percentageAdjustments = [];

  context.load();

  assert.equal(S.kredite.length, 0, 'leere Kreditlisten dürfen beim Neustart nicht mit Platzhaltern gefüllt werden');
  assert.equal(S.buchungen.length, 1);
  assert.equal(S.recurringRules[0].endYear, 2027);
  assert.equal(S.percentageAdjustments[0].repeatAnnual, true);
  assert.equal(S.data['2026_0_f1'], 42);
}

console.log('Alle App-Integrationstests erfolgreich.');
