import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path){return readFile(new URL(`../${path}`,import.meta.url),'utf8');}

const app=await text('js/app.js');
const schema=await text('js/state-schema.js');
const storage=await text('js/state-storage.js');
const backup=await text('js/backup-manager.js');
const dataConsistency=await text('js/data-consistency.js');
const refinements=await text('js/refinements.js');
const forecastEngine=await text('js/forecast-engine.js');
const forecastView=await text('js/forecast-view.js');
const dataManagement=await text('js/data-management-v2.js');

// State-Schema V2: alle neuen Planungsdaten müssen Teil des kanonischen Zustands sein.
assert.match(schema,/CURRENT_VERSION\s*=\s*2/,'Phase A benötigt State-Schema V2');
for(const field of ['amountAdjustments','oneTimeEntries','forecastAssets']){
  assert.ok(schema.includes(field),`${field} fehlt im State-Schema`);
  assert.ok(storage.includes(field),`${field} fehlt in der Persistenz`);
}

// Backup/Restore muss exakt dieselben Daten transportieren und vor Restore normalisieren.
assert.match(backup,/version:3/,'Backup-Format muss Version 3 verwenden');
assert.match(backup,/schemaVersion:/,'Backup muss die State-Schema-Version dokumentieren');
assert.match(backup,/normalizeBackupData/,'Restore muss Backup-Daten vor Übernahme normalisieren');
for(const field of ['amountAdjustments','oneTimeEntries','forecastAssets']){
  assert.ok(backup.includes(field),`${field} fehlt im Backup/Restore`);
}

// Planungslogik: feste Erhöhung dauerhaft, Einmalzahlung exakt im Zielmonat.
assert.match(dataConsistency,/function\s+applyAmountAdjustments\s*\(/,'feste Betragserhöhungen müssen zentral berechnet werden');
assert.match(dataConsistency,/function\s+oneTimeValue\s*\(/,'Einmalzahlungen müssen zentral berechnet werden');
assert.ok(dataConsistency.includes('pos-fixed-inc-amount'),'Speichern der festen Betragserhöhung fehlt');
assert.ok(dataConsistency.includes('pos-once-amount'),'Speichern der Einmalzahlung fehlt');
assert.ok(refinements.includes('pos-fixed-inc-amount'),'UI für feste Betragserhöhung fehlt');
assert.ok(refinements.includes('pos-once-amount'),'UI für Einmalzahlung fehlt');

// Prognosevermögen bleibt ausschließlich im Prognosemodul.
assert.ok(!app.includes('forecastAssets'),'Startvermögen darf nicht in app.js bzw. Dashboard-Logik einfließen');
assert.ok(forecastView.includes('forecastAssets'),'Startvermögen muss in der Prognoseansicht verwaltet werden');
assert.ok(forecastView.includes('ausschließlich für die Prognose'),'UI muss die Prognose-only-Wirkung erklären');
assert.match(forecastEngine,/startAssets/,'Prognose-Engine muss Startvermögen akzeptieren');
assert.match(forecastEngine,/netWorth/,'Prognose-Engine muss Nettovermögen berechnen');

// Reset darf keine neuen Datenarten zurücklassen.
for(const field of ['amountAdjustments','oneTimeEntries','forecastAssets']){
  assert.ok(dataManagement.includes(field),`${field} muss durch Datenverwaltung/Werkseinstellungen behandelt werden`);
}

console.log('Phase-A-Vertrag erfolgreich geprüft.');
