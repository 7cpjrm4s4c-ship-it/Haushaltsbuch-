/* Gemeinsame Filterhilfen für den Bereich Fixkosten. */
'use strict';

VIEW_TITLES.uebersicht = 'Fixkosten';
VIEW_TITLES.einstellungen = 'Fixkosten';

S.ui = S.ui || {};
S.ui.fixedType = S.ui.fixedType || 'all';
S.ui.fixedGroup = S.ui.fixedGroup || 'all';
S.ui.fixedSearch = S.ui.fixedSearch || '';

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
  const groups = [...new Set(fixedCostCategories().map(cat => cat.g))].sort((a,b)=>a.localeCompare(b,'de'));
  return `<option value="all">Alle Kategorien</option>` + groups.map(group =>
    `<option value="${esc(group)}"${group === selected ? ' selected' : ''}>${esc(group)}</option>`
  ).join('');
}
