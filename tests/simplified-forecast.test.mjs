import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [view,model,controller,events,composer,css]=await Promise.all(['js/forecast-view.js','js/forecast-view-model.js','js/forecast-view-controller.js','js/financial-events-ui.js','js/forecast-view-composer.js','css/modules.css'].map(read));

for(const label of ['Vermögen in einem Jahr','Wann bin ich schuldenfrei?','Liquidität in einem Jahr'])assert.ok(view.includes(label));
assert.ok(view.includes('Zieljahr'));
assert.ok(view.includes('Liquidität heute')&&view.includes('Anlagevermögen heute')&&view.includes('Restschulden heute'));
for(const label of ['Annahmen pro Jahr','Kaufkraftverlust (%)','Variable Ausgaben (%)','Verzinsung Liquidität (%)','Rendite Anlagevermögen (%)'])assert.ok(view.includes(label));
assert.ok(view.includes('Monatsbasis:')&&view.includes('verringern Liquidität und Vermögen'));
assert.ok(view.includes("setForecastBucketReturn('liquidity'")&&view.includes("setForecastBucketReturn('investments'"));
for(const removed of ['Jährlicher Finanzierungsspielraum','Jahres- und Monatsdetails','Rendite & Kaufkraft','Szenario'])assert.ok(!view.includes(removed),`${removed} darf die einfache Hauptansicht nicht belasten`);
assert.ok(model.includes("ui.focus==='debtFree'?{...ui,endYear:baseYear+40}:ui"),'Schuldenfreiheit braucht einen ausreichenden automatischen Horizont');
assert.ok(controller.includes('function setForecastBucket('));
assert.ok(controller.includes('function setForecastBucketReturn('));
assert.ok(model.includes('function forecastReturnBuckets('));
assert.ok(events.includes("['oneTimeExpense','specialRepayment']"));
assert.ok(events.includes("+ Sonderausgabe")&&events.includes("+ Sondertilgung"));
assert.ok(composer.includes("{include:['financial-events']}"),'Nur die einfache Ereignisplanung darf automatisch eingeblendet werden');
assert.match(css,/\.forecast-primary-result\{[^}]*border-radius:var\(--r-xl\)/);

console.log('Vereinfachte Prognoseansicht erfolgreich geprüft.');
