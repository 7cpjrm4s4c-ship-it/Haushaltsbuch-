/* State-Grenze fuer die Synchronisierung von Krediten und Kreditkategorien. Keine DOM-Abhaengigkeiten. */
'use strict';

(function(root){
  const SOURCE='loan';
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function normalizeName(value){return String(value||'').toLowerCase().replace(/[^a-z0-9äöüß]+/g,' ').trim();}
  function makeId(){return typeof root.uid==='function'?root.uid():'x'+Math.random().toString(36).slice(2,9);}
  function findLinked(loan){const s=state();return (s.cats||[]).find(cat=>cat.loanId===loan.id)||(s.cats||[]).find(cat=>cat.t==='K'&&normalizeName(cat.p)===normalizeName(loan.n));}
  function sync(loan){
    if(loan?.type==='revolving'){remove(loan.id);return null;}
    const s=state();let cat=findLinked(loan);
    if(!cat){cat={id:makeId(),g:'Kredite',p:loan.n,d:Number(loan.m)||0,t:'K',loanId:loan.id,source:SOURCE};s.cats.push(cat);}
    else Object.assign(cat,{g:'Kredite',p:loan.n,d:Number(loan.m)||0,t:'K',loanId:loan.id,source:SOURCE});
    return cat;
  }
  function syncAll(){const s=state(),activeIds=new Set((s.kredite||[]).map(loan=>loan.id));(s.kredite||[]).forEach(sync);s.cats=(s.cats||[]).filter(cat=>cat.source!==SOURCE||activeIds.has(cat.loanId));}
  function remove(loanId){
    const s=state(),removedIds=new Set((s.cats||[]).filter(cat=>cat.loanId===loanId).map(cat=>cat.id));
    s.cats=(s.cats||[]).filter(cat=>cat.loanId!==loanId);
    if(removedIds.size){for(const listName of ['recurringRules','annualAdjustments','percentageAdjustments','amountAdjustments','oneTimeEntries'])s[listName]=(s[listName]||[]).filter(item=>!removedIds.has(item.catId));}
  }
  root.LoanCategoryStore=Object.freeze({sync,syncAll,remove});
})(typeof globalThis!=='undefined'?globalThis:window);
