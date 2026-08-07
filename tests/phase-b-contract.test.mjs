import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const text=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [app,schema,storage,backup,engine,adapter,view,dataManagement]=await Promise.all(['js/app.js','js/state-schema.js','js/state-storage.js','js/backup-manager.js','js/forecast-engine.js','js/forecast-adapter.js','js/forecast-view.js','js/data-management-v2.js'].map(text));

assert.ok(!app.includes('forecastAssumptions'),'Renditeannahmen dürfen nicht in die Dashboard-/App-Kernlogik gelangen');
for(const source of [schema,storage,backup,dataManagement])assert.ok(source.includes('forecastAssumptions'),'Prognoseannahmen müssen durch Schema, Persistenz, Backup und Reset geführt werden');
assert.match(schema,/CURRENT_VERSION\s*=\s*3/);
assert.match(backup,/version:4/);
assert.match(engine,/function\s+monthlyRate\s*\(/,'Monatliche Renditeberechnung gehört in die reine Engine');
assert.ok(engine.includes('startAssetBreakdown'));assert.ok(engine.includes('annualReturns'));assert.ok(engine.includes('realNetWorth'));assert.ok(engine.includes('cumulativeReturns'));
assert.ok(!engine.includes('S.'),'Engine darf keinen App-State lesen');assert.ok(!engine.includes('document.'),'Engine muss DOM-frei bleiben');
assert.ok(adapter.includes('annualReturns'));assert.ok(adapter.includes('purchasingPowerInflation'));assert.ok(adapter.includes('savingsTarget'));
assert.ok(view.includes('Rendite & Kaufkraft'));assert.ok(view.includes('Allgemeine Inflation / Kaufkraft'));assert.ok(view.includes('Neue Sparraten fließen in'));assert.ok(view.includes('forecastWealthChart'));

console.log('Phase-B-Architekturvertrag erfolgreich geprüft.');
