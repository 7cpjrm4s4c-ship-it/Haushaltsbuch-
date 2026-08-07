/* Einheitliche Datenquelle für Buchungen, Fixkosten und Dashboard. */
'use strict';

function absoluteMonth(year, month) {
  return Number(year) * 12 + Number(month);
}

function planningEventsSnapshot(){
  return PlanningEvents.fromLegacy(S);
}

gv = function consistentValue(year, month, cat) {
  const customKey=dkey(year,month,cat.id);
  return PlanningEvents.valueForMonth({
    events:planningEventsSnapshot(),
    catId:cat.id,
    year,month,
    defaultValue:cat.d,
    customValue:S.data[customKey],
  });
};

calcMonth = function consistentMonthCalculation(year, month) {
  let e = 0, f = 0, k = 0, s = 0;
  for (const cat of S.cats) {
    if (cat.t === 'V') continue;
    const value = gv(year, month, cat);
    if (cat.t === 'E') e += value;
    else if (cat.t === 'F') f += value;
    else if (cat.t === 'K') k += value;
    else if (cat.t === 'S') s += value;
  }
  const v = getBuchungenForMonth(year, month)
    .reduce((sum, booking) => sum + Number(booking.betrag || 0), 0);
  const aus = f + v + k + s;
  return { e, f, v, k, s, aus, saldo: e - aus };
};

function savePositionDialog(catId) {
  const name = document.getElementById('pos-name')?.value.trim();
  const amount = Number(document.getElementById('pos-amount')?.value);
  const type = document.getElementById('pos-type')?.value;
  const chosenCategory = document.getElementById('pos-group')?.value;
  const category = chosenCategory === '__new'
    ? document.getElementById('pos-group-new')?.value.trim()
    : chosenCategory;
  const startMonth = Number(document.getElementById('pos-start-month')?.value || 0);
  const startYear = Number(document.getElementById('pos-start-year')?.value || S.year);
  const endEnabled = Boolean(document.getElementById('pos-end-enabled')?.checked);
  const endMonth = endEnabled ? Number(document.getElementById('pos-end-month')?.value) : null;
  const endYear = endEnabled ? Number(document.getElementById('pos-end-year')?.value) : null;

  if (!name || !category || !type || !Number.isFinite(amount) || amount < 0) {
    return toast('Bezeichnung, Kategorie und Betrag prüfen', 'err');
  }
  if (endEnabled && absoluteMonth(endYear, endMonth) < absoluteMonth(startYear, startMonth)) {
    return toast('Endmonat darf nicht vor dem Startmonat liegen', 'err');
  }

  let cat = S.cats.find(item => item.id === catId);
  if (!cat) {
    cat = { id: uid(), g: category, p: name, d: amount, t: type };
    S.cats.push(cat);
    catId = cat.id;
  } else {
    Object.assign(cat, { g: category, p: name, d: amount, t: type });
  }

  for (const key of Object.keys(S.data || {})) {
    if (key.endsWith(`_${catId}`)) delete S.data[key];
  }

  S.recurringRules = (S.recurringRules || []).filter(rule => rule.catId !== catId);
  S.recurringRules.push({
    id: uid(), catId, amount,
    intervalMonths: Number(document.getElementById('pos-interval')?.value || 1),
    startMonth, startYear, endMonth, endYear,
  });

  S.percentageAdjustments = (S.percentageAdjustments || []).filter(item => item.catId !== catId);
  const increaseMonth = document.getElementById('pos-inc-month')?.value;
  const percent = Number(document.getElementById('pos-inc-percent')?.value);
  if (increaseMonth !== '' && Number.isFinite(percent) && percent !== 0) {
    S.percentageAdjustments.push({
      id: uid(), catId,
      month: Number(increaseMonth),
      year: Number(document.getElementById('pos-inc-year')?.value || S.year),
      percent, repeatAnnual: true,
    });
  }

  S.amountAdjustments = (S.amountAdjustments || []).filter(item => item.catId !== catId);
  const fixedIncrease = Number(document.getElementById('pos-fixed-inc-amount')?.value);
  const fixedIncreaseMonth = document.getElementById('pos-fixed-inc-month')?.value;
  if (fixedIncreaseMonth !== '' && Number.isFinite(fixedIncrease) && fixedIncrease !== 0) {
    S.amountAdjustments.push({
      id: uid(), catId,
      month: Number(fixedIncreaseMonth),
      year: Number(document.getElementById('pos-fixed-inc-year')?.value || S.year),
      amount: fixedIncrease,
    });
  }

  S.oneTimeEntries = (S.oneTimeEntries || []).filter(item => item.catId !== catId);
  const oneTimeAmount = Number(document.getElementById('pos-once-amount')?.value);
  const oneTimeMonth = document.getElementById('pos-once-month')?.value;
  if (oneTimeMonth !== '' && Number.isFinite(oneTimeAmount) && oneTimeAmount !== 0) {
    S.oneTimeEntries.push({
      id: uid(), catId,
      month: Number(oneTimeMonth),
      year: Number(document.getElementById('pos-once-year')?.value || S.year),
      amount: oneTimeAmount,
      label: document.getElementById('pos-once-label')?.value.trim() || 'Einmalzahlung',
    });
  }

  S.ui.pendingFixedCategory = '';
  if (typeof sortCategoriesInPlace === 'function') sortCategoriesInPlace();
  persist();
  closeGenSheet();
  render();
  toast('Position gespeichert');
}
