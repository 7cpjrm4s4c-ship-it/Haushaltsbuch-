/* Bearbeiten und Löschen von Buchungen und festen Positionen. */
'use strict';

function openBookingDialog(id){
  const b=S.buchungen.find(x=>x.id===id);
  if(!b)return;
  openGenSheet(`<div class="sheet-title">Ausgabe bearbeiten</div>
    <div class="field"><div class="lbl">Betrag</div><input class="inp" id="book-amount" type="number" min="0" step="0.01" value="${Number(b.betrag)}"/></div>
    <div class="field"><div class="lbl">Kategorie</div><div class="sw"><select class="sel" id="book-cat">${variableCategoryOptions(b.catId)}</select></div></div>
    <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="book-name" value="${esc(b.bezeichnung||'')}"/></div>
    <div class="form-grid two">
      <div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" id="book-month">${MF.map((x,i)=>`<option value="${i}"${i===b.month?' selected':''}>${x}</option>`).join('')}</select></div></div>
      <div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" id="book-year">${S.years.map(y=>`<option value="${y}"${y===b.year?' selected':''}>${y}</option>`).join('')}</select></div></div>
    </div>
    <div class="dialog-actions"><button class="btn btn-cancel" onclick="closeGenSheet()">Abbrechen</button><button class="btn btn-primary" onclick="saveBookingEdit('${esc(id)}')">Speichern</button></div>`);
}

function saveBookingEdit(id){
  const b=S.buchungen.find(x=>x.id===id);
  if(!b)return;
  const amount=Number(document.getElementById('book-amount')?.value);
  const catId=document.getElementById('book-cat')?.value;
  if(!Number.isFinite(amount)||amount<=0||!catId)return toast('Betrag und Kategorie prüfen','err');
  Object.assign(b,{
    betrag:amount,
    catId,
    bezeichnung:document.getElementById('book-name')?.value.trim()||'',
    month:Number(document.getElementById('book-month')?.value),
    year:Number(document.getElementById('book-year')?.value),
  });
  persist();
  closeGenSheet();
  render();
  toast('Buchung gespeichert');
}

function deleteBooking(id){
  const b=S.buchungen.find(x=>x.id===id);
  if(!b||!confirm('Diese Buchung wirklich löschen?'))return;
  S.buchungen=S.buchungen.filter(x=>x.id!==id);
  persist();
  render();
  toast('Buchung gelöscht');
}

function deleteFixedPosition(catId){
  const cat=S.cats.find(c=>c.id===catId);
  if(!cat||!confirm(`„${cat.p}“ wirklich löschen?`))return;
  S.cats=S.cats.filter(c=>c.id!==catId);
  S.recurringRules=(S.recurringRules||[]).filter(r=>r.catId!==catId);
  S.annualAdjustments=(S.annualAdjustments||[]).filter(a=>a.catId!==catId);
  S.percentageAdjustments=(S.percentageAdjustments||[]).filter(a=>a.catId!==catId);
  for(const key of Object.keys(S.data||{})){
    if(key.endsWith(`_${catId}`))delete S.data[key];
  }
  if(S.budgets)delete S.budgets[catId];
  persist();
  render();
  toast('Position gelöscht');
}
