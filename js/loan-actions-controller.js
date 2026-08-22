/* UI-Controller fuer schreibende Kreditaktionen. Statezugriff ausschliesslich ueber LoanStore. */
'use strict';

(function(root){
  function create(){
    const values=root.CreditUi?.readForm?.();if(!values)return;
    const loan=root.LoanStore.add(values,root.uid);
    root.closeGenSheet();root.render();root.toast(`${root.esc(loan.n)} hinzugefügt`);
  }
  function update(id){
    const current=root.LoanStore.find(id);if(!current)return;
    const values=root.CreditUi?.readForm?.(current);if(!values)return;
    let loan;try{loan=root.LoanStore.update(id,values);}catch(error){root.toast(error.message,'err');return;}if(!loan)return;
    root.closeGenSheet();root.render();root.toast(`${root.esc(loan.n)} gespeichert`);
  }
  function remove(id){
    const current=root.LoanStore.find(id);if(!current)return;
    if(!confirm(`"${current.n}" wirklich löschen?`))return;
    const loan=root.LoanStore.remove(id);if(!loan)return;
    root.closeGenSheet();root.render();root.toast(`${root.esc(loan.n)} gelöscht`);
  }
  function createMovement(loanId,forcedType=''){try{root.CreditMovementStore.add(root.CreditUi.readMovement(loanId,forcedType),root.uid);root.closeGenSheet();root.render();root.toast('Kreditbewegung gebucht');}catch(error){root.toast(error.message,'err');}}
  function removeMovement(id){if(!confirm('Kreditbewegung wirklich löschen?'))return;try{if(root.CreditMovementStore.remove(id)){root.render();root.toast('Kreditbewegung gelöscht');}}catch(error){root.toast(error.message,'err');}}
  root.LoanActionsController=Object.freeze({create,update,remove,createMovement,removeMovement});
})(typeof globalThis!=='undefined'?globalThis:window);
