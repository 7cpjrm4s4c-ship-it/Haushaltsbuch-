import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [registry,stateStore,scenariosUi,goalsUi,financialEventsUi,composer,viewModel,renderers,view,index]=await Promise.all([
  'js/forecast-panel-registry.js','js/forecast-state-store.js','js/forecast-scenarios-ui.js','js/forecast-goals-ui.js','js/financial-events-ui.js','js/forecast-view-composer.js','js/forecast-view-model.js','js/forecast-view-renderers.js','js/forecast-view.js','index.html'
].map(read));

for(const forbidden of [/(^|[^\w$])S\s*\./m,/\bdocument\s*\./,/\blocalStorage\b/,/\bsessionStorage\b/,/\bpersist\s*\(/,/\b(?:window|globalThis|root)\s*\.\s*render\s*\(/,/\b(?:window|globalThis|root)\s*\.\s*toast\s*\(/]){
  assert.ok(!forbidden.test(registry),'ForecastPanelRegistry darf keine App- oder DOM-Abhängigkeit enthalten');
}

// State-Store ist die einzige Forecast-Feature-Grenze zum App-State und kennt keine UI.
assert.match(stateStore,/(^|[^\w$])S\s*\./m);
assert.match(stateStore,/\bpersist\s*\(/);
for(const forbidden of [/\bdocument\s*\./,/\brender\s*\(/,/\btoast\s*\(/,/\bopenGenSheet\s*\(/,/\bcloseGenSheet\s*\(/]){
  assert.ok(!forbidden.test(stateStore),'ForecastStateStore darf keine UI-Abhängigkeit enthalten');
}

// Feature-UIs dürfen App-State und Persistenz nicht direkt kennen.
for(const [name,source] of [['Finanzereignisse',financialEventsUi],['Szenarien',scenariosUi],['Finanzziele',goalsUi]]){
  assert.ok(source.includes('ForecastStateStore.'),`${name} müssen den ForecastStateStore verwenden`);
  assert.ok(!/(^|[^\w$])S\s*\./m.test(source),`${name} dürfen nicht direkt auf S zugreifen`);
  assert.ok(!/\bpersist\s*\(/.test(source),`${name} dürfen Persistenz nicht direkt aufrufen`);
}

for(const [name,source] of [['Szenarien',scenariosUi],['Finanzziele',goalsUi]]){
  assert.ok(source.includes('ForecastPanelRegistry.register'),`${name} müssen sich über die Panel-Registry registrieren`);
  assert.ok(!/\bvPrognose\s*=/.test(source),`${name} dürfen vPrognose nicht überschreiben`);
  assert.ok(!/\bvEinstellungen\s*=/.test(source),`${name} dürfen vEinstellungen nicht überschreiben`);
}
assert.ok(financialEventsUi.includes("ForecastPanelRegistry.register('beforeKpis','financial-events'"));
assert.ok(composer.includes('ForecastPanelRegistry.render'));
assert.ok(/root\.vPrognose\s*=\s*composeForecastView/.test(composer));
assert.ok(/root\.vEinstellungen\s*=\s*composeForecastView/.test(composer));

// D.1: State-/Datenlogik und Detailrenderer dürfen nicht mehr in der Basis-View liegen.
assert.ok(viewModel.includes('function forecastData('));
assert.ok(viewModel.includes('function setForecastAsset('));
assert.ok(renderers.includes('function forecastWealthChart('));
assert.ok(renderers.includes('function forecastYearDetails('));
assert.ok(!view.includes('function forecastData('),'Basis-View darf keine Forecast-Datenlogik enthalten');
assert.ok(!view.includes('function forecastWealthChart('),'Basis-View darf keine Chart-Implementierung enthalten');
assert.ok(!view.includes('function forecastYearDetails('),'Basis-View darf keine Detailrenderer enthalten');

const registryPos=index.indexOf('js/forecast-panel-registry.js');
const storePos=index.indexOf('js/forecast-state-store.js');
const modelPos=index.indexOf('js/forecast-view-model.js');
const renderersPos=index.indexOf('js/forecast-view-renderers.js');
const viewPos=index.indexOf('js/forecast-view.js');
const eventsPos=index.indexOf('js/financial-events-ui.js');
const scenarioPos=index.indexOf('js/forecast-scenarios-ui.js');
const goalsPos=index.indexOf('js/forecast-goals-ui.js');
const composerPos=index.indexOf('js/forecast-view-composer.js');
assert.ok(registryPos>=0&&registryPos<eventsPos,'Registry muss vor Finanzereignis-UI geladen werden');
assert.ok(storePos>registryPos&&storePos<eventsPos&&storePos<scenarioPos&&storePos<goalsPos,'ForecastStateStore muss vor allen Forecast-Feature-UIs geladen werden');
assert.ok(registryPos<scenarioPos&&registryPos<goalsPos,'Registry muss vor allen Panel-Modulen geladen werden');
assert.ok(modelPos>=0&&renderersPos>modelPos&&viewPos>renderersPos,'Forecast-View-Module müssen Modell → Renderer → View laden');
assert.ok(composerPos>scenarioPos&&composerPos>goalsPos,'Composer muss nach den registrierenden Modulen geladen werden');

const context={Object,Map,Set,String,Number,Array,TypeError};context.globalThis=context;vm.createContext(context);
vm.runInContext(registry,context,{filename:'js/forecast-panel-registry.js'});
const panels=context.ForecastPanelRegistry;
panels.register('slot','late',()=>'<late>',200);
panels.register('slot','early',()=>'<early>',100);
assert.equal(panels.render('slot'),'<early><late>');
panels.register('slot','early',()=>'<early-new>',50);
assert.equal(panels.render('slot'),'<early-new><late>');
assert.equal(panels.render('slot',undefined,{exclude:['early']}),'<late>');
assert.equal(panels.render('slot',undefined,{include:['early']}),'<early-new>');
assert.deepEqual(JSON.parse(JSON.stringify(panels.list('slot'))),[{id:'early',priority:50},{id:'late',priority:200}]);

const storeContext={Object,JSON,Array,Number,Error,S:{year:2026,month:7,kredite:[{id:'l1'}],financialEvents:[{id:'e1'}],forecastScenarios:[],forecastGoals:[],ui:{forecast:{endYear:2030}},forecastAssumptions:{purchasingPowerInflation:2},forecastAssets:{cash:100}},persistCalls:0};
storeContext.persist=()=>{storeContext.persistCalls++;};storeContext.globalThis=storeContext;vm.createContext(storeContext);vm.runInContext(stateStore,storeContext,{filename:'js/forecast-state-store.js'});
const store=storeContext.ForecastStateStore;
const events=store.financialEvents();events[0].id='changed';assert.equal(storeContext.S.financialEvents[0].id,'e1','Store-Lesezugriffe müssen Kopien liefern');
store.setGoals([{id:'g1'}]);assert.equal(storeContext.S.forecastGoals[0].id,'g1');store.save();assert.equal(storeContext.persistCalls,1);

console.log('Phase-D-Modulgrenzen erfolgreich geprüft.');
