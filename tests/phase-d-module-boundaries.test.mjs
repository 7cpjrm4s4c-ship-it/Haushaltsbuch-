import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [registry,scenariosUi,goalsUi,financialEventsUi,composer,index]=await Promise.all([
  'js/forecast-panel-registry.js','js/forecast-scenarios-ui.js','js/forecast-goals-ui.js','js/financial-events-ui.js','js/forecast-view-composer.js','index.html'
].map(read));

// Registry bleibt neutrale Infrastruktur ohne App-State oder DOM.
for(const forbidden of [/(^|[^\w$])S\s*\./m,/\bdocument\s*\./,/\blocalStorage\b/,/\bsessionStorage\b/,/\bpersist\s*\(/,/\brender\s*\(/]){
  assert.ok(!forbidden.test(registry),'ForecastPanelRegistry darf keine App- oder DOM-Abhängigkeit enthalten');
}

// Feature-UI-Module registrieren Panels, überschreiben aber nicht die Basis-View.
for(const [name,source] of [['Szenarien',scenariosUi],['Finanzziele',goalsUi]]){
  assert.ok(source.includes('ForecastPanelRegistry.register'),`${name} müssen sich über die Panel-Registry registrieren`);
  assert.ok(!/\bvPrognose\s*=/.test(source),`${name} dürfen vPrognose nicht überschreiben`);
  assert.ok(!/\bvEinstellungen\s*=/.test(source),`${name} dürfen vEinstellungen nicht überschreiben`);
}
assert.ok(financialEventsUi.includes("ForecastPanelRegistry.register('beforeKpis','financial-events'"));

// Nur die explizite Kompositionsschicht darf die finale Prognose-View setzen.
assert.ok(composer.includes('ForecastPanelRegistry.render'));
assert.ok(/root\.vPrognose\s*=\s*composeForecastView/.test(composer));
assert.ok(/root\.vEinstellungen\s*=\s*composeForecastView/.test(composer));

// Lade-Reihenfolge: Registry vor Registrierungen, Composer nach Feature-Panels.
const registryPos=index.indexOf('js/forecast-panel-registry.js');
const eventsPos=index.indexOf('js/financial-events-ui.js');
const scenarioPos=index.indexOf('js/forecast-scenarios-ui.js');
const goalsPos=index.indexOf('js/forecast-goals-ui.js');
const composerPos=index.indexOf('js/forecast-view-composer.js');
assert.ok(registryPos>=0&&registryPos<eventsPos,'Registry muss vor Finanzereignis-UI geladen werden');
assert.ok(registryPos<scenarioPos&&registryPos<goalsPos,'Registry muss vor allen Panel-Modulen geladen werden');
assert.ok(composerPos>scenarioPos&&composerPos>goalsPos,'Composer muss nach den registrierenden Modulen geladen werden');

// Verhalten der Registry: stabile Priorisierung, Ersetzen gleicher IDs, selektives Rendering.
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
