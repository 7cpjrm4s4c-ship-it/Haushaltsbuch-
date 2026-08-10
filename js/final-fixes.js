/* Kategorien bearbeiten und verwalten. */
'use strict';

function openVariableCategoryDialog(id=''){
  const cat=CategoryStore.find(id);
  openGenSheet(`<div class="sheet-title">${cat&&cat.t==='V'?'Kategorie bearbeiten':'Kategorie hinzufügen'}</div><div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="var-cat-name" value="${esc(cat?.p||'')}" placeholder="z. B. Haustiere"/></div><div class="dialog-actions"><button class="btn btn-cancel" onclick="openVariableCategoryManager()">Abbrechen</button><button class="btn btn-primary" onclick="saveVariableCategory('${esc(id)}')">Speichern</button></div>`);
}

function saveVariableCategory(id){
  const name=document.getElementById('var-cat-name')?.value.trim();
  if(!name)return toast('Bezeichnung eingeben','err');
  const result=CategoryStore.saveVariable(id,name,uid);
  if(!result.ok&&result.reason==='duplicate')return toast('Kategorie bereits vorhanden','err');
  render();
  openVariableCategoryManager();
  toast('Kategorie gespeichert');
}

function deleteVariableCategory(id){
  const cat=CategoryStore.find(id);if(!cat||cat.t!=='V')return;
  const count=CategoryStore.bookingCount(id);
  if(count)return toast('Kategorie enthält Buchungen und kann nicht gelöscht werden','err');
  if(!confirm(`„${cat.p}“ wirklich löschen?`))return;
  const result=CategoryStore.removeVariable(id);if(!result.ok)return;
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
  const result=CategoryStore.renameFixedGroup(oldName,name);
  if(!result.ok&&result.reason==='duplicate')return toast('Kategorie bereits vorhanden','err');
  render();
  openFixedCategoryManager();
  toast(oldName?'Kategorie gespeichert':'Kategorie steht bei neuer Position zur Auswahl');
}

function deleteFixedCategory(name){
  const count=CategoryStore.fixedGroupCount(name);
  if(count)return toast('Kategorie enthält Positionen und kann nicht gelöscht werden','err');
  toast('Kategorie ist bereits leer');
}
