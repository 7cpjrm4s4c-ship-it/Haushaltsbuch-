/* Zentrale Lade- und Speicherlogik. */
'use strict';

(function(){
  const CORRUPT_BACKUP_KEY=`${LS_KEY}_corrupt_backup`;

  function normalizeState(raw){
    if(typeof StateSchema!=='undefined')return StateSchema.normalize(raw,{defaultYears});
    const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    return {
      schemaVersion:3,
      data:source.data&&typeof source.data==='object'&&!Array.isArray(source.data)?source.data:{},
      cats:Array.isArray(source.cats)?source.cats:[],kredite:Array.isArray(source.kredite)?source.kredite:[],
      years:Array.isArray(source.years)&&source.years.length?source.years:defaultYears(),buchungen:Array.isArray(source.buchungen)?source.buchungen:[],
      budgets:source.budgets&&typeof source.budgets==='object'&&!Array.isArray(source.budgets)?source.budgets:{},
      recurringRules:Array.isArray(source.recurringRules)?source.recurringRules:[],annualAdjustments:Array.isArray(source.annualAdjustments)?source.annualAdjustments:[],
      percentageAdjustments:Array.isArray(source.percentageAdjustments)?source.percentageAdjustments:[],amountAdjustments:Array.isArray(source.amountAdjustments)?source.amountAdjustments:[],
      oneTimeEntries:Array.isArray(source.oneTimeEntries)?source.oneTimeEntries:[],forecastAssets:source.forecastAssets&&typeof source.forecastAssets==='object'&&!Array.isArray(source.forecastAssets)?source.forecastAssets:{},
      forecastAssumptions:source.forecastAssumptions&&typeof source.forecastAssumptions==='object'&&!Array.isArray(source.forecastAssumptions)?source.forecastAssumptions:{},
    };
  }

  function statePayload(){
    return normalizeState({data:S.data,cats:S.cats,kredite:S.kredite,years:S.years,buchungen:S.buchungen,budgets:S.budgets,
      recurringRules:S.recurringRules,annualAdjustments:S.annualAdjustments,percentageAdjustments:S.percentageAdjustments,
      amountAdjustments:S.amountAdjustments,oneTimeEntries:S.oneTimeEntries,forecastAssets:S.forecastAssets,forecastAssumptions:S.forecastAssumptions});
  }

  function saveStateNow(){try{localStorage.setItem(LS_KEY,JSON.stringify(statePayload()));}catch(e){console.warn('persist failed',e);}}

  persist=function persistState(){
    if(typeof globalThis.onStatePersistRequested==='function'){try{globalThis.onStatePersistRequested();}catch(e){console.warn('persist hook failed',e);}}
    clearTimeout(_pTimer);_pTimer=setTimeout(saveStateNow,300);
  };

  load=function loadState(){
    let saved=null;const raw=localStorage.getItem(LS_KEY);
    if(raw){try{saved=normalizeState(JSON.parse(raw));}catch(e){console.warn('load failed',e);try{localStorage.setItem(CORRUPT_BACKUP_KEY,raw);}catch(_){}}}
    if(!saved)applyFactoryState();
    else{
      S.data=saved.data;S.cats=saved.cats;S.kredite=saved.kredite;S.years=saved.years;S.buchungen=saved.buchungen;S.budgets=saved.budgets;
      S.recurringRules=saved.recurringRules;S.annualAdjustments=saved.annualAdjustments;S.percentageAdjustments=saved.percentageAdjustments;
      S.amountAdjustments=saved.amountAdjustments;S.oneTimeEntries=saved.oneTimeEntries;S.forecastAssets=saved.forecastAssets;S.forecastAssumptions=saved.forecastAssumptions;
      normalizeVariableCategories();
    }
    S.kredite=(S.kredite||[]).map(k=>({...k,s:creditStartAmount(k),balanceYear:creditReferenceYear(k),balanceMonth:creditReferenceMonth(k)}));
    if(typeof syncAllLoans==='function')syncAllLoans();if(typeof sortCategoriesInPlace==='function')sortCategoriesInPlace();
    if(!Array.isArray(S.years)||!S.years.length)S.years=defaultYears();if(!S.years.includes(S.year))S.year=S.years[0]||now.getFullYear();
    saveStateNow();
  };
})();
