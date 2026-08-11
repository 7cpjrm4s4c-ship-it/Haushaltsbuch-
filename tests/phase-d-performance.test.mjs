import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [engine,renderers,viewModel,view]=await Promise.all([
  read('js/forecast-engine.js'),read('js/forecast-view-renderers.js'),read('js/forecast-view-model.js'),read('js/forecast-view.js')
]);

// Algorithmische Guardrails statt fragiler Millisekunden-Grenzwerte.
assert.ok(engine.includes('totals=new Map()'),'Historische variable Ausgaben müssen einmalig nach Monat indiziert werden');
assert.ok(!/for\s*\([^)]*offset[^)]*\)[\s\S]{0,250}bookings\.filter/.test(engine),'Buchungen dürfen nicht pro Rückblicksmonat vollständig gefiltert werden');
assert.ok(renderers.includes('const byYear=new Map()'),'Prognosemonate müssen für Jahresdetails einmalig gruppiert werden');
assert.ok(!renderers.includes('months.filter(item=>item.year===row.year)'),'Jahresrenderer darf nicht für jedes Jahr alle Monate erneut scannen');
assert.match(renderers,/function forecastAssetInputs\(assets(?:=forecastAssets\(\))?\)/);
assert.match(renderers,/function forecastReturnInputs\(assumptions(?:=forecastAssumptions\(\))?\)/);
assert.ok(view.includes('forecastAssetInputs(assets)'),'Forecast-View muss den vorhandenen Asset-Snapshot wiederverwenden');
assert.ok(view.includes('forecastReturnInputs(assumptions)'),'Forecast-View muss den vorhandenen Annahmen-Snapshot wiederverwenden');
assert.ok(viewModel.includes('forecastAssetBuckets(assets)'),'Forecast-ViewModel darf Assets für Buckets nicht erneut aus dem Store lesen');

// Fachliche Äquivalenz des optimierten historischen Durchschnitts für große Eingaben.
const context={console,Math,Number,Object,Array,Set,Map,String,RangeError};context.globalThis=context;vm.createContext(context);vm.runInContext(engine,context,{filename:'js/forecast-engine.js'});
const bookings=[];for(let year=2020;year<=2026;year++)for(let month=0;month<12;month++)for(let i=0;i<25;i++)bookings.push({year,month,catId:i%2?'v1':'x',betrag:i%2?10:999});
const avg=context.ForecastEngine.historicalVariableAverage({bookings,variableCategoryIds:['v1'],lookbackMonths:12,baseYear:2027,baseMonth:0});
assert.equal(avg,120,'Optimierter Index muss denselben Monatsdurchschnitt liefern');

console.log('Phase-D-Performance-Regressionen erfolgreich geprüft.');
