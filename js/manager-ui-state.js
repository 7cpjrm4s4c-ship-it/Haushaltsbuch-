/* Lokaler UI-Zustand für Ausgaben- und Fixkostenverwaltung. Keine App-State- oder DOM-Abhängigkeiten. */
'use strict';

(function(root){
  const state={fixedType:'all',fixedGroup:'all',fixedSearch:'',expenseCategoryId:''};
  function snapshot(){return {...state};}
  function setFixedType(value){state.fixedType=String(value||'all');return state.fixedType;}
  function setFixedGroup(value){state.fixedGroup=String(value||'all');return state.fixedGroup;}
  function setFixedSearch(value){state.fixedSearch=String(value||'');return state.fixedSearch;}
  function setExpenseCategory(value){state.expenseCategoryId=String(value||'');return state.expenseCategoryId;}
  function resetExpense(){state.expenseCategoryId='';}
  root.ManagerUiState=Object.freeze({snapshot,setFixedType,setFixedGroup,setFixedSearch,setExpenseCategory,resetExpense});
})(typeof globalThis!=='undefined'?globalThis:window);
