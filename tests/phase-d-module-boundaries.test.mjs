import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [registry,scenariosUi,goalsUi,financialEventsUi,composer,viewModel,renderers,view,index]=await Promise.all([
  'js/forecast-panel-registry.js','js/forecast-scenarios-ui.js','js/forecast-goals-ui.js','js/financial-events-ui.js','js/forecast-view-composer.js','js/forecast-view-model.js','js/forecast-view-renderers.js','js/forecast-view.js','index.html'
].map(read));

for(const forbidden of [/(^|[^\w$])S\s*\./m,/\bdocument\s*\./,/\blocalStorage\b/,/\bsessionStorage\b/,/\bpersist\s*\(/,/\b(?:window|globalThis|root)\s*\.\s*render\s*\(/,/\b(?:window|globalThis|root)\s*\.\s*toast\s*\(/]){
  assert.ok(!forbidden.test(registry),'ForecastPanelRegistry darf keine App- oder DOM-Abhängigkeit enthalten');
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
const modelPos=index.indexOf('js/forecast-view-model.js');
const renderersPos=index.indexOf('js/forecast-view-renderers.js');
const viewPos=index.indexOf('js/forecast-view.js');
const eventsPos=index.indexOf('js/financial-events-ui.js');
const scenarioPos=index.indexOf('js/forecast-scenarios-ui.js');
const goalsPos=index.indexOf('js/forecast-goals-ui.js');
const composerPos=index.indexOf('js/forecast-view-composer.js');
assert.ok(registryPos>=0&&registryPos<eventsPos,'Registry muss vor Finanzereignis-UI geladen werden');
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

console.log('Phase-D-Modulgrenzen erfolgreich geprüft.');
