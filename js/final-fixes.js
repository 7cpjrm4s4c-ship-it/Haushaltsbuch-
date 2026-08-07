/* Kategorien bearbeiten und verwalten. */
'use strict';

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
  if(typeof sortCategoriesInPlace==='function')sortCategoriesInPlace();
  persist();
  render();
  openVariableCategoryManager();
  toast('Kategorie gespeichert');
}

function deleteVariableCategory(id){
  const cat=S.cats.find(c=>c.id===id&&c.t==='V');
  if(!cat)return;
  const count=S.buchungen.filter(b=>b.catId===id).length;
  if(count)return toast('Kategorie enthält Buchungen und kann nicht gelöscht werden','err');
  if(!confirm(`„${cat.p}“ wirklich löschen?`))return;
  S.cats=S.cats.filter(c=>c.id!==id);
  if(typeof sortCategoriesInPlace==='function')sortCategoriesInPlace();
  persist();
  render();
  openVariableCategoryManager();
  toast('Kategorie gelöscht');
}

function openFixedCategoryDialog(oldName=''){
  openGenSheet(`<div class="sheet-title">${oldName?'Kategorie bearbeiten':'Kategorie hinzufügen'}</div><div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="fixed-cat-name" value="${esc(oldName)}" placeholder="z. B. Betreuung"/></div><div class="dialog-actions"><button class="btn btn-cancel" onclick="openFixedCategoryManager()">Abbrechen</button><button class="btn btn-primary" onclick="saveFixedCategory('${esc(oldName)}')">Speichern</button></div>`);
}

function saveFixedCategory(oldName){
  const name=document.getElementById('fixed-cat-name')?.value.trim();
  if(!name)return toast('Bezeichnung eingeben','err');
  if(fixedCategories().some(x=>x.toLowerCase()===name.toLowerCase()&&x!==oldName))return toast('Kategorie bereits vorhanden','err');
  if(oldName){
    S.cats.filter(c=>c.t!=='V'&&c.g===oldName).forEach(c=>c.g=name);
  }else{
    S.ui.pendingFixedCategory=name;
  }
  if(typeof sortCategoriesInPlace==='function')sortCategoriesInPlace();
  persist();
  render();
  openFixedCategoryManager();
  toast(oldName?'Kategorie gespeichert':'Kategorie steht bei neuer Position zur Auswahl');
}

function deleteFixedCategory(name){
  const count=fixedCostCategories().filter(c=>c.g===name).length;
  if(count)return toast('Kategorie enthält Positionen und kann nicht gelöscht werden','err');
  toast('Kategorie ist bereits leer');
}
