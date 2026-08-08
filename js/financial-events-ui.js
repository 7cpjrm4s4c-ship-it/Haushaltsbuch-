/* Verwaltung der Finanzereignisse innerhalb der Prognose. */
'use strict';

function financialEventTypeOptions(selected){return Object.entries(FinancialEvents.TYPES).map(([key,label])=>`<option value="${key}"${key===selected?' selected':''}>${label}</option>`).join('');}
function financialEventYearOptions(selected,allowEmpty=false){const start=Math.min(S.year,Number(selected)||S.year),options=Array.from({length:41},(_,i)=>start+i).map(year=>`<option value="${year}"${year===Number(selected)?' selected':''}>${year}</option>`).join('');return allowEmpty?`<option value=""${selected===null||selected===undefined?' selected':''}>Unbegrenzt</option>${options}`:options;}
function financialEventsSorted(){return (S.financialEvents||[]).slice().sort((a,b)=>(Number(a.startYear)*12+Number(a.startMonth))-(Number(b.startYear)*12+Number(b.startMonth))||String(a.title||'').localeCompare(String(b.title||''),'de'));}
function financialEventLoanOptions(selected){return (S.kredite||[]).map(loan=>`<option value="${esc(loan.id)}"${loan.id===selected?' selected':''}>${esc(loan.n)}</option>`).join('');}
function financialEventIsDuration(type){return ['incomeDelta','expenseDelta'].includes(type);}

function updateFinancialEventDialogFields(){
  const type=document.getElementById('fe-type')?.value;
  const duration=document.getElementById('fe-duration-fields');if(duration)duration.hidden=!financialEventIsDuration(type);
  const loan=document.getElementById('fe-loan-field');if(loan)loan.hidden=type!=='specialRepayment';
}

