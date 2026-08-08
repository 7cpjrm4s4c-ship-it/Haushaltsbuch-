import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
async function source(path){return readFile(new URL(`../${path}`,import.meta.url),'utf8');}
async function run(path,context){vm.runInContext(await source(path),context,{filename:path});}
function makeContext(extra={}){const context={console,setTimeout,clearTimeout,Date,Intl,Math,Number,String,Array,Object,Set,Map,JSON,...extra};context.globalThis=context;vm.createContext(context);return context;}

// Planungslogik + Dashboard-Monatsberechnung
{
  const S={data:{},cats:[],recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],buchungen:[],budgets:{},ui:{},year:2026,month:0};
  const context=makeContext({S,gv:()=>0,calcMonth:()=>({}),dkey:(y,m,id)=>`${y}_${m}_${id}`,getBuchungenForMonth:(y,m)=>S.buchungen.filter(b=>b.year===y&&b.month===m),persist:()=>{},closeGenSheet:()=>{},render:()=>{},toast:()=>{},uid:()=> 'test-id',document:{getElementById:()=>null}});
  await run('js/planning-events.js',context);await run('js/data-consistency.js',context);
  const quarterly={id:'strom',g:'Wohnen',p:'Strom',d:0,t:'F'};S.cats=[quarterly];S.recurringRules=[{id:'r1',catId:'strom',amount:120,intervalMonths:3,startYear:2026,startMonth:2,endYear:2026,endMonth:8}];
  assert.equal(context.gv(2026,1,quarterly),0);assert.equal(context.gv(2026,2,quarterly),120);assert.equal(context.gv(2026,5,quarterly),120);assert.equal(context.gv(2026,11,quarterly),0);
  const salary={id:'gehalt',g:'Einnahmen',p:'Gehalt',d:3000,t:'E'},rent={id:'miete',g:'Wohnen',p:'Miete',d:1000,t:'F'},loan={id:'rate',g:'Kredite',p:'Rate',d:200,t:'K'},savings={id:'etf',g:'Sparen',p:'ETF',d:100,t:'S'},variable={id:'food',g:'Variable Ausgaben',p:'Lebensmittel',d:0,t:'V'};
  S.cats=[salary,rent,loan,savings,variable];S.recurringRules=[{id:'e',catId:'gehalt',amount:3000,intervalMonths:1,startYear:2026,startMonth:0,endYear:null,endMonth:null},{id:'f',catId:'miete',amount:1000,intervalMonths:1,startYear:2026,startMonth:0,endYear:null,endMonth:null},{id:'k',catId:'rate',amount:200,intervalMonths:1,startYear:2026,startMonth:0,endYear:null,endMonth:null},{id:'s',catId:'etf',amount:100,intervalMonths:1,startYear:2026,startMonth:0,endYear:null,endMonth:null}];S.buchungen=[{id:'b1',catId:'food',betrag:80,year:2026,month:0},{id:'b2',catId:'food',betrag:20,year:2026,month:0}];
  const month=context.calcMonth(2026,0);assert.deepEqual({...month},{e:3000,f:1000,v:100,k:200,s:100,aus:1400,saldo:1600});
}

// Kreditfortschreibung
{
  const context=makeContext({S:{kredite:[],cats:[],years:[2026,2027],year:2026,month:0},fmt:String,fmtS:String,esc:String,MF:Array(12).fill('Monat'),toast:()=>{},document:{getElementById:()=>null},uid:()=> 'id',persist:()=>{},closeGenSheet:()=>{},render:()=>{}});
  await run('js/credit-calculation.js',context);
  const credit={id:'k1',n:'Test',s:1200,r:1200,m:100,z:12,balanceYear:2026,balanceMonth:0};
  assert.equal(context.creditInterestAt(credit,2026,0),12);assert.equal(context.creditPrincipalAt(credit,2026,0),88);assert.equal(context.creditBalanceAt(credit,2026,1),1112);assert.equal(context.creditRemainingMonthsFrom({...credit,m:10},2026,0),null);
}

