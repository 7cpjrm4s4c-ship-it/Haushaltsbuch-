/* Gemeinsame Eingabehilfen und mobile Bedienung. */
'use strict';

const INTERVALS=[[1,'Monatlich'],[3,'Vierteljährlich'],[4,'Dritteljährlich'],[6,'Halbjährlich'],[12,'Jährlich']];
function variableCategoryOptions(selected=''){
  return CategoryStore.variable().map(cat=>`<option value="${esc(cat.id)}"${cat.id===selected?' selected':''}>${esc(cat.p)}</option>`).join('');
}
function clearExpenseForm(){['quick-amount','quick-name','quick-cat'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});ManagerUiState.resetExpense();}
function findRecurringRule(catId){return PositionStore.recurringRule(catId);}
function applyFixedSearch(){ManagerUiState.setFixedSearch(document.getElementById('fixed-search')?.value||'');render();}
(function enableSwipeClose(){
  let startY=0,currentSheet=null;
  document.addEventListener('touchstart',event=>{const sheet=event.target.closest('.sheet');if(!sheet)return;startY=event.touches[0].clientY;currentSheet=sheet;},{passive:true});
  document.addEventListener('touchend',event=>{if(!currentSheet)return;const dy=event.changedTouches[0].clientY-startY;if(dy>90)currentSheet.closest('.overlay')?.classList.remove('open');currentSheet=null;},{passive:true});
})();
