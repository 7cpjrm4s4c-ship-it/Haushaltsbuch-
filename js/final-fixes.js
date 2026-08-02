/* Korrekturen für kompakte Verwaltung, Kategorien und mehrjährige Planung. */
'use strict';

// Kompakte Ansicht verwendete veraltete Funktionsnamen.
function editBooking(id){ openBookingDialog(id); }
function deleteFixedCost(id){ deleteFixedPosition(id); }

function categoryLabel(){ return 'Kategorie'; }

function variableCategories(){ return S.cats.filter(cat=>cat.t==='V'); }
function fixedCategories(){ return [...new Set(fixedCostCategories().map(cat=>cat.g))].sort((a,b)=>a.localeCompare(b,'de')); }

function openVariableCategoryManager(){
  const rows=variableCategories().map(cat=>{
    const count=S.buchungen.filter(b=>b.catId===cat.id).length;
    return `<div class="category-manager-row"><div><div class="category-manager-name">${esc(cat.p)}</div><div class="category-manager-meta">${count} Buchung${count===1?'':'en'}</div></div><div class="category-manager-actions"><button class="row-edit-btn" onclick="openVariableCategoryDialog('${esc(cat.id)}')">✎</button><button class="row-edit-btn btn-danger-ghost" onclick="deleteVariableCategory('${esc(cat.id)}')">×</button></div></div>`;
  }).join('');
  openGenSheet(`<div class="sheet-title">Kategorien verwalten</div><div class="category-manager-list">${rows||'<div class="empty-state">Keine Kategorien vorhanden.</div>'}</div><button class="btn btn-primary btn-full mt16" onclick="openVariableCategoryDialog('')">Kategorie hinzufügen</button><button class="btn btn-cancel btn-full mt8" onclick="closeGenSheet()">Schließen</button>`);
}

function openVariableCategoryDialog(id=''){
  const cat=S.cats.find(c=>c.id===id&&c.t==='V');
  openGenSheet(`<div class="sheet-title">${cat?'Kategorie bearbeiten':'Kategorie hinzufügen'}</div><div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="var-cat-name" value="${esc(cat?.p||'')}" placeholder="z. B. Haustiere"/></div><div class="dialog-actions"><button class="btn btn-cancel" onclick="openVariableCategoryManager()">Abbrechen</button><button class="btn btn-primary" onclick="saveVariableCategory('${esc(id)}')">Speichern</button></div>`);
}

function saveVariableCategory(id){
  const name=document.getElementById('var-cat-name')?.value.trim();
  if(!name)return toast('Bezeichnung eingeben','err');
  const duplicate=variableCategories().find(c=>c.p.toLowerCase()===name.toLowerCase()&&c.id!==id);
  if(duplicate)return toast('Kategorie bereits vorhanden','err');
  const cat=S.cats.find(c=>c.id===id);
  if(cat)cat.p=name;
  else S.cats.push({id:uid(),g:'Variable Ausgaben',p:name,d:0,t:'V'});
  persist();render();openVariableCategoryManager();toast('Kategorie gespeichert');
}

function deleteVariableCategory(id){
  const cat=S.cats.find(c=>c.id===id&&c.t==='V');
  if(!cat)return;
  const count=S.buchungen.filter(b=>b.catId===id).length;
  if(count)return toast('Kategorie enthält Buchungen und kann nicht gelöscht werden','err');
  if(!confirm(`„${cat.p}“ wirklich löschen?`))return;
  S.cats=S.cats.filter(c=>c.id!==id);persist();render();openVariableCategoryManager();toast('Kategorie gelöscht');
}

function openFixedCategoryManager(){
  const names=fixedCategories();
  const rows=names.map(name=>{
    const count=fixedCostCategories().filter(c=>c.g===name).length;
    return `<div class="category-manager-row"><div><div class="category-manager-name">${esc(name)}</div><div class="category-manager-meta">${count} Position${count===1?'':'en'}</div></div><div class="category-manager-actions"><button class="row-edit-btn" onclick="openFixedCategoryDialog('${esc(name)}')">✎</button><button class="row-edit-btn btn-danger-ghost" onclick="deleteFixedCategory('${esc(name)}')">×</button></div></div>`;
  }).join('');
  openGenSheet(`<div class="sheet-title">Kategorien verwalten</div><div class="category-manager-list">${rows||'<div class="empty-state">Keine Kategorien vorhanden.</div>'}</div><button class="btn btn-primary btn-full mt16" onclick="openFixedCategoryDialog('')">Kategorie hinzufügen</button><button class="btn btn-cancel btn-full mt8" onclick="closeGenSheet()">Schließen</button>`);
}

