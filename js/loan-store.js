/**
 * State- und Persistenzgrenze für Kredite.
 * @module LoanStore
 */
'use strict';

(function(root){
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function save(){if(typeof root.persist==='function')root.persist();}
  function sortCategories(){root.DataManagementStore?.sortCategoriesInPlace?.();}
  /** @returns {Array<Object>} Defensive Kopie aller Kredite. */
  function all(){return clone(Array.isArray(state().kredite)?state().kredite:[]);}
  /** @param {string} id Kredit-ID. @returns {Object|null} Defensive Kopie des Kredits. */
  function find(id){return clone((state().kredite||[]).find(loan=>loan.id===id)||null);}
  /**
   * Legt einen Kredit an, synchronisiert dessen Kategorie und persistiert den Zustand.
   * @param {Object} values Kreditdaten ohne ID.
   * @param {Function} makeId ID-Generator.
   * @returns {Object} Neu angelegter Kredit als defensive Kopie.
   */
  function add(values,makeId){const loan={id:makeId(),...clone(values)};root.CreditMovementStore?.validateLoan?.(loan);state().kredite=Array.isArray(state().kredite)?state().kredite:[];state().kredite.push(loan);root.LoanCategoryStore?.sync?.(loan);sortCategories();save();return clone(loan);}
  /** @param {string} id Kredit-ID. @param {Object} values Aktualisierte Felder. @returns {Object|null} Aktualisierter Kredit. */
  function update(id,values){const loan=(state().kredite||[]).find(item=>item.id===id);if(!loan)return null;const next={...loan,...clone(values)};root.CreditMovementStore?.validateLoan?.(next);Object.assign(loan,next);root.LoanCategoryStore?.sync?.(loan);sortCategories();save();return clone(loan);}
  /**
   * Entfernt einen Kredit, bereinigt die verknüpfte Kategorie und emittiert das Lifecycle-Ereignis.
   * @param {string} id Kredit-ID.
   * @returns {Object|null} Gelöschter Kredit oder `null`.
   */
  function remove(id){const loan=(state().kredite||[]).find(item=>item.id===id);if(!loan)return null;state().kredite=(state().kredite||[]).filter(item=>item.id!==id);root.LoanCategoryStore?.remove?.(id);if(root.LoanLifecycle&&typeof root.LoanLifecycle.emitDeleted==='function')root.LoanLifecycle.emitDeleted({loanId:id,loan:clone(loan)});sortCategories();save();return clone(loan);}
  root.LoanStore=Object.freeze({all,find,add,update,remove});
})(typeof globalThis!=='undefined'?globalThis:window);
