import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [engine,renderers,viewModel,view,dataConsistency,bookingStore,dashboard]=await Promise.all([
  read('js/forecast-engine.js'),read('js/forecast-view-renderers.js'),read('js/forecast-view-model.js'),read('js/forecast-view.js'),read('js/data-consistency.js'),read('js/booking-store.js'),read('js/dashboard-view.js')
]);

// Algorithmische Guardrails statt fragiler Millisekunden-Grenzwerte.
assert.ok(engine.includes('totals=new Map()'),'Historische variable Ausgaben müssen einmalig nach Monat indiziert werden');
assert.ok(!/for\s*\([^)]*offset[^)]*\)[\s\S]{0,250}bookings\.filter/.test(engine),'Buchungen dürfen nicht pro Rückblicksmonat vollständig gefiltert werden');
assert.ok(renderers.includes('const byYear=new Map()'),'Prognosemonate müssen für Jahresdetails einmalig gruppiert werden');
assert.ok(!renderers.includes('months.filter(item=>item.year===row.year)'),'Jahresrenderer darf nicht für jedes Jahr alle Monate erneut scannen');
assert.ok(view.includes("openForecastAccounts('liquidity'"),'Vereinfachte Prognose muss Liquiditätskonten im Overlay verwalten');
assert.ok(view.includes("openForecastAccounts('investments'"),'Vereinfachte Prognose muss Anlagen im Overlay verwalten');
assert.ok(view.includes('forecastPrimaryResult(ui.focus,ui,months,summary)'),'Hauptansicht muss genau das gewählte Ergebnis rendern');
assert.ok(!view.includes('forecastYearDetails(')&&!view.includes('forecastTimeline('),'Jährliche Aufstellungen dürfen nicht mehr Teil der Hauptansicht sein');
assert.ok(viewModel.includes('forecastAssetBuckets(accounts)'),'Forecast-ViewModel darf Konten für Buckets nicht erneut aus dem Store lesen');
assert.ok(dataConsistency.includes('const events=planningEventsSnapshot()'),'Monatsberechnung muss Planungsereignisse einmalig vorbereiten');
assert.ok(dataConsistency.includes('consistentValue(year,month,cat,events)'),'Monatsberechnung muss denselben Planungs-Snapshot pro Kategorie wiederverwenden');
assert.ok(!bookingStore.includes('return all().filter'),'Monatsfilter darf nicht vorher die komplette Buchungsliste klonen');
assert.ok(dashboard.includes('months=Array.from({length:12},(_,month)=>calcMonth(y,month))'),'Dashboard muss die 12 Monatswerte nur einmal berechnen');
assert.ok(dashboard.includes('dashboardYear(y,months)'),'Dashboard-Jahressumme muss die bereits berechneten Monatswerte wiederverwenden');

// Fachliche Äquivalenz des optimierten historischen Durchschnitts für große Eingaben.
const context={console,Math,Number,Object,Array,Set,Map,String,RangeError};context.globalThis=context;vm.createContext(context);vm.runInContext(engine,context,{filename:'js/forecast-engine.js'});
const bookings=[];for(let year=2020;year<=2026;year++)for(let month=0;month<12;month++)for(let i=0;i<25;i++)bookings.push({year,month,catId:i%2?'v1':'x',betrag:i%2?10:999});
const avg=context.ForecastEngine.historicalVariableAverage({bookings,variableCategoryIds:['v1'],lookbackMonths:12,baseYear:2027,baseMonth:0});
assert.equal(avg,120,'Optimierter Index muss denselben Monatsdurchschnitt liefern');

console.log('Phase-D-Performance-Regressionen erfolgreich geprüft.');