function openFixedCategoryDialog(oldName=''){
  openGenSheet(`<div class="sheet-title">${oldName?'Kategorie bearbeiten':'Kategorie hinzufügen'}</div><div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="fixed-cat-name" value="${esc(oldName)}" placeholder="z. B. Betreuung"/></div><div class="dialog-actions"><button class="btn btn-cancel" onclick="openFixedCategoryManager()">Abbrechen</button><button class="btn btn-primary" onclick="saveFixedCategory('${esc(oldName)}')">Speichern</button></div>`);
}

function saveFixedCategory(oldName){
  const name=document.getElementById('fixed-cat-name')?.value.trim();
  if(!name)return toast('Bezeichnung eingeben','err');
  if(fixedCategories().some(x=>x.toLowerCase()===name.toLowerCase()&&x!==oldName))return toast('Kategorie bereits vorhanden','err');
  if(oldName){S.cats.filter(c=>c.t!=='V'&&c.g===oldName).forEach(c=>c.g=name);}
  else S.ui.pendingFixedCategory=name;
  persist();render();openFixedCategoryManager();toast(oldName?'Kategorie gespeichert':'Kategorie steht bei neuer Position zur Auswahl');
}

function deleteFixedCategory(name){
  const count=fixedCostCategories().filter(c=>c.g===name).length;
  if(count)return toast('Kategorie enthält Positionen und kann nicht gelöscht werden','err');
  toast('Kategorie ist bereits leer');
}

// Mehrjährige Steigerung: der Prozentwert wird ab Startmonat in jedem Folgejahr erneut angewendet.
const _gvAnnual=gv;
gv=function(y,m,cat){
  let value=_gvAnnual(y,m,cat);
  const adjustments=(S.percentageAdjustments||[]).filter(a=>a.catId===cat.id&&a.repeatAnnual);
  for(const adj of adjustments){
    const start=monthNo(adj.year,adj.month);
    const current=monthNo(y,m);
    if(current<start)continue;
    let repetitions=Number(y)-Number(adj.year);
    if(Number(m)<Number(adj.month))repetitions-=1;
    repetitions=Math.max(0,repetitions);
    if(repetitions>0)value*=Math.pow(1+Number(adj.percent||0)/100,repetitions);
  }
  return Math.round(value*100)/100;
};

const _openPositionDialogFinal=openPositionDialog;
openPositionDialog=function(catId=''){
  _openPositionDialogFinal(catId);
  const groupLabel=document.getElementById('pos-group')?.closest('.field')?.querySelector('.lbl');
  if(groupLabel)groupLabel.textContent='Kategorie';
  const incLabel=document.getElementById('pos-inc-month')?.closest('.field')?.querySelector('.lbl');
  if(incLabel)incLabel.textContent='Jährliche Erhöhung ab Monat';
  const yearLabel=document.getElementById('pos-inc-year')?.closest('.field')?.querySelector('.lbl');
  if(yearLabel)yearLabel.textContent='Startjahr der jährlichen Erhöhung';
  const percentField=document.getElementById('pos-inc-percent')?.closest('.field');
  if(percentField&&!document.getElementById('annual-repeat-note'))percentField.insertAdjacentHTML('afterend','<div id="annual-repeat-note" class="annual-note">Der Prozentwert wird ab dem gewählten Monat in jedem folgenden Jahr erneut angewendet.</div>');
  const select=document.getElementById('pos-group');
  if(select&&S.ui.pendingFixedCategory&&!Array.from(select.options).some(o=>o.value===S.ui.pendingFixedCategory)){
    select.insertAdjacentHTML('beforeend',`<option value="${esc(S.ui.pendingFixedCategory)}" selected>${esc(S.ui.pendingFixedCategory)}</option>`);
  }
};

const _savePositionDialogFinal=savePositionDialog;
savePositionDialog=function(catId){
  _savePositionDialogFinal(catId);
  const cat=S.cats.find(c=>c.p===document.getElementById('pos-name')?.value.trim()&&c.t===document.getElementById('pos-type')?.value);
  const id=catId||cat?.id;
  if(id){
    const adjustment=(S.percentageAdjustments||[]).find(a=>a.catId===id);
    if(adjustment)adjustment.repeatAnnual=true;
    persist();
  }
  S.ui.pendingFixedCategory='';
};

// Ergänzt die Verwaltungsbuttons und vereinheitlicht die Bezeichnung.
const _vAusgabenFinal=vAusgaben;
vAusgaben=function(){
  return _vAusgabenFinal().replace('<div class="dialog-actions">','<div class="category-tools"><button class="btn btn-ghost" type="button" onclick="openVariableCategoryManager()">Kategorien verwalten</button></div><div class="dialog-actions">');
};

const _vUebersichtFinal=vUebersicht;
vUebersicht=function(){
  return _vUebersichtFinal()
    .replace(/Alle Gruppen/g,'Alle Kategorien')
    .replace('Position hinzufügen</button>','Position hinzufügen</button><div class="category-tools"><button class="btn btn-ghost" type="button" onclick="openFixedCategoryManager()">Kategorien verwalten</button></div>');
};
vEinstellungen=vUebersicht;
