/* Haushaltsplan: Wiederkehrende Zahlungen und jährliche Anpassungen */
(function () {
  'use strict';

  const PERIODS = {
    monthly: { label: 'Monatlich', months: 1 },
    quarterly: { label: 'Vierteljährlich', months: 3 },
    four_monthly: { label: 'Dritteljährlich', months: 4 },
    semiannual: { label: 'Halbjährlich', months: 6 },
    annual: { label: 'Jährlich', months: 12 },
  };

  const oldPersist = persist;
  persist = function persistWithRules() {
    clearTimeout(_pTimer);
    _pTimer = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          data: S.data,
          cats: S.cats,
          kredite: S.kredite,
          years: S.years,
          buchungen: S.buchungen,
          budgets: S.budgets,
          recurringRules: S.recurringRules || [],
          annualAdjustments: S.annualAdjustments || [],
        }));
      } catch (e) {
        console.warn('persist failed', e);
      }
    }, 300);
  };

  const oldLoad = load;
  load = function loadWithRules() {
    oldLoad();
    try {
      const raw = localStorage.getItem(LS_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      S.recurringRules = Array.isArray(saved.recurringRules) ? saved.recurringRules : [];
      S.annualAdjustments = Array.isArray(saved.annualAdjustments) ? saved.annualAdjustments : [];
    } catch (e) {
      S.recurringRules = [];
      S.annualAdjustments = [];
    }
  };

  function monthIndex(year, month) {
    return year * 12 + month;
  }

  function isRuleActive(rule, year, month) {
    const current = monthIndex(year, month);
    const start = monthIndex(rule.startYear, rule.startMonth);
    if (current < start) return false;
    if (rule.endYear !== null && rule.endYear !== undefined) {
      const end = monthIndex(rule.endYear, rule.endMonth || 0);
      if (current > end) return false;
    }
    return (current - start) % rule.intervalMonths === 0;
  }

  function latestAdjustment(catId, year, month) {
    const current = monthIndex(year, month);
    return (S.annualAdjustments || [])
      .filter(a => a.catId === catId && monthIndex(a.year, a.month) <= current)
      .sort((a, b) => monthIndex(b.year, b.month) - monthIndex(a.year, a.month))[0] || null;
  }

  function recurringValue(year, month, cat) {
    const rules = (S.recurringRules || []).filter(r => r.catId === cat.id && isRuleActive(r, year, month));
    if (!rules.length) return null;
    return rules.reduce((sum, rule) => sum + Number(rule.amount || 0), 0);
  }

  const oldGv = gv;
  gv = function gvWithAutomation(year, month, cat) {
    const customKey = dkey(year, month, cat.id);
    if (S.data[customKey] !== undefined) return S.data[customKey];

    const recurring = recurringValue(year, month, cat);
    if (recurring !== null) return recurring;

    const adjustment = latestAdjustment(cat.id, year, month);
    if (adjustment) return Number(adjustment.amount || 0);

    return oldGv(year, month, cat);
  };

  function periodOptions(selected) {
    return Object.entries(PERIODS).map(([key, period]) =>
      `<option value="${key}"${key === selected ? ' selected' : ''}>${period.label}</option>`
    ).join('');
  }

  function categoryOptions(types, selected) {
    return S.cats.filter(c => types.includes(c.t)).map(c =>
      `<option value="${esc(c.id)}"${c.id === selected ? ' selected' : ''}>${esc(c.p)}</option>`
    ).join('');
  }

  window.openRecurringRule = function openRecurringRule(ruleId) {
    const rule = (S.recurringRules || []).find(r => r.id === ruleId) || {};
    const nowYear = S.year;
    const catOptions = categoryOptions(['E', 'F', 'K', 'S'], rule.catId);
    openGenSheet(`
      <div class="sheet-title">Wiederkehrende Zahlung</div>
      <div class="field"><div class="lbl">Position</div><div class="sw"><select class="sel" id="rr-cat">${catOptions}</select></div></div>
      <div class="field"><div class="lbl">Betrag je Zahlung (€)</div><input class="inp" type="number" id="rr-amount" min="0" step="0.01" value="${rule.amount ?? ''}" inputmode="decimal"/></div>
      <div class="field"><div class="lbl">Intervall</div><div class="sw"><select class="sel" id="rr-period">${periodOptions(rule.period || 'monthly')}</select></div></div>
      <div class="gap-row">
        <div class="field"><div class="lbl">Startjahr</div><input class="inp" type="number" id="rr-year" value="${rule.startYear ?? nowYear}" min="2020" max="2100"/></div>
        <div class="field"><div class="lbl">Startmonat</div><div class="sw"><select class="sel" id="rr-month">${MF.map((m, i) => `<option value="${i}"${i === (rule.startMonth ?? S.month) ? ' selected' : ''}>${m}</option>`).join('')}</select></div></div>
      </div>
      <div style="font-size:12px;color:var(--t3);line-height:1.5;margin-bottom:14px">Der Betrag wird nur in den fälligen Monaten angesetzt. Beispiel: vierteljährlich ab März = März, Juni, September und Dezember.</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:2" onclick="saveRecurringRule('${esc(rule.id || '')}')">Speichern</button>
        ${rule.id ? `<button class="btn btn-red" style="flex:1" onclick="deleteRecurringRule('${esc(rule.id)}')">Löschen</button>` : ''}
      </div>`);
  };

  window.saveRecurringRule = function saveRecurringRule(ruleId) {
    const catId = document.getElementById('rr-cat')?.value;
    const amount = Number(document.getElementById('rr-amount')?.value);
    const period = document.getElementById('rr-period')?.value;
    const startYear = Number(document.getElementById('rr-year')?.value);
    const startMonth = Number(document.getElementById('rr-month')?.value);
    if (!catId || !Number.isFinite(amount) || amount < 0 || !PERIODS[period]) return toast('Bitte Eingaben prüfen', 'err');
    const next = {
      id: ruleId || uid(), catId, amount, period,
      intervalMonths: PERIODS[period].months,
      startYear, startMonth, endYear: null, endMonth: null,
    };
    S.recurringRules = S.recurringRules || [];
    const index = S.recurringRules.findIndex(r => r.id === ruleId);
    if (index >= 0) S.recurringRules[index] = next; else S.recurringRules.push(next);
    persist(); closeGenSheet(); render(); toast('Zahlungsrhythmus gespeichert');
  };

  window.deleteRecurringRule = function deleteRecurringRule(ruleId) {
    S.recurringRules = (S.recurringRules || []).filter(r => r.id !== ruleId);
    persist(); closeGenSheet(); render(); toast('Zahlungsrhythmus gelöscht');
  };

  window.openAnnualAdjustment = function openAnnualAdjustment(adjustmentId) {
    const item = (S.annualAdjustments || []).find(a => a.id === adjustmentId) || {};
    const catOptions = categoryOptions(['E'], item.catId);
    openGenSheet(`
      <div class="sheet-title">Jährliche Einkommensanpassung</div>
      <div class="field"><div class="lbl">Einnahme</div><div class="sw"><select class="sel" id="aa-cat">${catOptions}</select></div></div>
      <div class="field"><div class="lbl">Neuer Monatsbetrag (€)</div><input class="inp" type="number" id="aa-amount" min="0" step="0.01" value="${item.amount ?? ''}" inputmode="decimal"/></div>
      <div class="gap-row">
        <div class="field"><div class="lbl">Gültig ab Jahr</div><input class="inp" type="number" id="aa-year" value="${item.year ?? S.year}" min="2020" max="2100"/></div>
        <div class="field"><div class="lbl">Gültig ab Monat</div><div class="sw"><select class="sel" id="aa-month">${MF.map((m, i) => `<option value="${i}"${i === (item.month ?? S.month) ? ' selected' : ''}>${m}</option>`).join('')}</select></div></div>
      </div>
      <div style="font-size:12px;color:var(--t3);line-height:1.5;margin-bottom:14px">Der neue Betrag gilt ab dem gewählten Monat fortlaufend, bis eine weitere Anpassung erfasst wird.</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:2" onclick="saveAnnualAdjustment('${esc(item.id || '')}')">Speichern</button>
        ${item.id ? `<button class="btn btn-red" style="flex:1" onclick="deleteAnnualAdjustment('${esc(item.id)}')">Löschen</button>` : ''}
      </div>`);
  };

  window.saveAnnualAdjustment = function saveAnnualAdjustment(adjustmentId) {
    const catId = document.getElementById('aa-cat')?.value;
    const amount = Number(document.getElementById('aa-amount')?.value);
    const year = Number(document.getElementById('aa-year')?.value);
    const month = Number(document.getElementById('aa-month')?.value);
    if (!catId || !Number.isFinite(amount) || amount < 0) return toast('Bitte Eingaben prüfen', 'err');
    const next = { id: adjustmentId || uid(), catId, amount, year, month };
    S.annualAdjustments = S.annualAdjustments || [];
    const index = S.annualAdjustments.findIndex(a => a.id === adjustmentId);
    if (index >= 0) S.annualAdjustments[index] = next; else S.annualAdjustments.push(next);
    persist(); closeGenSheet(); render(); toast('Einkommensanpassung gespeichert');
  };

  window.deleteAnnualAdjustment = function deleteAnnualAdjustment(adjustmentId) {
    S.annualAdjustments = (S.annualAdjustments || []).filter(a => a.id !== adjustmentId);
    persist(); closeGenSheet(); render(); toast('Einkommensanpassung gelöscht');
  };

  function automationCard() {
    const rules = (S.recurringRules || []).map(rule => {
      const cat = S.cats.find(c => c.id === rule.catId);
      return `<div class="row"><span class="row-name">${esc(cat?.p || 'Unbekannt')}<br><small style="color:var(--t3)">${PERIODS[rule.period]?.label || ''} · ab ${MF[rule.startMonth]} ${rule.startYear}</small></span><span class="row-amt">${fmtS(rule.amount)}</span><button class="row-edit-btn" onclick="openRecurringRule('${esc(rule.id)}')">✎</button></div>`;
    }).join('');
    const adjustments = (S.annualAdjustments || []).sort((a, b) => monthIndex(a.year, a.month) - monthIndex(b.year, b.month)).map(item => {
      const cat = S.cats.find(c => c.id === item.catId);
      return `<div class="row"><span class="row-name">${esc(cat?.p || 'Unbekannt')}<br><small style="color:var(--t3)">ab ${MF[item.month]} ${item.year}</small></span><span class="row-amt e">${fmtS(item.amount)}</span><button class="row-edit-btn" onclick="openAnnualAdjustment('${esc(item.id)}')">✎</button></div>`;
    }).join('');
    return `<div class="card"><div class="card-title">Automatische Planung</div>
      ${rules || '<div style="font-size:13px;color:var(--t3);margin-bottom:10px">Noch keine wiederkehrenden Zahlungen erfasst.</div>'}
      <button class="btn btn-ghost btn-full" onclick="openRecurringRule('')">+ Wiederkehrende Zahlung</button>
      <div class="sheet-divider"></div>
      ${adjustments || '<div style="font-size:13px;color:var(--t3);margin-bottom:10px">Noch keine Einkommensanpassungen erfasst.</div>'}
      <button class="btn btn-ghost btn-full" onclick="openAnnualAdjustment('')">+ Gehalt oder Rente anpassen</button>
    </div>`;
  }

  const oldSettings = typeof vEinstellungen === 'function' ? vEinstellungen : null;
  if (oldSettings) {
    vEinstellungen = function vEinstellungenWithAutomation() {
      return oldSettings() + automationCard();
    };
  }
})();
