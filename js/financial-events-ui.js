/* Verwaltung der Finanzereignisse innerhalb der Prognose. */
'use strict';

function financialEventTypeOptions(selected){return Object.entries(FinancialEvents.TYPES).map(([key,label])=>`<option value="${key}"${key===selected?' selected':''}>${label}</option>`).join('');}
function financialEventYearOptions(selected){const start=Math.min(S.year,Number(selected)||S.year);return Array.from({length:31},(_,i)=>start+i).map(year=>`<option value="${year}"${year===Number(selected)?' selected':''}>${year}</option>`).join('');}
function financialEventsSorted(){return (S.financialEvents||[]).slice().sort((a,b)=>(Number(a.startYear)*12+Number(a.startMonth))-(Number(b.startYear)*12+Number(b.startMonth))||String(a.title||'').localeCompare(String(b.title||''),'de'));}

function openFinancialEventDialog(id=''){
  const existing=(S.financialEvents||[]).find(item=>item.id===id);
  const event=existing?FinancialEvents.normalizeEvent(existing):FinancialEvents.normalizeEvent({id:'',type:'oneTimeExpense',title:'',startYear:S.year,startMonth:S.month,amount:0,enabled:true});
  openGenSheet(`<div class="sheet-title">${id?'Finanzereignis bearbeiten':'Finanzereignis hinzufügen'}</div>
    <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="fe-title" value="${esc(event.title==='Einmalige Ausgabe'&&!id?'':event.title)}" placeholder="z. B. Autokauf"/></div>
    <div class="field"><div class="lbl">Typ</div><div class="sw"><select class="sel" id="fe-type">${financialEventTypeOptions(event.type)}</select></div></div>
    <div class="form-grid two"><div class="field"><div class="lbl">Betrag</div><input class="inp" id="fe-amount" type="number" min="0" step="0.01" value="${event.amount}"/></div><div class="field"><div class="lbl">Startmonat</div><div class="sw"><select class="sel" id="fe-month">${MF.map((name,i)=>`<option value="${i}"${i===event.startMonth?' selected':''}>${name}</option>`).join('')}</select></div></div></div>
    <div class="field"><div class="lbl">Startjahr</div><div class="sw"><select class="sel" id="fe-year">${financialEventYearOptions(event.startYear)}</select></div></div>
    <label class="compact-row" style="cursor:pointer"><div class="compact-main"><div class="compact-title">Ereignis aktiv</div><div class="compact-sub">Deaktivierte Ereignisse bleiben gespeichert, wirken aber nicht auf die Prognose.</div></div><input type="checkbox" id="fe-enabled" ${event.enabled?'checked':''}/></label>
    <div class="dialog-actions"><button class="btn btn-cancel" onclick="closeGenSheet()">Abbrechen</button><button class="btn btn-primary" onclick="saveFinancialEvent('${esc(id)}')">Speichern</button></div>`);
}

function saveFinancialEvent(id=''){
  const title=document.getElementById('fe-title')?.value.trim();const type=document.getElementById('fe-type')?.value;const amount=Number(document.getElementById('fe-amount')?.value);
  if(!title||!FinancialEvents.TYPE_KEYS.includes(type)||!Number.isFinite(amount)||amount<0)return toast('Bezeichnung, Typ und Betrag prüfen','err');
  const next=FinancialEvents.normalizeEvent({id:id||uid(),type,title,amount,startYear:Number(document.getElementById('fe-year')?.value||S.year),startMonth:Number(document.getElementById('fe-month')?.value||0),enabled:Boolean(document.getElementById('fe-enabled')?.checked)});
  S.financialEvents=(S.financialEvents||[]).filter(item=>item.id!==id);S.financialEvents.push(next);persist();closeGenSheet();render();toast('Finanzereignis gespeichert');
}
function toggleFinancialEvent(id){const event=(S.financialEvents||[]).find(item=>item.id===id);if(!event)return;event.enabled=event.enabled===false;persist();render();}
function deleteFinancialEvent(id){if(!confirm('Finanzereignis wirklich löschen?'))return;S.financialEvents=(S.financialEvents||[]).filter(item=>item.id!==id);persist();render();toast('Finanzereignis gelöscht');}
function duplicateFinancialEvent(id){const event=(S.financialEvents||[]).find(item=>item.id===id);if(!event)return;S.financialEvents.push({...event,id:uid(),title:`${event.title} Kopie`});persist();render();}
function financialEventsPanel(){
  const events=financialEventsSorted();
  const rows=events.length?events.map(event=>{const normalized=FinancialEvents.normalizeEvent(event);return `<div class="forecast-event-row ${normalized.enabled?'':'is-disabled'}"><div class="forecast-event-main"><strong>${esc(normalized.title)}</strong><span>${esc(FinancialEvents.TYPES[normalized.type])} · ${MF[normalized.startMonth]} ${normalized.startYear} · ${fmt(normalized.amount)}</span></div><div class="forecast-event-actions"><button class="btn btn-ghost" onclick="toggleFinancialEvent('${esc(normalized.id)}')">${normalized.enabled?'Deaktivieren':'Aktivieren'}</button><button class="btn btn-ghost" onclick="openFinancialEventDialog('${esc(normalized.id)}')">Bearbeiten</button><button class="btn btn-ghost" onclick="duplicateFinancialEvent('${esc(normalized.id)}')">Duplizieren</button><button class="btn btn-red" onclick="deleteFinancialEvent('${esc(normalized.id)}')">Löschen</button></div></div>`;}).join(''):`<div class="forecast-note">Noch keine Finanzereignisse hinterlegt.</div>`;
  return `<section class="card"><div class="compact-toolbar"><div><div class="card-title">Finanzereignisse</div><div class="field-hint">Einmalige oder dauerhafte Änderungen werden nur in der Prognose berücksichtigt.</div></div><button class="btn btn-primary" onclick="openFinancialEventDialog()">+ Ereignis</button></div><div class="forecast-event-list">${rows}</div></section>`;
}
