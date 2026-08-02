/* Gemeinsamer Bereich für regelmäßige Einnahmen, Fixkosten, Kredite und Sparraten. */
'use strict';

VIEW_TITLES.uebersicht = 'Fixkosten';
VIEW_TITLES.einstellungen = 'Fixkosten';

S.ui = S.ui || {};
S.ui.fixedType = S.ui.fixedType || 'all';
S.ui.fixedGroup = S.ui.fixedGroup || 'all';
S.ui.fixedSearch = S.ui.fixedSearch || '';

function fixedCostCategories() {
  return S.cats.filter(cat => ['E', 'F', 'K', 'S'].includes(cat.t));
}

function fixedCostTypeOptions(selected) {
  return [
    ['all', 'Alle Bereiche'],
    ['E', 'Einnahmen'],
    ['F', 'Fixkosten'],
    ['K', 'Kredite'],
    ['S', 'Sparen'],
  ].map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('');
}

function fixedCostGroups(selected) {
  const groups = [...new Set(fixedCostCategories().map(cat => cat.g))];
  return `<option value="all">Alle Gruppen</option>` + groups.map(group =>
    `<option value="${esc(group)}"${group === selected ? ' selected' : ''}>${esc(group)}</option>`
  ).join('');
}

function fixedCostRows(categories) {
  return categories.map(cat => {
    const value = gv(S.year, S.month, cat);
    const adjusted = isCustom(S.year, S.month, cat);
    return `<div class="compact-row">
      <div class="compact-main">
        <div class="compact-title">${esc(cat.p)}</div>
        <div class="compact-sub">${esc(cat.g)} · ${TL[cat.t]}${adjusted ? ' · angepasst' : ''}</div>
      </div>
      <div class="compact-value ${RC[cat.t] || ''}">${fmtS(value)}</div>
      <button class="row-edit-btn" onclick="openEditValue('${esc(cat.id)}','${S.year}','${S.month}')">✎</button>
    </div>`;
  }).join('');
}

function fixedCostSummary(categories) {
  const totals = { E: 0, F: 0, K: 0, S: 0 };
  categories.forEach(cat => { totals[cat.t] += gv(S.year, S.month, cat); });
  const outgoing = totals.F + totals.K + totals.S;
  return `<div class="tile-grid">
    <div class="tile"><div class="tile-lbl">Einnahmen</div><div class="tile-val g">${fmtS(totals.E)}</div></div>
    <div class="tile"><div class="tile-lbl">Fixkosten</div><div class="tile-val">${fmtS(totals.F)}</div></div>
    <div class="tile"><div class="tile-lbl">Kredite</div><div class="tile-val r">${fmtS(totals.K)}</div></div>
    <div class="tile"><div class="tile-lbl">Sparen</div><div class="tile-val b">${fmtS(totals.S)}</div></div>
  </div>
  <div class="card"><div class="compact-row"><div class="compact-main"><div class="compact-title">Verfügbar nach festen Positionen</div><div class="compact-sub">Variable Ausgaben sind nicht enthalten</div></div><div class="compact-value ${totals.E - outgoing >= 0 ? 'e' : 'k'}">${fmtS(totals.E - outgoing)}</div></div></div>`;
}

vUebersicht = function vFixkosten() {
  const type = S.ui.fixedType || 'all';
  const group = S.ui.fixedGroup || 'all';
  const search = (S.ui.fixedSearch || '').trim().toLowerCase();
  const all = fixedCostCategories();
  const categories = all.filter(cat =>
    (type === 'all' || cat.t === type) &&
    (group === 'all' || cat.g === group) &&
    (!search || cat.p.toLowerCase().includes(search) || cat.g.toLowerCase().includes(search))
  );
  const monthOptions = MF.map((month, index) => `<option value="${index}"${index === S.month ? ' selected' : ''}>${month}</option>`).join('');
  const yearOptions = S.years.map(year => `<option value="${year}"${year === S.year ? ' selected' : ''}>${year}</option>`).join('');

  return `<div class="desktop-page-title">Fixkosten</div>
    <div class="card form-card">
      <div class="card-title">Zeitraum und Filter</div>
      <div class="form-grid two">
        <div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" onchange="selMonth(Number(this.value))">${monthOptions}</select></div></div>
        <div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" onchange="selYear(Number(this.value))">${yearOptions}</select></div></div>
      </div>
      <div class="compact-toolbar">
        <input class="inp wide" placeholder="Position suchen" value="${esc(S.ui.fixedSearch || '')}" oninput="S.ui.fixedSearch=this.value;render()"/>
        <div class="sw"><select class="sel" onchange="S.ui.fixedType=this.value;render()">${fixedCostTypeOptions(type)}</select></div>
        <div class="sw"><select class="sel" onchange="S.ui.fixedGroup=this.value;render()">${fixedCostGroups(group)}</select></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="openRecurringRule('')">Zahlungsrhythmus</button>
        <button class="btn btn-primary" onclick="addFixedCategory()">Position hinzufügen</button>
      </div>
    </div>
    ${fixedCostSummary(all)}
    <div class="card list-card">
      <div class="list-head"><div class="card-title" style="margin:0">Feste Positionen</div><span style="font-size:11px;color:var(--t3)">${categories.length} Einträge</span></div>
      <div class="list-body">${fixedCostRows(categories) || '<div class="empty-state">Keine passenden Positionen.</div>'}</div>
    </div>
    ${window.renderAutomationSummary ? window.renderAutomationSummary() : ''}
    <div class="card">
      <div class="card-title">Verwaltung</div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="openAddYear()">Jahr hinzufügen</button><button class="btn btn-ghost" onclick="openFixedDataActions()">Daten verwalten</button></div>
    </div>`;
};

vEinstellungen = vUebersicht;

function addFixedCategory() {
  addCat();
  requestAnimationFrame(() => {
    const type = document.getElementById('ct');
    if (!type) return;
    [...type.options].forEach(option => {
      if (option.value === 'V') option.remove();
    });
    if (type.value === 'V') type.value = 'F';
  });
}

function openFixedDataActions() {
  openGenSheet(`<div class="sheet-title">Daten verwalten</div>
    <div class="field-hint" style="margin-bottom:14px">Diese Funktionen betreffen gespeicherte Planwerte und Buchungen.</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-ghost btn-full" onclick="resetData()">Planwerte zurücksetzen</button>
      <button class="btn btn-ghost btn-full" onclick="resetBuchungen()">Buchungen löschen</button>
      <button class="btn btn-red btn-full" onclick="resetAll()">App vollständig zurücksetzen</button>
    </div>`);
}
