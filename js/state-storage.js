/* Zentrale Lade- und Speicherlogik. */
'use strict';

(function(root){
  const CORRUPT_BACKUP_KEY=`${LS_KEY}_corrupt_backup`;
  let persistTimer=null;

  function normalizeState(raw){
    if(typeof StateSchema!=='undefined'){const normalized=StateSchema.normalize(raw,{defaultYears});if(typeof CreditMovementStore!=='undefined')CreditMovementStore.validateDataset(normalized.kredite,normalized.creditMovements);return normalized;}
    const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    return {
      schemaVersion:12,data:source.data&&typeof source.data==='object'&&!Array.isArray(source.data)?source.data:{},
      cats:Array.isArray(source.cats)?source.cats:[],kredite:Array.isArray(source.kredite)?source.kredite:[],creditMovements:Array.isArray(source.creditMovements)?source.creditMovements:[],years:Array.isArray(source.years)&&source.years.length?source.years:defaultYears(),
      buchungen:Array.isArray(source.buchungen)?source.buchungen:[],budgets:source.budgets&&typeof source.budgets==='object'&&!Array.isArray(source.budgets)?source.budgets:{},
      recurringRules:Array.isArray(source.recurringRules)?source.recurringRules:[],annualAdjustments:Array.isArray(source.annualAdjustments)?source.annualAdjustments:[],percentageAdjustments:Array.isArray(source.percentageAdjustments)?source.percentageAdjustments:[],
      amountAdjustments:Array.isArray(source.amountAdjustments)?source.amountAdjustments:[],oneTimeEntries:Array.isArray(source.oneTimeEntries)?source.oneTimeEntries:[],accountBalances:source.accountBalances&&typeof source.accountBalances==='object'&&!Array.isArray(source.accountBalances)?source.accountBalances:{},savingsAccounts:Array.isArray(source.savingsAccounts)?source.savingsAccounts:[],savingsTransfers:Array.isArray(source.savingsTransfers)?source.savingsTransfers:[],
      forecastAssets:source.forecastAssets&&typeof source.forecastAssets==='object'&&!Array.isArray(source.forecastAssets)?source.forecastAssets:{},forecastAssumptions:source.forecastAssumptions&&typeof source.forecastAssumptions==='object'&&!Array.isArray(source.forecastAssumptions)?source.forecastAssumptions:{},forecastAccounts:Array.isArray(source.forecastAccounts)?source.forecastAccounts:[],
      financialEvents:Array.isArray(source.financialEvents)?source.financialEvents:[],forecastScenarios:Array.isArray(source.forecastScenarios)?source.forecastScenarios:[],forecastGoals:Array.isArray(source.forecastGoals)?source.forecastGoals:[],
    };
  }

  function statePayload(){return normalizeState({data:S.data,cats:S.cats,kredite:S.kredite,creditMovements:S.creditMovements,years:S.years,buchungen:S.buchungen,budgets:S.budgets,recurringRules:S.recurringRules,annualAdjustments:S.annualAdjustments,percentageAdjustments:S.percentageAdjustments,amountAdjustments:S.amountAdjustments,oneTimeEntries:S.oneTimeEntries,accountBalances:S.accountBalances,savingsAccounts:S.savingsAccounts,savingsTransfers:S.savingsTransfers,forecastAssets:S.forecastAssets,forecastAssumptions:S.forecastAssumptions,forecastAccounts:S.forecastAccounts,financialEvents:S.financialEvents,forecastScenarios:S.forecastScenarios,forecastGoals:S.forecastGoals});}
  function saveNow(){try{localStorage.setItem(LS_KEY,JSON.stringify(statePayload()));}catch(e){console.warn('persist failed',e);}}

  function save(){
    if(typeof root.onStatePersistRequested==='function'){try{root.onStatePersistRequested();}catch(e){console.warn('persist hook failed',e);}}
    clearTimeout(persistTimer);
    persistTimer=setTimeout(saveNow,300);
  }

  function load(){
    let saved=null;const raw=localStorage.getItem(LS_KEY);
    if(raw){try{saved=normalizeState(JSON.parse(raw));}catch(e){console.warn('load failed',e);try{localStorage.setItem(CORRUPT_BACKUP_KEY,raw);}catch(_){}}}
    if(!saved)root.DataManagementStore.applyFactoryState();
    else{
      S.data=saved.data;S.cats=saved.cats;S.kredite=saved.kredite;S.creditMovements=saved.creditMovements;S.years=saved.years;S.buchungen=saved.buchungen;S.budgets=saved.budgets;
      S.recurringRules=saved.recurringRules;S.annualAdjustments=saved.annualAdjustments;S.percentageAdjustments=saved.percentageAdjustments;S.amountAdjustments=saved.amountAdjustments;S.oneTimeEntries=saved.oneTimeEntries;S.accountBalances=saved.accountBalances;S.savingsAccounts=saved.savingsAccounts;S.savingsTransfers=saved.savingsTransfers;
      S.forecastAssets=saved.forecastAssets;S.forecastAssumptions=saved.forecastAssumptions;S.forecastAccounts=saved.forecastAccounts;S.financialEvents=saved.financialEvents;S.forecastScenarios=saved.forecastScenarios;S.forecastGoals=saved.forecastGoals;root.DataManagementStore.normalizeVariableCategories();
    }
    S.kredite=(S.kredite||[]).map(k=>({...k,s:creditStartAmount(k),balanceYear:creditReferenceYear(k),balanceMonth:creditReferenceMonth(k)}));
    root.LoanCategoryStore?.syncAll?.();root.DataManagementStore.sortCategoriesInPlace();
    if(!Array.isArray(S.years)||!S.years.length)S.years=defaultYears();if(!S.years.includes(S.year))S.year=S.years[0]||now.getFullYear();
    saveNow();
  }

  root.StateStorage=Object.freeze({normalizeState,statePayload,saveNow,save,load});
})(typeof globalThis!=='undefined'?globalThis:window);
