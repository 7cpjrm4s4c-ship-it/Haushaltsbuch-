/* Bedienung und Darstellung für Buchungen und Fixkosten. */
'use strict';

function bookingRow(b){
  const cat=S.cats.find(c=>c.id===b.catId);
  return `<div class="compact-row">
    <div class="compact-main">
      <div class="compact-title">${esc(b.bezeichnung||cat?.p||'Ausgabe')}</div>
      <div class="compact-sub">${esc(cat?.p||'Ohne Kategorie')} · ${new Date(b.ts).toLocaleDateString('de-DE')}</div>
    </div>
    <div class="compact-value k">-${fmt(b.betrag)}</div>
    <div class="booking-actions">
      <button class="row-edit-btn" aria-label="Buchung bearbeiten" onclick="openBookingDialog('${esc(b.id)}')">✎</button>
      <button class="row-edit-btn btn-danger-ghost" aria-label="Buchung löschen" onclick="deleteBooking('${esc(b.id)}')">×</button>
    </div>
  </div>`;
}

vAusgaben=function(){
  const y=S.year,mo=S.month;
  const bookings=getBuchungenForMonth(y,mo).slice().reverse();
  return `<div class="desktop-page-title">Ausgaben</div>
    <div class="card form-card">
      <div class="card-title">Variable Ausgabe erfassen</div>
      <div class="form-grid two">
        <div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" onchange="selMonth(Number(this.value))">${MF.map((x,i)=>`<option value="${i}"${i===mo?' selected':''}>${x}</option>`).join('')}</select></div></div>
        <div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" onchange="selYear(Number(this.value))">${S.years.map(x=>`<option value="${x}"${x===y?' selected':''}>${x}</option>`).join('')}</select></div></div>
      </div>
      <div class="field"><div class="lbl">Betrag</div><input class="inp" id="quick-amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00"/></div>
      <div class="field"><div class="lbl">Kategorie</div><div class="sw"><select class="sel" id="quick-cat"><option value="">Bitte auswählen</option>${variableCategoryOptions(S.ausgabeCatId)}</select></div></div>
      <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="quick-name" placeholder="z. B. REWE oder Freizeitpark"/></div>
      <div class="dialog-actions"><button class="btn btn-cancel" onclick="clearExpenseForm()">Abbrechen</button><button class="btn btn-green" onclick="saveStructuredExpense()">Speichern</button></div>
    </div>
    <div class="card list-card">
      <div class="list-head"><div class="card-title" style="margin:0">Buchungen</div><span class="muted">${MF[mo]} ${y} · ${bookings.length}</span></div>
      <div class="list-body">${bookings.map(bookingRow).join('')||'<div class="empty-state">Noch keine Buchungen.</div>'}</div>
    </div>`;
};

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
  Object.assign(b,{betrag:amount,catId,bezeichnung:document.getElementById('book-name')?.value.trim()||'',month:Number(document.getElementById('book-month')?.value),year:Number(document.getElementById('book-year')?.value)});
  persist();closeGenSheet();render();toast('Buchung gespeichert');
}

function deleteBooking(id){
  const b=S.buchungen.find(x=>x.id===id);
  if(!b||!confirm('Diese Buchung wirklich löschen?'))return;
  S.buchungen=S.buchungen.filter(x=>x.id!==id);
  persist();render();toast('Buchung gelöscht');
}

function intervalLabel(cat){
  const rule=findRecurringRule(cat.id);
  const match=INTERVALS.find(([months])=>months===Number(rule?.intervalMonths||1));
  return match?.[1]||'Monatlich';
}

fixedCostRows=function(categories){
  return `<div class="fixed-card-grid">${categories.map(cat=>`
    <article class="card fixed-position-card">
      <div class="fixed-position-head">
        <div><div class="fixed-position-title">${esc(cat.p)}</div><div class="fixed-position-meta">${esc(cat.g)} · ${TL[cat.t]} · ${intervalLabel(cat)}</div></div>
        <span class="tag tag-${cat.t}">${cat.t}</span>
      </div>
      <div class="fixed-position-amount ${RC[cat.t]||''}">${fmtS(gv(S.year,S.month,cat))}</div>
      <div class="card-actions">
        <button class="btn btn-ghost" onclick="openPositionDialog('${esc(cat.id)}')">Bearbeiten</button>
        <button class="btn btn-danger-ghost" onclick="deleteFixedPosition('${esc(cat.id)}')">Löschen</button>
      </div>
    </article>`).join('')}</div>`;
};

function deleteFixedPosition(catId){
  const cat=S.cats.find(c=>c.id===catId);
  if(!cat||!confirm(`„${cat.p}“ wirklich löschen?`))return;
  S.cats=S.cats.filter(c=>c.id!==catId);
  S.recurringRules=(S.recurringRules||[]).filter(r=>r.catId!==catId);
  S.annualAdjustments=(S.annualAdjustments||[]).filter(a=>a.catId!==catId);
  S.percentageAdjustments=(S.percentageAdjustments||[]).filter(a=>a.catId!==catId);
  for(const key of Object.keys(S.data||{})){if(key.endsWith(`_${catId}`))delete S.data[key];}
  delete S.budgets?.[catId];
  persist();render();toast('Position gelöscht');
}
