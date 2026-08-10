/* State-Grenze fuer Kredite. Keine DOM- oder UI-Abhaengigkeiten. */
'use strict';

(function(root){
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function save(){if(typeof root.persist==='function')root.persist();}
  function sortCategories(){root.DataManagementStore?.sortCategoriesInPlace?.();}
  function all(){return clone(Array.isArray(state().kredite)?state().kredite:[]);}
  function find(id){return clone((state().kredite||[]).find(loan=>loan.id===id)||null);}
  function add(values,makeId){
    const loan={id:makeId(),...clone(values)};
    state().kredite=Array.isArray(state().kredite)?state().kredite:[];
    state().kredite.push(loan);
    root.LoanCategoryStore?.sync?.(loan);
    sortCategories();save();return clone(loan);
  }
  function update(id,values){
    const loan=(state().kredite||[]).find(item=>item.id===id);if(!loan)return null;
    Object.assign(loan,clone(values));
    root.LoanCategoryStore?.sync?.(loan);
    sortCategories();save();return clone(loan);
  }
  function remove(id){
    const loan=(state().kredite||[]).find(item=>item.id===id);if(!loan)return null;
    state().kredite=(state().kredite||[]).filter(item=>item.id!==id);
    root.LoanCategoryStore?.remove?.(id);
    if(root.LoanLifecycle&&typeof root.LoanLifecycle.emitDeleted==='function')root.LoanLifecycle.emitDeleted({loanId:id,loan:clone(loan)});
    sortCategories();save();return clone(loan);
  }

  root.LoanStore=Object.freeze({all,find,add,update,remove});
})(typeof globalThis!=='undefined'?globalThis:window);