// Persistenz-Roundtrip einschließlich Prognoseannahmen, Financial Events, Szenarien und Finanzziele
{
  const store=new Map(),localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
  const S={data:{},cats:[],kredite:[],years:[2026,2027],buchungen:[],budgets:{},recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],forecastAssets:{cash:1000},forecastAssumptions:{annualReturns:{etf:7,callMoney:2.5},purchasingPowerInflation:2.1,savingsTarget:'etf'},financialEvents:[],forecastScenarios:[],forecastGoals:[],year:2026,month:0};
  const context=makeContext({S,localStorage,LS_KEY:'hp5',_pTimer:null,persist:()=>{},load:()=>{},now:new Date(2026,0,1),defaultYears:()=>[2026,2027],applyFactoryState:()=>{},normalizeVariableCategories:()=>{},creditStartAmount:k=>Number(k.s??0),creditReferenceYear:k=>Number(k.balanceYear??2026),creditReferenceMonth:k=>Number(k.balanceMonth??0),syncAllLoans:()=>{},sortCategoriesInPlace:()=>{}});
  await run('js/state-schema.js',context);await run('js/state-storage.js',context);
  S.amountAdjustments=[{id:'a1',catId:'f1',amount:20,year:2027,month:8}];
  S.oneTimeEntries=[{id:'o1',catId:'e1',amount:1600,year:2026,month:11}];
  S.financialEvents=[{id:'fe1',type:'oneTimeIncome',title:'Bonus',startYear:2026,startMonth:11,amount:1600,enabled:true}];
  S.forecastScenarios=[{id:'sc1',title:'Vorsichtig',ui:{scenarioKey:'cautious',lookbackMonths:6,annualInflation:2,endYear:2030},assumptions:{annualReturns:{etf:4},purchasingPowerInflation:2,savingsTarget:'etf'},financialEvents:S.financialEvents,createdAt:'2026-08-08',updatedAt:'2026-08-08'}];
  S.forecastGoals=[{id:'g1',title:'Reserve',type:'minLiquidity',targetAmount:15000,targetYear:2030,targetMonth:11,enabled:true}];
  context.persist();await new Promise(r=>setTimeout(r,350));
  const raw=JSON.parse(localStorage.getItem('hp5'));
  assert.equal(raw.schemaVersion,context.StateSchema.CURRENT_VERSION);
  assert.equal(raw.amountAdjustments.length,1);assert.equal(raw.oneTimeEntries.length,1);assert.equal(raw.forecastAssets.cash,1000);
  assert.equal(raw.forecastAssumptions.annualReturns.etf,7);assert.equal(raw.forecastAssumptions.purchasingPowerInflation,2.1);assert.equal(raw.forecastAssumptions.savingsTarget,'etf');
  assert.equal(raw.financialEvents.length,1);assert.equal(raw.financialEvents[0].type,'oneTimeIncome');assert.equal(raw.forecastScenarios.length,1);assert.equal(raw.forecastScenarios[0].title,'Vorsichtig');assert.equal(raw.forecastGoals.length,1);assert.equal(raw.forecastGoals[0].targetAmount,15000);
  S.amountAdjustments=[];S.oneTimeEntries=[];S.forecastAssets={};S.forecastAssumptions={};S.financialEvents=[];S.forecastScenarios=[];S.forecastGoals=[];
  context.load();
  assert.equal(S.amountAdjustments.length,1);assert.equal(S.oneTimeEntries.length,1);assert.equal(S.forecastAssets.cash,1000);assert.equal(S.forecastAssumptions.annualReturns.etf,7);
  assert.equal(S.financialEvents.length,1);assert.equal(S.financialEvents[0].title,'Bonus');assert.equal(S.forecastScenarios.length,1);assert.equal(S.forecastScenarios[0].ui.scenarioKey,'cautious');assert.equal(S.forecastGoals.length,1);assert.equal(S.forecastGoals[0].type,'minLiquidity');
}
console.log('Alle App-Integrationstests erfolgreich.');
