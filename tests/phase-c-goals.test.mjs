import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const source=await read('js/forecast-goals.js');
const context={console,Math,Number,Object,Array,Set,Map,String,Date};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'js/forecast-goals.js'});
const goals=context.ForecastGoals;assert.ok(goals);
const forecast={summary:{startAssets:50000,startDebt:20000},months:[
  {year:2026,month:0,liquidity:20000,investments:30000,debt:18000,netWorth:32000},
  {year:2026,month:1,liquidity:14000,investments:32000,debt:15000,netWorth:31000},
  {year:2026,month:2,liquidity:16000,investments:35000,debt:10000,netWorth:41000},
  {year:2026,month:3,liquidity:18000,investments:40000,debt:0,netWorth:58000},
]};
let result=goals.evaluateGoal({id:'l',title:'Reserve',type:'minLiquidity',targetAmount:15000,targetYear:2026,targetMonth:3,enabled:true},forecast);assert.equal(result.achieved,false);assert.equal(result.gap,1000);assert.equal(result.critical.month,1);
result=goals.evaluateGoal({id:'n',title:'Vermögen',type:'netWorth',targetAmount:50000,targetYear:2026,targetMonth:3,enabled:true},forecast);assert.equal(result.achieved,true);assert.equal(result.firstAchieved.month,3);
result=goals.evaluateGoal({id:'i',title:'Depot',type:'investments',targetAmount:35000,targetYear:2026,targetMonth:2,enabled:true},forecast);assert.equal(result.achieved,true);assert.equal(result.firstAchieved.month,2);
result=goals.evaluateGoal({id:'d',title:'Schuldenfrei',type:'debtFree',targetYear:2026,targetMonth:3,enabled:true},forecast);assert.equal(result.achieved,true);assert.equal(result.firstAchieved.month,3);assert.equal(result.gap,0);
result=goals.evaluateGoal({id:'w',title:'Aufbau',type:'wealthGrowth',targetAmount:25000,targetYear:2026,targetMonth:3,enabled:true},forecast);assert.equal(result.achieved,true);assert.equal(result.firstAchieved.month,3);
result=goals.evaluateGoal({id:'o',title:'Später',type:'netWorth',targetAmount:100000,targetYear:2027,targetMonth:0,enabled:true},forecast);assert.equal(result.status,'outside','Nicht erreichtes Ziel außerhalb des Forecast-Horizonts darf nicht als verfehlt gelten');
result=goals.evaluateGoal({id:'oa',title:'Schon erreicht',type:'netWorth',targetAmount:50000,targetYear:2027,targetMonth:0,enabled:true},forecast);assert.equal(result.status,'achieved','Bereits erreichte Ziele bleiben auch bei späterem Zieltermin erreicht');
result=goals.evaluateGoal({id:'ml',title:'Reserve lang',type:'minLiquidity',targetAmount:10000,targetYear:2027,targetMonth:0,enabled:true},forecast);assert.equal(result.status,'outside','Mindestliquidität außerhalb des Horizonts kann nicht abschließend bewertet werden');
const disabled=goals.evaluateGoal({id:'x',title:'Aus',type:'netWorth',targetAmount:1,targetYear:2026,targetMonth:0,enabled:false},forecast);assert.equal(disabled.status,'disabled');
for(const forbidden of [/(^|[^\w$])S\s*\./m,/\bdocument\s*\./,/\blocalStorage\b/,/\bpersist\s*\(/,/\brender\s*\(/,/\btoast\s*\(/])assert.ok(!forbidden.test(source),'ForecastGoals muss reine Fachlogik bleiben');
const [schema,storage,backup,dataManagement,index,ui]=await Promise.all(['js/state-schema.js','js/state-storage.js','js/backup-manager.js','js/data-management-v2.js','index.html','js/forecast-goals-ui.js'].map(read));
for(const file of [schema,storage,backup,dataManagement])assert.ok(file.includes('forecastGoals'),'Finanzziele müssen durch State, Backup und Reset geführt werden');
assert.ok(index.includes('js/forecast-goals.js'));assert.ok(index.includes('js/forecast-goals-ui.js'));assert.ok(index.indexOf('js/forecast-goals.js')<index.indexOf('js/forecast-goals-ui.js'));
assert.ok(ui.includes('forecastScenarioResult'));assert.ok(ui.includes('ForecastGoals.evaluateGoal'));
console.log('Phase-C-Finanzzieltests erfolgreich.');
