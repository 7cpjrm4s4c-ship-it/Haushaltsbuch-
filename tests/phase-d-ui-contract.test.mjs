import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [index,contract,forecast,polish,headerFix,refinements,shellEvents]=await Promise.all([
  read('index.html'),read('css/ui-contract.css'),read('css/forecast.css'),read('css/ui-polish.css'),read('css/header-layout-fix.css'),read('css/refinements.css'),read('js/app-shell-events.js')
]);

for(const token of ['--space-1','--space-2','--space-3','--space-4','--section-gap','--control-h','--app-header-height','--nav-height','--nav-bottom-gap'])assert.ok(contract.includes(token),`UI-Vertrag muss ${token} definieren`);
assert.ok(contract.includes('.form-grid .field,.form-card>.field:last-child{margin-bottom:0!important}'),'Grid-Container müssen Feld-Außenabstände neutralisieren');
assert.ok(contract.includes('.inp,.sel{min-height:var(--control-h)!important}'),'Formularcontrols müssen eine einheitliche Mindesthöhe verwenden');
assert.ok(contract.includes('.header.hidden{opacity:1!important'),'Header darf beim Scrollen nicht ausgeblendet werden');
assert.ok(contract.includes('bottom:calc(max(var(--sab),8px) + var(--nav-bottom-gap))!important'),'Bottom-Navigation muss Safe-Area und globalen unteren Abstand verwenden');
assert.ok(!shellEvents.includes("classList.add('hidden')"),'Shell-JavaScript darf den Header nicht ausblenden');
assert.ok(!polish.includes('--space-'),'ui-polish.css darf keine eigenen Spacing-Tokens definieren');
assert.ok(!headerFix.includes('--app-header-height'),'header-layout-fix.css darf keine eigene Shell-Geometrie definieren');
assert.ok(!/\.dialog-actions\{[^}]*position:sticky/.test(refinements),'Modul-/Refinement-CSS darf Dialogaktionen nicht sticky machen');
assert.ok(forecast.includes('.forecast-layout>*{margin-bottom:0}'),'Forecast-Container muss Kind-Außenabstände neutralisieren');
assert.ok(forecast.includes('gap:var(--section-gap)'),'Forecast muss den globalen Abschnittsabstand verwenden');
assert.ok(index.indexOf('css/ui-contract.css')>index.indexOf('css/forecast-goals.css'),'Globaler UI-Vertrag muss nach Modulstyles geladen werden');

console.log('Phase-D-UI-Vertrag erfolgreich geprüft.');
