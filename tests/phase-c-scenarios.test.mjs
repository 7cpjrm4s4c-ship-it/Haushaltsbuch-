import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

const scenarioSource=await read('js/forecast-scenarios.js');
const scenarioContext={console,Math,Number,Object,Array,Set,Map,String,Date,JSON};scenarioContext.globalThis=scenarioContext;vm.createContext(scenarioContext);vm.runInContext(scenarioSource,scenarioContext,{filename:'js/forecast-scenarios.js'});
const scenarios=scenarioContext.ForecastScenarios;assert.ok(scenarios);
const originalEvents=[{id:'e1',type:'oneTimeExpense',title:'Auto',startYear:2028,startMonth:5,amount:10000,enabled:true,metadata:{}}];
const saved=scenarios.snapshot({id:'s1',title:'Autokauf',ui:{scenarioKey:'cautious',lookbackMonths:6,annualInflation:3,endYear:2035},assumptions:{annualReturns:{etf:5},purchasingPowerInflation:2,savingsTarget:'etf'},financialEvents:originalEvents,baseYear:2026,nowIso:'2026-08-08T10:00:00.000Z'});
assert.equal(saved.title,'Autokauf');assert.equal(saved.ui.endYear,2035);assert.equal(saved.financialEvents.length,1);assert.ok(!('forecastAssets' in saved),'Startvermögen darf nicht Teil eines Szenarios sein');
originalEvents[0].amount=1;assert.equal(saved.financialEvents[0].amount,10000,'Szenario muss seine Ereignisse tief kopieren');
const clamped=scenarios.normalizeScenario({ui:{endYear:2100,lookbackMonths:99,annualInflation:99}},2026);assert.equal(clamped.ui.endYear,2066);assert.equal(clamped.ui.lookbackMonths,3);assert.equal(clamped.ui.annualInflation,20);
const updated=scenarios.update(saved,{title:'Autokauf neu',baseYear:2026,nowIso:'2026-08-09T10:00:00.000Z'});assert.equal(updated.createdAt,saved.createdAt);assert.notEqual(updated.updatedAt,saved.updatedAt);
for(const forbidden of [/(^|[^\w$])S\s*\./m,/\bdocument\s*\./,/\blocalStorage\b/,/\bpersist\s*\(/,/\brender\s*\(/])assert.ok(!forbidden.test(scenarioSource),'ForecastScenarios muss reine Fachlogik bleiben');

const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,RangeError,TypeError};context.globalThis=context;vm.createContext(context);
for(const path of ['js/forecast-engine.js','js/financial-events.js'])vm.runInContext(await read(path),context,{filename:path});
context.S={year:2026,month:0,cats:[],buchungen:[],kredite:[],financialEvents:[]};context.gv=()=>0;context.creditBalanceAt=()=>0;
vm.runInContext(await read('js/forecast-adapter.js'),context,{filename:'js/forecast-adapter.js'});
const ui={scenarioKey:'realistic',lookbackMonths:3,annualInflation:0,endYear:2026},assets={cash:1000},assumptions={annualReturns:{},purchasingPowerInflation:0,savingsTarget:'etf'};
const event=[{id:'x',type:'oneTimeExpense',title:'Test',startYear:2026,startMonth:0,amount:100,enabled:true,metadata:{}}];
const without=context.ForecastEngine.project(context.buildForecastInput(ui,assets,assumptions,[]));
const withEvent=context.ForecastEngine.project(context.buildForecastInput(ui,assets,assumptions,event));
assert.equal(without.months[0].fixed,0);assert.equal(withEvent.months[0].fixed,100);assert.equal(context.S.financialEvents.length,0,'Szenariovergleich darf aktiven App-State nicht verändern');

const [schema,storage,backup,dataManagement,index,uiSource]=await Promise.all(['js/state-schema.js','js/state-storage.js','js/backup-manager.js','js/data-management-v2.js','index.html','js/forecast-scenarios-ui.js'].map(read));
assert.match(schema,/CURRENT_VERSION\s*=\s*\d+/);for(const source of [schema,storage,backup,dataManagement])assert.ok(source.includes('forecastScenarios'));
assert.ok(index.includes('js/forecast-scenarios.js'));assert.ok(index.includes('js/forecast-scenarios-ui.js'));assert.ok(uiSource.includes('buildForecastInput(scenario.ui,assets,scenario.assumptions,scenario.financialEvents)'));
console.log('Phase-C-Szenariotests erfolgreich.');
