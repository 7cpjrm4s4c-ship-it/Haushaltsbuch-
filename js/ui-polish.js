/* Bearbeiten und Löschen von Buchungen und festen Positionen. */
'use strict';

function openBookingDialog(id){
  const b=BookingStore.find(id); if(!b)return;
  const direction=b.direction==='income'?'income':'expense',income=direction==='income';
  openGenSheet(`<div class="sheet-title">${income?'Zahlungseingang':'Ausgabe'} bearbeiten</div><div class="field"><div class="lbl">Buchungsart</div><div class="sw"><select class="sel" id="book-direction" aria-label="Buchungsart" onchange="toggleBookingEditType(this.value)"><option value="expense"${income?'':' selected'}>Ausgabe</option><option value="income"${income?' selected':''}>Zahlungseingang</option></select></div></div><div class="field"><div class="lbl">Betrag</div><input class="inp" id="book-amount" aria-label="Betrag in Euro" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(b.betrag)}"/></div><div class="field" id="book-category-field"${income?' hidden':''}><div class="lbl">Kategorie</div><div class="sw"><select class="sel" id="book-cat" aria-label="Kategorie">${variableCategoryOptions(b.catId)}</select></div></div><div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="book-name" aria-label="Bezeichnung" maxlength="120" value="${esc(b.bezeichnung||'')}"/></div><div class="form-grid two"><div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" id="book-month" aria-label="Monat">${MF.map((x,i)=>`<option value="${i}"${i===b.month?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" id="book-year" aria-label="Jahr">${AppUiState.years().map(y=>`<option value="${y}"${y===b.year?' selected':''}>${y}</option>`).join('')}</select></div></div></div><div class="dialog-actions"><button class="btn btn-cancel" onclick="closeGenSheet()">Abbrechen</button><button class="btn btn-primary" onclick="saveBookingEdit(${esc(JSON.stringify(String(id)))})">Speichern</button></div>`);
}
function toggleBookingEditType(value){const field=document.getElementById('book-category-field');if(field)field.hidden=value==='income';}
function saveBookingEdit(id){
  const direction=document.getElementById('book-direction')?.value==='income'?'income':'expense',amount=Number(document.getElementById('book-amount')?.value),catId=direction==='income'?'':document.getElementById('book-cat')?.value;
  if(!Number.isFinite(amount)||amount<=0||(direction==='expense'&&!catId))return toast('Betrag und Kategorie prüfen','err');
  let updated;try{updated=BookingStore.update(id,{direction,betrag:amount,catId,bezeichnung:document.getElementById('book-name')?.value.trim()||(direction==='income'?'Zahlungseingang':''),month:Number(document.getElementById('book-month')?.value),year:Number(document.getElementById('book-year')?.value)});}
  catch(error){return toast(error?.message||'Buchung konnte nicht gespeichert werden','err');}
  if(!updated)return;
  closeGenSheet();render();toast('Buchung gespeichert');
}
function deleteBooking(id){
  const b=BookingStore.find(id);if(!b||!confirm('Diese Buchung wirklich löschen?'))return;
  if(!BookingStore.remove(id))return;
  render();toast('Buchung gelöscht');
}
function deleteFixedPosition(catId){
  const cat=PositionStore.findCategory(catId);if(!cat||!confirm(`„${cat.p}“ wirklich löschen?`))return;
  if(!PositionStore.removePosition(catId))return;
  render();toast('Position gelöscht');
}
