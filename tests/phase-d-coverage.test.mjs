import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const run=(source,context,name)=>{context.globalThis=context;context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:name});return context;};

const [registrySource,loanStoreSource,forecastStoreSource,dataStoreSource,backupStoreSource]=await Promise.all([
  read('js/app-extension-registry.js'),read('js/loan-store.js'),read('js/forecast-state-store.js'),read('js/data-management-store.js'),read('js/backup-store.js')
]);

// AppExtensionRegistry: Prioritaeten, Aufloesung und Fehlerpfade.
{
  const c=run(registrySource,{Map,Object,String,Number,Array,TypeError},'js/app-extension-registry.js');
  const low=()=>1,high=()=>2;
  assert.equal(c.AppExtensionRegistry.registerView('dashboard',low,10),'dashboard');
  c.AppExtensionRegistry.registerView('dashboard',high,20);
  assert.equal(c.AppExtensionRegistry.resolveView('dashboard'),high);
  assert.deepEqual(c.AppExtensionRegistry.listViews().map(x=>({key:x.key,priority:x.priority})),[{key:'dashboard',priority:20}]);
  assert.throws(()=>c.AppExtensionRegistry.registerView('',low),/Registry-Schlüssel/);
  assert.throws(()=>c.AppExtensionRegistry.registerCalculation('x',123),/Funktion/);
}

// LoanStore: CRUD, defensive Kopien, Persistenz und Lifecycle.
{
  const events=[];let persists=0,syncs=0,removes=0;
  const S={kredite:[],cats:[]};
  const c=run(loanStoreSource,{S,JSON,Object,Array,Error,persist:()=>persists++,DataManagementStore:{sortCategoriesInPlace(){}},LoanCategoryStore:{sync(){syncs++;},remove(){removes++;}},LoanLifecycle:{emitDeleted:e=>events.push(e)}},'js/loan-store.js');
  const added=c.LoanStore.add({n:'Test',s:1000},()=> 'k1');
  assert.equal(added.id,'k1');assert.equal(S.kredite.length,1);assert.equal(persists,1);assert.equal(syncs,1);
  added.n='Mutiert';assert.equal(S.kredite[0].n,'Test','LoanStore.add muss defensive Kopien liefern');
  const found=c.LoanStore.find('k1');found.s=1;assert.equal(S.kredite[0].s,1000,'LoanStore.find muss defensive Kopien liefern');
  assert.equal(c.LoanStore.update('missing',{n:'x'}),null);
  assert.equal(c.LoanStore.update('k1',{n:'Neu'}).n,'Neu');assert.equal(persists,2);
  const removed=c.LoanStore.remove('k1');assert.equal(removed.id,'k1');assert.equal(S.kredite.length,0);assert.equal(removes,1);assert.equal(events[0].loanId,'k1');assert.equal(persists,3);
  assert.equal(c.LoanStore.remove('missing'),null);
}

// ForecastStateStore: Lesen/Schreiben, defensive Kopien und fehlende Persistenzschnittstelle.
{
  const S={year:2026,month:4,kredite:[{id:'k1'}],financialEvents:[],forecastScenarios:[],forecastGoals:[],ui:{forecast:{scenarioKey:'realistic'}},forecastAssumptions:{a:1},forecastAssets:{cash:10}};let persists=0;
  const c=run(forecastStoreSource,{S,JSON,Array,Number,Error,persist:()=>persists++},'js/forecast-state-store.js');
  assert.equal(c.ForecastStateStore.year(),2026);assert.equal(c.ForecastStateStore.month(),4);
  const loans=c.ForecastStateStore.loans();loans[0].id='x';assert.equal(S.kredite[0].id,'k1');
  c.ForecastStateStore.setFinancialEvents([{id:'e1'}]);c.ForecastStateStore.setScenarios([{id:'s1'}]);c.ForecastStateStore.setGoals([{id:'g1'}]);
  assert.equal(S.financialEvents[0].id,'e1');assert.equal(S.forecastScenarios[0].id,'s1');assert.equal(S.forecastGoals[0].id,'g1');
  c.ForecastStateStore.setForecastUi({lookbackMonths:6});c.ForecastStateStore.setAssumptions({x:2});c.ForecastStateStore.setAssets({cash:20});c.ForecastStateStore.save();assert.equal(persists,1);
  const noPersist=run(forecastStoreSource,{S:{...S},JSON,Array,Number,Error},'js/forecast-state-store.js');
  assert.throws(()=>noPersist.ForecastStateStore.save(),/Persistenzschnittstelle/);
}

