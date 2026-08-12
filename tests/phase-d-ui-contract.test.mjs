import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [index,contract,forecast]=await Promise.all([read('index.html'),read('css/ui-contract.css'),read('css/forecast.css')]);

for(const token of ['--space-1','--space-2','--space-3','--space-4','--section-gap','--control-h'])assert.ok(contract.includes(token),`UI-Vertrag muss ${token} definieren`);
assert.ok(contract.includes('.form-grid .field{margin-bottom:0}'),'Grid-Container müssen Feld-Außenabstände neutralisieren');
assert.ok(contract.includes('.inp,.sel{min-height:var(--control-h)}'),'Formularcontrols müssen eine einheitliche Mindesthöhe verwenden');
assert.ok(forecast.includes('.forecast-layout>*{margin-bottom:0}'),'Forecast-Container muss Kind-Außenabstände neutralisieren');
assert.ok(forecast.includes('gap:var(--section-gap)'),'Forecast muss den globalen Abschnittsabstand verwenden');
assert.ok(index.indexOf('css/ui-contract.css')>index.indexOf('css/forecast-goals.css'),'Globaler UI-Vertrag muss nach Modulstyles geladen werden');

console.log('Phase-D-UI-Vertrag erfolgreich geprüft.');
