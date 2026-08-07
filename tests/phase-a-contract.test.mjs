import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
async function text(path){return readFile(new URL(`../${path}`,import.meta.url),'utf8');}
const app=await text('js/app.js');
const schema=await text('js/state-schema.js');
const storage=await text('js/state-storage.js');
const backup=await text('js/backup-manager.js');
const dataConsistency=await text('js/data-consistency.js');
const refinements=await text('js/refinements.js');
const planning=await text('js/planning-events.js');
const forecastEngine=await text('js/forecast-engine.js');
const forecastAdapter=await text('js/forecast-adapter.js');
const forecastView=await text('js/forecast-view.js');
const dataManagement=await text('js/data-management-v2.js');
assert.match(schema,/CURRENT_VERSION\s*=\s*2/);
for(const field of ['amountAdjustments','oneTimeEntries','forecastAssets']){assert.ok(schema.includes(field));assert.ok(storage.includes(field));assert.ok(backup.includes(field));assert.ok(dataManagement.includes(field));}
assert.match(backup,/version:3/);assert.match(backup,/normalizeBackupData/);
assert.match(planning,/fromLegacy/);assert.match(planning,/valueForMonth/);assert.match(planning,/percentageIncrease/);assert.match(planning,/fixedIncrease/);assert.match(planning,/oneTime/);
assert.ok(dataConsistency.includes('PlanningEvents.valueForMonth'),'Monatsberechnung muss das einheitliche Planungsmodell verwenden');
assert.ok(dataConsistency.includes('pos-fixed-inc-amount'));assert.ok(dataConsistency.includes('pos-once-amount'));assert.ok(refinements.includes('pos-fixed-inc-amount'));assert.ok(refinements.includes('pos-once-amount'));
assert.ok(!app.includes('forecastAssets'),'Startvermögen darf nicht in app.js bzw. Dashboard-Logik einfließen');
assert.ok(forecastView.includes('forecastAssets'));assert.ok(forecastView.includes('ausschließlich für die Prognose'));
assert.ok(!forecastEngine.includes('gv('));assert.ok(!forecastEngine.includes('creditBalanceAt'));assert.ok(!forecastEngine.includes('creditInterestAt'));assert.ok(!forecastEngine.includes('document.'));
assert.ok(forecastAdapter.includes('gv('));assert.ok(forecastAdapter.includes('creditBalanceAt'));assert.ok(forecastAdapter.includes('creditInterestAt'));
assert.match(forecastEngine,/baseMonths/);assert.match(forecastEngine,/summary/);assert.match(forecastEngine,/netWorth/);
console.log('Phase-A-Vertrag erfolgreich geprüft.');