// DataManagementStore: Normalisierung, Reset und Persistenz-Seiteneffekte.
{
  let persists=0,syncAll=0,id=0;
  const S={cats:[{id:'v1',g:'Alt',p:'lebensmittel',d:50,t:'V'},{id:'f1',g:'Wohnen',p:'Strom',d:80,t:'F'}],buchungen:[{id:'b1'}],budgets:{x:1},kredite:[{id:'k1'}],years:[2025],data:{x:1},recurringRules:[1],annualAdjustments:[1],percentageAdjustments:[1],amountAdjustments:[1],oneTimeEntries:[1],financialEvents:[1],forecastScenarios:[1],forecastGoals:[1],forecastAssets:{cash:9},forecastAssumptions:{annualReturns:{},purchasingPowerInflation:9,savingsTarget:'cash'}};
  const c=run(dataStoreSource,{S,Object,Array,Set,Map,String,Math,Date,Number,uid:()=>`u${++id}`,persist:()=>persists++,defaultYears:()=>[2026,2027],now:new Date(2026,3,2),LoanCategoryStore:{syncAll:()=>syncAll++}},'js/data-management-store.js');
  c.DataManagementStore.normalizeVariableCategories();
  assert.equal(c.DataManagementStore.variableCategories().length>=10,true);assert.equal(c.DataManagementStore.variableCategories().find(x=>x.p==='Lebensmittel').id,'v1');
  c.DataManagementStore.clearBookings();assert.deepEqual(S.buchungen,[]);assert.deepEqual(S.budgets,{});assert.equal(persists,1);
  c.DataManagementStore.deleteAllEntries();assert.deepEqual(S.kredite,[]);assert.deepEqual(S.financialEvents,[]);assert.equal(S.forecastAssumptions.savingsTarget,'etf');assert.equal(persists,2);
  c.DataManagementStore.resetToFactory();assert.equal(S.years[0],2026);assert.equal(S.kredite.length,1);assert.equal(syncAll,1);assert.equal(persists,3);
}

// BackupStore: Metadaten, Snapshot, Validierung, Replace/Merge und Dirty-State.
{
  const storage=new Map();let persists=0,syncAll=0,sorts=0;
  const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v))};
  const S={data:{a:1},cats:[{id:'c1',p:'Alt'}],kredite:[{id:'k1',n:'Alt'}],years:[2026],buchungen:[{id:'b1'}],budgets:{},recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],forecastAssets:{cash:10},forecastAssumptions:{annualReturns:{},purchasingPowerInflation:2,savingsTarget:'etf'},financialEvents:[],forecastScenarios:[],forecastGoals:[]};
  const StateSchema={CURRENT_VERSION:6,normalize:v=>({...v,years:Array.isArray(v.years)&&v.years.length?v.years:[2026],cats:Array.isArray(v.cats)?v.cats:[],kredite:Array.isArray(v.kredite)?v.kredite:[],buchungen:Array.isArray(v.buchungen)?v.buchungen:[],budgets:v.budgets||{},recurringRules:v.recurringRules||[],annualAdjustments:v.annualAdjustments||[],percentageAdjustments:v.percentageAdjustments||[],amountAdjustments:v.amountAdjustments||[],oneTimeEntries:v.oneTimeEntries||[],forecastAssets:v.forecastAssets||{},forecastAssumptions:v.forecastAssumptions||{},financialEvents:v.financialEvents||[],forecastScenarios:v.forecastScenarios||[],forecastGoals:v.forecastGoals||[],data:v.data||{}})};
  const c=run(backupStoreSource,{S,Object,Array,Set,Map,String,Number,Date,JSON,localStorage,StateSchema,defaultYears:()=>[2026],persist:()=>persists++,LoanCategoryStore:{syncAll:()=>syncAll++},DataManagementStore:{sortCategoriesInPlace:()=>sorts++}},'js/backup-store.js');
  c.BackupStore.markDirty();assert.equal(c.BackupStore.isDirty(),true);assert.equal(c.BackupStore.readMeta().changesSinceBackup,1);
  const snapshot=c.BackupStore.snapshot();assert.equal(snapshot.format,'haushaltsbuch-backup');assert.equal(snapshot.appData.forecastAssets.cash,10);assert.equal(c.BackupStore.valid(snapshot),true);assert.equal(c.BackupStore.valid({foo:1}),false);
  c.BackupStore.apply({appData:{data:{b:2},cats:[{id:'c2'}],kredite:[],years:[2027],buchungen:[],budgets:{},recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],forecastAssets:{cash:20},forecastAssumptions:{},financialEvents:[],forecastScenarios:[],forecastGoals:[]}},'replace');
  assert.deepEqual(S.data,{b:2});assert.equal(S.forecastAssets.cash,20);assert.equal(persists,1);assert.equal(syncAll,1);assert.equal(sorts,1);assert.equal(c.BackupStore.isDirty(),false);
  c.BackupStore.apply({appData:{data:{c:3},cats:[{id:'c2',p:'Neu'},{id:'c3'}],kredite:[],years:[2028],buchungen:[],budgets:{},recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],forecastAssets:{etf:5},forecastAssumptions:{annualReturns:{etf:4}},financialEvents:[],forecastScenarios:[],forecastGoals:[]}},'merge');
  assert.equal(S.data.c,3);assert.deepEqual(S.years,[2027,2028]);assert.equal(S.cats.length,2);assert.equal(S.forecastAssets.etf,5);assert.equal(persists,2);
  c.BackupStore.markBackedUp('2026-08-11T00:00:00.000Z');assert.equal(c.BackupStore.readMeta().lastBackupAt,'2026-08-11T00:00:00.000Z');assert.equal(c.BackupStore.isDirty(),false);
}

console.log('Phase-D-Direktabdeckung der öffentlichen Stores erfolgreich geprüft.');
