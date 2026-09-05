/**
 * State-, Persistenz- und Metadatengrenze für Datensicherungen.
 * @module BackupStore
 */
'use strict';

(function(root){
  const META_KEY='hp5_backup_meta';
  let dirty=false;
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  /** @returns {Object} Persistierte Backup-Metadaten oder ein leeres Objekt. */
  function readMeta(){try{return JSON.parse(localStorage.getItem(META_KEY)||'{}');}catch(_){return {};}}
  function writeMeta(patch){const next={...readMeta(),...patch};localStorage.setItem(META_KEY,JSON.stringify(next));return next;}
  /** @returns {boolean} Ob automatische Backup-Hinweise aktiviert sind. */
  function isReminderEnabled(){return readMeta().reminderEnabled!==false;}
  /** @param {boolean} enabled Gewünschter Erinnerungsstatus. @returns {boolean} Persistierter Status. */
  function setReminderEnabled(enabled){const value=enabled!==false;writeMeta({reminderEnabled:value});return value;}
  /** Markiert den Zustand als seit dem letzten Backup verändert. @returns {void} */
  function markDirty(){dirty=true;const meta=readMeta();writeMeta({changesSinceBackup:Number(meta.changesSinceBackup||0)+1});}
  function isDirty(){return dirty;}
  /** @param {*} value Backup-Rohdaten. @returns {Object} Normalisierte App-Daten. */
  function normalize(value){if(typeof root.StateSchema!=='undefined')return root.StateSchema.normalize(value,{defaultYears:root.defaultYears});const d=value&&typeof value==='object'&&!Array.isArray(value)?value:{};return {data:d.data||{},cats:Array.isArray(d.cats)?d.cats:[],kredite:Array.isArray(d.kredite)?d.kredite:[],creditMovements:Array.isArray(d.creditMovements)?d.creditMovements:[],years:Array.isArray(d.years)&&d.years.length?d.years:root.defaultYears(),buchungen:Array.isArray(d.buchungen)?d.buchungen:[],budgets:d.budgets||{},recurringRules:Array.isArray(d.recurringRules)?d.recurringRules:[],annualAdjustments:Array.isArray(d.annualAdjustments)?d.annualAdjustments:[],percentageAdjustments:Array.isArray(d.percentageAdjustments)?d.percentageAdjustments:[],amountAdjustments:Array.isArray(d.amountAdjustments)?d.amountAdjustments:[],oneTimeEntries:Array.isArray(d.oneTimeEntries)?d.oneTimeEntries:[],accountBalances:d.accountBalances&&typeof d.accountBalances==='object'&&!Array.isArray(d.accountBalances)?d.accountBalances:{},savingsAccounts:Array.isArray(d.savingsAccounts)?d.savingsAccounts:[],savingsTransfers:Array.isArray(d.savingsTransfers)?d.savingsTransfers:[],forecastAssets:d.forecastAssets||{},forecastAssumptions:d.forecastAssumptions||{},forecastAccounts:Array.isArray(d.forecastAccounts)?d.forecastAccounts:[],financialEvents:Array.isArray(d.financialEvents)?d.financialEvents:[],forecastScenarios:Array.isArray(d.forecastScenarios)?d.forecastScenarios:[],forecastGoals:Array.isArray(d.forecastGoals)?d.forecastGoals:[]};}
  /** @returns {Object} Vollständiges, versioniertes Backup-Payload. */
  function snapshot(){const s=state();return {format:'haushaltsbuch-backup',version:13,schemaVersion:typeof root.StateSchema!=='undefined'?root.StateSchema.CURRENT_VERSION:12,createdAt:new Date().toISOString(),appData:{data:s.data,cats:s.cats,kredite:s.kredite,creditMovements:s.creditMovements||[],years:s.years,buchungen:s.buchungen,budgets:s.budgets,recurringRules:s.recurringRules||[],annualAdjustments:s.annualAdjustments||[],percentageAdjustments:s.percentageAdjustments||[],amountAdjustments:s.amountAdjustments||[],oneTimeEntries:s.oneTimeEntries||[],accountBalances:s.accountBalances||{},savingsAccounts:s.savingsAccounts||[],savingsTransfers:s.savingsTransfers||[],forecastAssets:s.forecastAssets||{},forecastAssumptions:s.forecastAssumptions||{},forecastAccounts:s.forecastAccounts||[],financialEvents:s.financialEvents||[],forecastScenarios:s.forecastScenarios||[],forecastGoals:s.forecastGoals||[]}};}
  function valid(payload){const raw=payload?.appData||payload;if(!raw||typeof raw!=='object'||!Array.isArray(raw.cats)||!Array.isArray(raw.kredite))return false;try{const d=normalize(raw);root.CreditMovementStore?.validateDataset?.(d.kredite,d.creditMovements);return true;}catch(_){return false;}}
  function mergeById(local,incoming){const map=new Map((local||[]).map(item=>[item.id,item]));(incoming||[]).forEach(item=>map.set(item.id,{...(map.get(item.id)||{}),...item}));return [...map.values()];}
  /**
   * Übernimmt Backup-Daten in den aktiven App-State und persistiert das Ergebnis.
   * @param {Object} payload Backup-Payload oder dessen `appData`.
   * @param {'replace'|'merge'} mode Ersetzen oder ID-basiertes Zusammenführen.
   * @returns {'replace'|'merge'} Tatsächlich angewendeter Modus.
   */
  function apply(payload,mode){
    const s=state(),d=normalize(payload?.appData||payload);root.CreditMovementStore?.validateDataset?.(d.kredite,d.creditMovements);
    let mergedCredit=null;
    if(mode!=='replace'){
      const loans=mergeById(s.kredite,d.kredite),creditMovements=mergeById(s.creditMovements,d.creditMovements);
      mergedCredit=typeof root.StateSchema!=='undefined'?root.StateSchema.normalize({kredite:loans,creditMovements},{defaultYears:root.defaultYears}):{kredite:loans,creditMovements};
      root.CreditMovementStore?.validateDataset?.(mergedCredit.kredite,mergedCredit.creditMovements);
    }
    if(mode==='replace')Object.assign(s,{data:d.data,cats:d.cats,kredite:d.kredite,creditMovements:d.creditMovements,years:d.years,buchungen:d.buchungen,budgets:d.budgets,recurringRules:d.recurringRules,annualAdjustments:d.annualAdjustments,percentageAdjustments:d.percentageAdjustments,amountAdjustments:d.amountAdjustments,oneTimeEntries:d.oneTimeEntries,accountBalances:d.accountBalances,savingsAccounts:d.savingsAccounts,savingsTransfers:d.savingsTransfers,forecastAssets:d.forecastAssets,forecastAssumptions:d.forecastAssumptions,forecastAccounts:d.forecastAccounts,financialEvents:d.financialEvents,forecastScenarios:d.forecastScenarios,forecastGoals:d.forecastGoals});
    else{
      s.data={...(s.data||{}),...(d.data||{})};s.cats=mergeById(s.cats,d.cats);s.kredite=mergedCredit.kredite;s.creditMovements=mergedCredit.creditMovements;s.years=[...new Set([...(s.years||[]),...(d.years||[])])].sort((a,b)=>a-b);s.buchungen=mergeById(s.buchungen,d.buchungen);s.budgets={...(s.budgets||{}),...(d.budgets||{})};s.recurringRules=mergeById(s.recurringRules,d.recurringRules);s.annualAdjustments=mergeById(s.annualAdjustments,d.annualAdjustments);s.percentageAdjustments=mergeById(s.percentageAdjustments,d.percentageAdjustments);s.amountAdjustments=mergeById(s.amountAdjustments,d.amountAdjustments);s.oneTimeEntries=mergeById(s.oneTimeEntries,d.oneTimeEntries);s.accountBalances={...(s.accountBalances||{}),...(d.accountBalances||{})};s.savingsAccounts=mergeById(s.savingsAccounts,d.savingsAccounts);s.savingsTransfers=mergeById(s.savingsTransfers,d.savingsTransfers);s.forecastAssets={...(s.forecastAssets||{}),...(d.forecastAssets||{})};s.forecastAssumptions={...(s.forecastAssumptions||{}),...(d.forecastAssumptions||{}),annualReturns:{...(s.forecastAssumptions?.annualReturns||{}),...(d.forecastAssumptions?.annualReturns||{})}};s.forecastAccounts=mergeById(s.forecastAccounts,d.forecastAccounts);s.financialEvents=mergeById(s.financialEvents,d.financialEvents);s.forecastScenarios=mergeById(s.forecastScenarios,d.forecastScenarios);s.forecastGoals=mergeById(s.forecastGoals,d.forecastGoals);
      if(typeof root.StateSchema!=='undefined'){const normalized=root.StateSchema.normalize({kredite:s.kredite,creditMovements:s.creditMovements,buchungen:s.buchungen,accountBalances:s.accountBalances,savingsAccounts:s.savingsAccounts,savingsTransfers:s.savingsTransfers,forecastAssets:s.forecastAssets,forecastAssumptions:s.forecastAssumptions,forecastAccounts:s.forecastAccounts,financialEvents:s.financialEvents,forecastScenarios:s.forecastScenarios,forecastGoals:s.forecastGoals,years:s.years},{defaultYears:root.defaultYears});s.kredite=normalized.kredite;s.creditMovements=normalized.creditMovements;s.buchungen=normalized.buchungen;s.accountBalances=normalized.accountBalances;s.savingsAccounts=normalized.savingsAccounts;s.savingsTransfers=normalized.savingsTransfers;s.forecastAssets=normalized.forecastAssets;s.forecastAssumptions=normalized.forecastAssumptions;s.forecastAccounts=normalized.forecastAccounts;s.financialEvents=normalized.financialEvents;s.forecastScenarios=normalized.forecastScenarios;s.forecastGoals=normalized.forecastGoals;}
    }
    root.LoanCategoryStore?.syncAll?.();root.DataManagementStore?.sortCategoriesInPlace?.();root.persist?.();dirty=false;writeMeta({lastImportAt:new Date().toISOString(),changesSinceBackup:0});return mode==='replace'?'replace':'merge';
  }
  function markBackedUp(createdAt){dirty=false;writeMeta({lastBackupAt:createdAt,changesSinceBackup:0});}
  root.BackupStore=Object.freeze({readMeta,isReminderEnabled,setReminderEnabled,markDirty,isDirty,normalize,snapshot,valid,apply,markBackedUp});
})(typeof globalThis!=='undefined'?globalThis:window);
