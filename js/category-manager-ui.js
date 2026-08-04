/* Visuelle Kategorieverwaltung im Stil der App. */
'use strict';

(function(){
  const iconMap={
    Freizeit:'◎',Auto:'▣',Kinder:'◉',Lebensmittel:'▤',Drogerie:'⌂',Urlaub:'⌁',Kleidung:'◇',Online:'@'
  };
  function iconFor(name){return iconMap[name]||'•';}

  openVariableCategoryManager=function(){
    const rows=variableCategories().map(cat=>{
      const count=S.buchungen.filter(b=>b.catId===cat.id).length;
      return `<div class="category-manager-row">
        <div class="category-manager-icon">${iconFor(cat.p)}</div>
        <div class="category-manager-info"><div class="category-manager-name">${esc(cat.p)}</div><div class="category-manager-meta">${count} Buchung${count===1?'':'en'}</div></div>
        <div class="category-manager-actions">
          <button class="category-manager-action" aria-label="Kategorie bearbeiten" onclick="openVariableCategoryDialog('${esc(cat.id)}')">✎</button>
          <button class="category-manager-action danger" aria-label="Kategorie löschen" onclick="deleteVariableCategory('${esc(cat.id)}')">×</button>
        </div>
      </div>`;
    }).join('');
    openGenSheet(`<div class="category-manager-head"><div class="sheet-title">Kategorien verwalten</div><button class="btn btn-ghost" onclick="openVariableCategoryDialog('')">+ Hinzufügen</button></div>
      <div class="category-manager-intro">Variable Ausgabenkategorien bearbeiten, umbenennen oder löschen.</div>
      <div class="category-manager-list">${rows||'<div class="empty-state">Keine Kategorien vorhanden.</div>'}</div>
      <button class="btn btn-cancel btn-full" onclick="closeGenSheet()">Schließen</button>`);
  };

  openFixedCategoryManager=function(){
    const names=fixedCategories();
    const rows=names.map(name=>{
      const count=fixedCostCategories().filter(c=>c.g===name).length;
      return `<div class="category-manager-row">
        <div class="category-manager-icon">${iconFor(name)}</div>
        <div class="category-manager-info"><div class="category-manager-name">${esc(name)}</div><div class="category-manager-meta">${count} Position${count===1?'':'en'}</div></div>
        <div class="category-manager-actions">
          <button class="category-manager-action" aria-label="Kategorie bearbeiten" onclick="openFixedCategoryDialog('${esc(name)}')">✎</button>
          <button class="category-manager-action danger" aria-label="Kategorie löschen" onclick="deleteFixedCategory('${esc(name)}')">×</button>
        </div>
      </div>`;
    }).join('');
    openGenSheet(`<div class="category-manager-head"><div class="sheet-title">Kategorien verwalten</div><button class="btn btn-ghost" onclick="openFixedCategoryDialog('')">+ Hinzufügen</button></div>
      <div class="category-manager-intro">Kategorien für Einnahmen und feste Positionen verwalten.</div>
      <div class="category-manager-list">${rows||'<div class="empty-state">Keine Kategorien vorhanden.</div>'}</div>
      <button class="btn btn-cancel btn-full" onclick="closeGenSheet()">Schließen</button>`);
  };
})();
