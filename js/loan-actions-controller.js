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
    const loan=root.LoanStore.update(id,values);if(!loan)return;
    root.closeGenSheet();root.render();root.toast(`${root.esc(loan.n)} gespeichert`);
  }
  function remove(id){
    const current=root.LoanStore.find(id);if(!current)return;
    if(!confirm(`"${current.n}" wirklich löschen?`))return;
    const loan=root.LoanStore.remove(id);if(!loan)return;
    root.closeGenSheet();root.render();root.toast(`${root.esc(loan.n)} gelöscht`);
  }
  root.LoanActionsController=Object.freeze({create,update,remove});
})(typeof globalThis!=='undefined'?globalThis:window);
