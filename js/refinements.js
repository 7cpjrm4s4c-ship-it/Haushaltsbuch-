/* Gemeinsame Eingabehilfen und mobile Bedienung. */
'use strict';

const INTERVALS=[[1,'Monatlich'],[3,'Vierteljährlich'],[4,'Dritteljährlich'],[6,'Halbjährlich'],[12,'Jährlich']];
function variableCategoryOptions(selected=''){
  return CategoryStore.variable().map(cat=>`<option value="${esc(cat.id)}"${cat.id===selected?' selected':''}>${esc(cat.p)}</option>`).join('');
}
function clearExpenseForm(){
  ['quick-amount','quick-name','quick-cat'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const direction=document.getElementById('quick-direction'),categoryArea=document.getElementById('quick-category-area'),name=document.getElementById('quick-name');
  if(direction)direction.value='expense';if(categoryArea)categoryArea.hidden=false;if(name)name.placeholder='z. B. REWE oder Freizeitpark';ManagerUiState.resetExpense();
}
function findRecurringRule(catId){return PositionStore.recurringRule(catId);}
function applyFixedSearch(){ManagerUiState.setFixedSearch(document.getElementById('fixed-search')?.value||'');render();}