function openFinancialEventDialog(id=''){
  const existing=(S.financialEvents||[]).find(item=>item.id===id);
  const event=existing?FinancialEvents.normalizeEvent(existing):FinancialEvents.normalizeEvent({id:'',type:'oneTimeExpense',title:'',startYear:S.year,startMonth:S.month,amount:0,enabled:true});
  openGenSheet(`<div class="sheet-title">${id?'Finanzereignis bearbeiten':'Finanzereignis hinzufügen'}</div>
    <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="fe-title" value="${esc(event.title==='Einmalige Ausgabe'&&!id?'':event.title)}" placeholder="z. B. Autokauf"/></div>
    <div class="field"><div class="lbl">Typ</div><div class="sw"><select class="sel" id="fe-type" onchange="updateFinancialEventDialogFields()">${financialEventTypeOptions(event.type)}</select></div></div>
    <div class="form-grid two"><div class="field"><div class="lbl">Betrag</div><input class="inp" id="fe-amount" type="number" min="0" step="0.01" value="${event.amount}"/></div><div class="field"><div class="lbl">Startmonat</div><div class="sw"><select class="sel" id="fe-month">${MF.map((name,i)=>`<option value="${i}"${i===event.startMonth?' selected':''}>${name}</option>`).join('')}</select></div></div></div>
    <div class="field"><div class="lbl">Startjahr</div><div class="sw"><select class="sel" id="fe-year">${financialEventYearOptions(event.startYear)}</select></div></div>
    <div id="fe-duration-fields" ${financialEventIsDuration(event.type)?'':'hidden'}><div class="annual-note">Optionales Enddatum. Ohne Enddatum wirkt die Änderung dauerhaft weiter.</div><div class="form-grid two"><div class="field"><div class="lbl">Endmonat</div><div class="sw"><select class="sel" id="fe-end-month">${MF.map((name,i)=>`<option value="${i}"${i===(event.endMonth??11)?' selected':''}>${name}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Endjahr</div><div class="sw"><select class="sel" id="fe-end-year">${financialEventYearOptions(event.endYear,true)}</select></div></div></div></div>
    <div class="field" id="fe-loan-field" ${event.type==='specialRepayment'?'':'hidden'}><div class="lbl">Kredit</div><div class="sw"><select class="sel" id="fe-loan"><option value="">Kredit auswählen</option>${financialEventLoanOptions(String(event.metadata?.loanId||''))}</select></div><div class="field-hint">Die Sondertilgung wirkt nur in der Prognose und verändert den gespeicherten Kredit nicht.</div></div>
    <label class="compact-row" style="cursor:pointer"><div class="compact-main"><div class="compact-title">Ereignis aktiv</div><div class="compact-sub">Deaktivierte Ereignisse bleiben gespeichert, wirken aber nicht auf die Prognose.</div></div><input type="checkbox" id="fe-enabled" ${event.enabled?'checked':''}/></label>
    <div class="dialog-actions"><button class="btn btn-cancel" onclick="closeGenSheet()">Abbrechen</button><button class="btn btn-primary" onclick="saveFinancialEvent('${esc(id)}')">Speichern</button></div>`);
}

function saveFinancialEvent(id=''){
  const title=document.getElementById('fe-title')?.value.trim(),type=document.getElementById('fe-type')?.value,amount=Number(document.getElementById('fe-amount')?.value);
  if(!title||!FinancialEvents.TYPE_KEYS.includes(type)||!Number.isFinite(amount)||amount<0)return toast('Bezeichnung, Typ und Betrag prüfen','err');
  const startYear=Number(document.getElementById('fe-year')?.value||S.year),startMonth=Number(document.getElementById('fe-month')?.value||0);
  let endYear=null,endMonth=null;
  if(financialEventIsDuration(type)){
    const rawEnd=document.getElementById('fe-end-year')?.value;
    if(rawEnd!==''){endYear=Number(rawEnd);endMonth=Number(document.getElementById('fe-end-month')?.value||11);if(endYear*12+endMonth<startYear*12+startMonth)return toast('Enddatum liegt vor dem Startdatum','err');}
  }
  const loanId=type==='specialRepayment'?String(document.getElementById('fe-loan')?.value||''):'';
  if(type==='specialRepayment'&&!loanId)return toast('Bitte einen Kredit auswählen','err');
  const next=FinancialEvents.normalizeEvent({id:id||uid(),type,title,amount,startYear,startMonth,endYear,endMonth,enabled:Boolean(document.getElementById('fe-enabled')?.checked),metadata:loanId?{loanId}:{}});
  S.financialEvents=(S.financialEvents||[]).filter(item=>item.id!==id);S.financialEvents.push(next);persist();closeGenSheet();render();toast('Finanzereignis gespeichert');
}
function toggleFinancialEvent(id){const event=(S.financialEvents||[]).find(item=>item.id===id);if(!event)return;event.enabled=event.enabled===false;persist();render();}
function deleteFinancialEvent(id){if(!confirm('Finanzereignis wirklich löschen?'))return;S.financialEvents=(S.financialEvents||[]).filter(item=>item.id!==id);persist();render();toast('Finanzereignis gelöscht');}
function duplicateFinancialEvent(id){const event=(S.financialEvents||[]).find(item=>item.id===id);if(!event)return;S.financialEvents.push({...event,id:uid(),title:`${event.title} Kopie`,metadata:{...(event.metadata||{})}});persist();render();}
function financialEventPeriod(event){if(FinancialEvents.ONE_TIME_TYPES.has(event.type))return `${MF[event.startMonth]} ${event.startYear}`;const end=event.endYear===null?'unbegrenzt':`${MF[event.endMonth??11]} ${event.endYear}`;return `${MF[event.startMonth]} ${event.startYear} – ${end}`;}
function financialEventsPanel(){
  const events=financialEventsSorted();
  const rows=events.length?events.map(raw=>{const event=FinancialEvents.normalizeEvent(raw),loan=event.type==='specialRepayment'?(S.kredite||[]).find(item=>item.id===event.metadata?.loanId):null;return `<div class="forecast-event-row ${event.enabled?'':'is-disabled'}"><div class="forecast-event-main"><strong>${esc(event.title)}</strong><span>${esc(FinancialEvents.TYPES[event.type])} · ${financialEventPeriod(event)} · ${fmt(event.amount)}${loan?` · ${esc(loan.n)}`:''}</span></div><div class="forecast-event-actions"><button class="btn btn-ghost" onclick="toggleFinancialEvent('${esc(event.id)}')">${event.enabled?'Deaktivieren':'Aktivieren'}</button><button class="btn btn-ghost" onclick="openFinancialEventDialog('${esc(event.id)}')">Bearbeiten</button><button class="btn btn-ghost" onclick="duplicateFinancialEvent('${esc(event.id)}')">Duplizieren</button><button class="btn btn-red" onclick="deleteFinancialEvent('${esc(event.id)}')">Löschen</button></div></div>`;}).join(''):`<div class="forecast-note">Noch keine Finanzereignisse hinterlegt.</div>`;
  return `<section class="card"><div class="compact-toolbar"><div><div class="card-title">Finanzereignisse</div><div class="field-hint">Einmalige und zeitlich begrenzte Änderungen sowie Sondertilgungen werden ausschließlich in der Prognose berücksichtigt.</div></div><button class="btn btn-primary" onclick="openFinancialEventDialog()">+ Ereignis</button></div><div class="forecast-event-list">${rows}</div></section>`;
}

if(typeof removeLoanCategory==='function'){
  const removeLoanCategoryBase=removeLoanCategory;
  removeLoanCategory=function(loanId){
    removeLoanCategoryBase(loanId);
    S.financialEvents=(S.financialEvents||[]).filter(event=>!(event.type==='specialRepayment'&&String(event.metadata?.loanId||'')===String(loanId||'')));
  };
}
