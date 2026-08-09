import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [registry,stateStore,appRegistry,bindings,compactManager,dataConsistency,scenariosUi,goalsUi,financialEventsUi,decisionsUi,loanIntegration,composer,viewModel,controller,renderers,view,index]=await Promise.all([
  'js/forecast-panel-registry.js','js/forecast-state-store.js','js/app-extension-registry.js','js/app-extension-bindings.js','js/compact-manager.js','js/data-consistency.js','js/forecast-scenarios-ui.js','js/forecast-goals-ui.js','js/financial-events-ui.js','js/forecast-decisions-ui.js','js/financial-events-loan-integration.js','js/forecast-view-composer.js','js/forecast-view-model.js','js/forecast-view-controller.js','js/forecast-view-renderers.js','js/forecast-view.js','index.html'
].map(read));

for(const forbidden of [/(^|[^\w$])S\s*\./m,/\bdocument\s*\./,/\blocalStorage\b/,/\bsessionStorage\b/,/\bpersist\s*\(/,/\b(?:window|globalThis|root)\s*\.\s*render\s*\(/,/\b(?:window|globalThis|root)\s*\.\s*toast\s*\(/]){
  assert.ok(!forbidden.test(registry),'ForecastPanelRegistry darf keine App- oder DOM-Abhängigkeit enthalten');
  assert.ok(!forbidden.test(appRegistry),'AppExtensionRegistry darf keine App- oder DOM-Abhängigkeit enthalten');
}

// State-Store ist die einzige Forecast-Feature-Grenze zum App-State und kennt keine UI.
assert.match(stateStore,/(^|[^\w$])S\s*\./m);
assert.match(stateStore,/\bpersist\s*\(/);
for(const forbidden of [/\bdocument\s*\./,/\brender\s*\(/,/\btoast\s*\(/,/\bopenGenSheet\s*\(/,/\bcloseGenSheet\s*\(/]){
  assert.ok(!forbidden.test(stateStore),'ForecastStateStore darf keine UI-Abhängigkeit enthalten');
}
assert.ok(stateStore.includes('setAssets'),'ForecastStateStore muss alle schreibenden Forecast-Zustände kapseln');

// Forecast-Feature-UIs dürfen App-State und Persistenz nicht direkt kennen.
for(const [name,source] of [['Finanzereignisse',financialEventsUi],['Szenarien',scenariosUi],['Finanzziele',goalsUi],['Entscheidungsanalyse',decisionsUi],['Kreditintegration',loanIntegration]]){
  assert.ok(source.includes('ForecastStateStore.'),`${name} müssen den ForecastStateStore verwenden`);
  assert.ok(!/(^|[^\w$])S\s*\./m.test(source),`${name} dürfen nicht direkt auf S zugreifen`);
  assert.ok(!/\bpersist\s*\(/.test(source),`${name} dürfen Persistenz nicht direkt aufrufen`);
}
assert.ok(!decisionsUi.includes('storedForecastScenarios'),'Entscheidungs-UI darf keine Szenario-UI-Helfer verwenden');
assert.ok(!decisionsUi.includes('storedForecastGoals'),'Entscheidungs-UI darf keine Ziel-UI-Helfer verwenden');
assert.ok(!decisionsUi.includes('normalizedForecastGoal'),'Entscheidungs-UI darf keine Ziel-UI-Normalisierung verwenden');

for(const [name,source] of [['Szenarien',scenariosUi],['Finanzziele',goalsUi]]){
  assert.ok(source.includes('ForecastPanelRegistry.register'),`${name} müssen sich über die Panel-Registry registrieren`);
  assert.ok(!/\bvPrognose\s*=/.test(source),`${name} dürfen vPrognose nicht überschreiben`);
  assert.ok(!/\bvEinstellungen\s*=/.test(source),`${name} dürfen vEinstellungen nicht überschreiben`);
}
assert.ok(financialEventsUi.includes("ForecastPanelRegistry.register('beforeKpis','financial-events'"));
assert.ok(composer.includes("ForecastPanelRegistry.render('beforeKpis')"),'Composer muss alle registrierten Panels zusammensetzen');
assert.ok(composer.includes("AppExtensionRegistry.registerView('einstellungen',composeForecastView,200)"));
assert.ok(!/root\.vPrognose\s*=/.test(composer),'Forecast-Composer darf vPrognose nicht überschreiben');
assert.ok(!/root\.vEinstellungen\s*=/.test(composer),'Forecast-Composer darf vEinstellungen nicht überschreiben');
assert.ok(!view.includes('financialEventsPanel'),'Basis-View darf keine Feature-Panels direkt kennen');
assert.ok(!/\bvEinstellungen\s*=/.test(view),'Basis-View darf keine globale View überschreiben');

// Weitere Legacy-Overrides müssen über die explizite Registry laufen.
assert.ok(compactManager.includes("AppExtensionRegistry.registerView('ausgaben',compactExpensesView"));
assert.ok(compactManager.includes("AppExtensionRegistry.registerView('uebersicht',compactFixedCostsView"));
assert.ok(!/\bvAusgaben\s*=/.test(compactManager),'CompactManager darf vAusgaben nicht überschreiben');
assert.ok(!/\bvUebersicht\s*=/.test(compactManager),'CompactManager darf vUebersicht nicht überschreiben');
assert.ok(!/\bvEinstellungen\s*=/.test(compactManager),'CompactManager darf vEinstellungen nicht überschreiben');
assert.ok(dataConsistency.includes("AppExtensionRegistry.registerCalculation('gv',consistentValue"));
assert.ok(dataConsistency.includes("AppExtensionRegistry.registerCalculation('calcMonth',consistentMonthCalculation"));
assert.ok(!/\bgv\s*=\s*function/.test(dataConsistency),'DataConsistency darf gv nicht überschreiben');
assert.ok(!/\bcalcMonth\s*=\s*function/.test(dataConsistency),'DataConsistency darf calcMonth nicht überschreiben');
assert.ok(bindings.includes("const calculations={gv:'gv',calcMonth:'calcMonth'}"));
assert.ok(bindings.includes("const views={ausgaben:'vAusgaben',uebersicht:'vUebersicht',einstellungen:'vEinstellungen'}"));
for(const source of [compactManager,dataConsistency,composer])assert.ok(!/root\s*\[[^\]]+\]\s*=/.test(source),'Nur der Composition Root darf Legacy-Globals verdrahten');

// View-Model ist reine Datenaufbereitung; Schreibvorgänge liegen im Controller.
assert.ok(viewModel.includes('function forecastData('));
assert.ok(!/(^|[^\w$])S\s*\./m.test(viewModel),'Forecast-View-Model darf App-State nicht direkt lesen');
for(const forbidden of [/\bpersist\s*\(/,/\brender\s*\(/,/\bdocument\s*\./])assert.ok(!forbidden.test(viewModel),'Forecast-View-Model darf keine UI-/Persistenz-Seiteneffekte enthalten');
assert.ok(controller.includes('ForecastStateStore.setAssets'));
assert.ok(controller.includes('ForecastStateStore.save()'));
assert.ok(controller.includes('render()'));
assert.ok(!/(^|[^\w$])S\s*\./m.test(controller),'Forecast-Controller darf App-State nur über den Store verändern');

// Renderer sind statefrei und Basis-View enthält weder Datenlogik noch Feature-Komposition.
assert.ok(renderers.includes('function forecastWealthChart('));
assert.ok(renderers.includes('function forecastYearDetails('));
assert.ok(!/(^|[^\w$])S\s*\./m.test(renderers),'Forecast-Renderer dürfen App-State nicht lesen');
assert.ok(!view.includes('function forecastData('),'Basis-View darf keine Forecast-Datenlogik enthalten');
assert.ok(!view.includes('function forecastWealthChart('),'Basis-View darf keine Chart-Implementierung enthalten');
assert.ok(!view.includes('function forecastYearDetails('),'Basis-View darf keine Detailrenderer enthalten');

const appRegistryPos=index.indexOf('js/app-extension-registry.js');
const stateSchemaPos=index.indexOf('js/state-schema.js');
const registryPos=index.indexOf('js/forecast-panel-registry.js');
const storePos=index.indexOf('js/forecast-state-store.js');
const integrationPos=index.indexOf('js/financial-events-loan-integration.js');
const modelPos=index.indexOf('js/forecast-view-model.js');
const controllerPos=index.indexOf('js/forecast-view-controller.js');
const renderersPos=index.indexOf('js/forecast-view-renderers.js');
const viewPos=index.indexOf('js/forecast-view.js');
const eventsPos=index.indexOf('js/financial-events-ui.js');
const scenarioPos=index.indexOf('js/forecast-scenarios-ui.js');
const goalsPos=index.indexOf('js/forecast-goals-ui.js');
const composerPos=index.indexOf('js/forecast-view-composer.js');
const compactPos=index.indexOf('js/compact-manager.js');
const consistencyPos=index.indexOf('js/data-consistency.js');
const bindingsPos=index.indexOf('js/app-extension-bindings.js');
const bootstrapPos=index.indexOf('js/bootstrap.js');
assert.ok(appRegistryPos>=0&&appRegistryPos<compactPos&&appRegistryPos<consistencyPos&&appRegistryPos<composerPos,'AppExtensionRegistry muss vor allen registrierenden Modulen geladen werden');
assert.ok(stateSchemaPos>=0&&stateSchemaPos<modelPos,'StateSchema muss vor dem Forecast-View-Model geladen werden');
assert.ok(registryPos>=0&&registryPos<eventsPos,'Panel-Registry muss vor Finanzereignis-UI geladen werden');
assert.ok(storePos>registryPos&&storePos<integrationPos&&storePos<eventsPos&&storePos<scenarioPos&&storePos<goalsPos,'ForecastStateStore muss vor allen Forecast-Feature-Integrationen/UIs geladen werden');
assert.ok(registryPos<scenarioPos&&registryPos<goalsPos,'Panel-Registry muss vor allen Panel-Modulen geladen werden');
assert.ok(modelPos>=0&&controllerPos>modelPos&&renderersPos>controllerPos&&viewPos>renderersPos,'Forecast-View-Module müssen Modell → Controller → Renderer → View laden');
assert.ok(composerPos>scenarioPos&&composerPos>goalsPos,'Composer muss nach den registrierenden Modulen geladen werden');
assert.ok(bindingsPos>composerPos&&bindingsPos<bootstrapPos,'Composition Root muss nach allen Registrierungen und vor Bootstrap geladen werden');

const registryContext={Object,Map,Set,String,Number,Array,TypeError};registryContext.globalThis=registryContext;vm.createContext(registryContext);
vm.runInContext(registry,registryContext,{filename:'js/forecast-panel-registry.js'});
const panels=registryContext.ForecastPanelRegistry;
panels.register('slot','late',()=>'<late>',200);
panels.register('slot','early',()=>'<early>',100);
assert.equal(panels.render('slot'),'<early><late>');
panels.register('slot','early',()=>'<early-new>',50);
assert.equal(panels.render('slot'),'<early-new><late>');
assert.equal(panels.render('slot',undefined,{exclude:['early']}),'<late>');
assert.equal(panels.render('slot',undefined,{include:['early']}),'<early-new>');
assert.deepEqual(JSON.parse(JSON.stringify(panels.list('slot'))),[{id:'early',priority:50},{id:'late',priority:200}]);

const appRegistryContext={Object,Map,String,Number,TypeError};appRegistryContext.globalThis=appRegistryContext;vm.createContext(appRegistryContext);
vm.runInContext(appRegistry,appRegistryContext,{filename:'js/app-extension-registry.js'});
const extensions=appRegistryContext.AppExtensionRegistry;
const low=()=>1,high=()=>2;
extensions.registerView('test',low,100);extensions.registerView('test',high,200);extensions.registerView('test',low,50);
assert.equal(extensions.resolveView('test'),high,'Höhere Priorität muss deterministisch gewinnen');
extensions.registerCalculation('calc',low,100);assert.equal(extensions.resolveCalculation('calc'),low);

const storeContext={Object,JSON,Array,Number,Error,S:{year:2026,month:7,kredite:[{id:'l1'}],financialEvents:[{id:'e1'}],forecastScenarios:[],forecastGoals:[],ui:{forecast:{endYear:2030}},forecastAssumptions:{purchasingPowerInflation:2},forecastAssets:{cash:100}},persistCalls:0};
storeContext.persist=()=>{storeContext.persistCalls++;};storeContext.globalThis=storeContext;vm.createContext(storeContext);vm.runInContext(stateStore,storeContext,{filename:'js/forecast-state-store.js'});
const store=storeContext.ForecastStateStore;
const events=store.financialEvents();events[0].id='changed';assert.equal(storeContext.S.financialEvents[0].id,'e1','Store-Lesezugriffe müssen Kopien liefern');
const assets=store.assets();assets.cash=999;assert.equal(storeContext.S.forecastAssets.cash,100,'Asset-Lesezugriffe müssen Kopien liefern');
store.setAssets({cash:250});assert.equal(storeContext.S.forecastAssets.cash,250);
store.setGoals([{id:'g1'}]);assert.equal(storeContext.S.forecastGoals[0].id,'g1');store.save();assert.equal(storeContext.persistCalls,1);

console.log('Phase-D-Modulgrenzen erfolgreich geprüft.');
