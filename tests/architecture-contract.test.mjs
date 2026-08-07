import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path){
  return readFile(new URL(`../${path}`,import.meta.url),'utf8');
}

const index=await text('index.html');
const stateStorage=await text('js/state-storage.js');
const backupManager=await text('js/backup-manager.js');
const finalFixes=await text('js/final-fixes.js');
const dataManagement=await text('js/data-management-v2.js');
const creditModule=await text('js/credit-calculation.js');
const categoryManager=await text('js/category-manager-ui.js');

assert.ok(!index.includes('recurring-end-date.js'),'integriertes Enddatum-Modul darf nicht erneut geladen werden');
assert.ok(!index.includes('loan-integration.js'),'integriertes Kredit-Wrappermodul darf nicht erneut geladen werden');

assert.match(stateStorage,/onStatePersistRequested/,'zentrale Persistenz muss den expliziten Änderungs-Hook unterstützen');
assert.ok(!/const\s+originalPersist\s*=\s*persist/.test(backupManager),'Backup darf persist() nicht mehr wrappen');
assert.ok(!/persist\s*=\s*function\s+backup/.test(backupManager),'Backup darf persist() nicht überschreiben');

assert.ok(!/const\s+_v(?:Ausgaben|Uebersicht)/.test(finalFixes),'Views dürfen nicht per final-fixes Wrapper nachbearbeitet werden');
assert.ok(!/_openPositionDialog/.test(finalFixes),'Positionsdialog darf nicht per Kompatibilitätswrapper erweitert werden');
assert.ok(!/_save(?:VariableCategory|FixedCategory|Position)/.test(dataManagement),'Sortierung darf nicht über Save-Wrapper erfolgen');

assert.ok(!/original(?:View|SaveNew|SaveEdit|Delete)/.test(creditModule),'Kreditmodul darf keine Wrapper-Kette mehr verwenden');
assert.match(creditModule,/function\s+syncAllLoans\s*\(/,'Kreditsynchronisierung muss Teil des Kreditmoduls sein');
assert.match(creditModule,/function\s+calculateSpecialRepayment\s*\(/,'Sondertilgungsrechner muss Teil des Kreditmoduls bleiben');
assert.match(categoryManager,/function\s+openVariableCategoryManager\s*\(/,'Kategorieverwaltung braucht einen expliziten Einstiegspunkt');
assert.match(categoryManager,/function\s+openFixedCategoryManager\s*\(/,'Fixkosten-Kategorieverwaltung braucht einen expliziten Einstiegspunkt');

console.log('Architekturvertrag erfolgreich geprüft.');
