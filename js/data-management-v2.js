/* UI-Controller für destruktive Datenaktionen. Statezugriff ausschließlich über DataManagementStore. */
'use strict';

function destructiveConfirm(){return confirm('Beim Bestätigen werden alle Einträge gelöscht!');}
function persistAndRefresh(message){persist();closeGenSheet();render();toast(message);}
function resetBuchungen(){if(!destructiveConfirm())return;DataManagementStore.clearBookings();persistAndRefresh('Alle Buchungen gelöscht');}
function deleteAllEntries(){if(!destructiveConfirm())return;DataManagementStore.deleteAllEntries();persistAndRefresh('Alle Einträge entfernt');}
function resetAll(){
  if(!confirm('Werkseinstellungen wiederherstellen?\n\nBeim Bestätigen werden alle Einträge gelöscht!'))return;
  DataManagementStore.applyFactoryState();
  if(globalThis.LoanCategoryStore?.syncAll)globalThis.LoanCategoryStore.syncAll();
  persistAndRefresh('Werkseinstellungen wiederhergestellt');
}
function openFixedDataActions(){openGenSheet(`<div class="sheet-title">Daten verwalten</div><div class="field-hint" style="margin-bottom:14px">„Buchungen löschen“ entfernt nur variable Buchungen. Prognoseereignisse, gespeicherte Szenarien und Finanzziele bleiben bestehen.</div><div style="display:flex;flex-direction:column;gap:8px"><button class="btn btn-ghost btn-full" onclick="resetBuchungen()">Buchungen löschen</button><button class="btn btn-red btn-full" onclick="deleteAllEntries()">Alle Einträge löschen</button><div class="sheet-divider"></div><button class="btn btn-ghost btn-full" onclick="resetAll()">App auf Werkseinstellungen zurücksetzen</button></div>`);}
