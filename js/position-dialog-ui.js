/* UI fuer feste Positionen und Planungsanpassungen. State-Zugriffe nur ueber PositionStore. */
'use strict';

const POSITION_INTERVALS=[[1,'Monatlich'],[3,'Vierteljährlich'],[4,'Dritteljährlich'],[6,'Halbjährlich'],[12,'Jährlich']];
function positionMonthNo(year,month){return Number(year)*12+Number(month);}
function positionYearOptions(selected,startYear){
  const current=PositionStore.currentPeriod();const start=Math.min(Number(startYear??current.year),Number(selected)||current.year);
  const years=new Set(PositionStore.years().map(Number));for(let year=start;year<=start+20;year++)years.add(year);
  return [...years].sort((a,b)=>a-b).map(year=>`<option value="${year}"${Number(selected)===year?' selected':''}>${year}</option>`).join('');
}
function positionEndYearOptions(startYear,endYear){const years=new Set(PositionStore.years().map(Number));for(let year=startYear;year<=startYear+20;year++)years.add(year);if(Number.isFinite(Number(endYear)))years.add(Number(endYear));return [...years].sort((a,b)=>a-b);}
function openPositionDialog(catId=''){
  const current=PositionStore.currentPeriod();
  const cat=PositionStore.findCategory(catId)||{id:'',p:'',g:'Wohnen',t:'F',d:0};
  const rule=PositionStore.recurringRule(catId),pct=PositionStore.percentageAdjustment(catId),fixedAdj=PositionStore.amountAdjustment(catId),once=PositionStore.oneTimeEntry(catId);
  const groups=[...new Set(PositionStore.fixedCategories().map(item=>item.g))].sort((a,b)=>String(a).localeCompare(String(b),'de',{sensitivity:'base'}));
  const pending=PositionStore.pendingCategory();if(pending&&!groups.includes(pending))groups.push(pending);groups.sort((a,b)=>String(a).localeCompare(String(b),'de',{sensitivity:'base'}));
  const startYear=Number(rule?.startYear??current.year),endYear=rule?.endYear,endMonth=rule?.endMonth,endEnabled=endYear!==null&&endYear!==undefined&&Number.isFinite(Number(endYear));
  const endYears=positionEndYearOptions(startYear,endYear);
  openGenSheet(`<div class="sheet-title">${catId?'Position bearbeiten':'Position hinzufügen'}</div>
    <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="pos-name" value="${esc(cat.p)}" placeholder="z. B. Kindergarten"/></div>
    <div class="field"><div class="lbl">Kategorie</div><div class="sw"><select class="sel" id="pos-group">${groups.map(group=>`<option value="${esc(group)}"${group===cat.g||(!catId&&group===pending)?' selected':''}>${esc(group)}</option>`).join('')}<option value="__new">Neue Kategorie…</option></select></div><input class="inp mt8" id="pos-group-new" placeholder="Neue Kategorie"/></div>
    <div class="form-grid two"><div class="field"><div class="lbl">Bereich</div><div class="sw"><select class="sel" id="pos-type">${[['E','Einnahmen'],['F','Fixkosten'],['K','Kredite'],['S','Sparen']].map(([value,label])=>`<option value="${value}"${value===cat.t?' selected':''}>${label}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Betrag</div><input class="inp" id="pos-amount" type="number" step="0.01" min="0" value="${rule?.amount??cat.d??0}"/></div></div>
    <div class="form-grid two"><div class="field"><div class="lbl">Intervall</div><div class="sw"><select class="sel" id="pos-interval">${POSITION_INTERVALS.map(([value,label])=>`<option value="${value}"${Number(rule?.intervalMonths||1)===value?' selected':''}>${label}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Startmonat</div><div class="sw"><select class="sel" id="pos-start-month">${MF.map((name,index)=>`<option value="${index}"${Number(rule?.startMonth??current.month)===index?' selected':''}>${name}</option>`).join('')}</select></div></div></div>
    <div class="field"><div class="lbl">Startjahr</div><div class="sw"><select class="sel" id="pos-start-year">${positionYearOptions(rule?.startYear??current.year,current.year)}</select></div></div>
    <div class="sheet-divider"></div><div class="card-title">Optionale Laufzeitbegrenzung</div>
    <label class="compact-row" style="cursor:pointer;margin-bottom:12px"><div class="compact-main"><div class="compact-title">Endmonat festlegen</div><div class="compact-sub">Danach wird die Position nicht mehr berücksichtigt.</div></div><input id="pos-end-enabled" type="checkbox" ${endEnabled?'checked':''} onchange="togglePositionEndDate(this.checked)"/></label>
    <div id="pos-end-fields" class="form-grid two" ${endEnabled?'':'hidden'}><div class="field"><div class="lbl">Endmonat</div><div class="sw"><select class="sel" id="pos-end-month">${MF.map((name,index)=>`<option value="${index}"${Number(endMonth??11)===index?' selected':''}>${name}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Endjahr</div><div class="sw"><select class="sel" id="pos-end-year">${endYears.map(year=>`<option value="${year}"${Number(endYear??startYear)===year?' selected':''}>${year}</option>`).join('')}</select></div></div></div>
    <div class="sheet-divider"></div><div class="card-title">Prozentuale Erhöhung</div>
    <div class="form-grid two"><div class="field"><div class="lbl">Jährliche Erhöhung ab Monat</div><div class="sw"><select class="sel" id="pos-inc-month"><option value="">Keine</option>${MF.map((name,index)=>`<option value="${index}"${pct&&Number(pct.month)===index?' selected':''}>${name}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Prozent</div><input class="inp" id="pos-inc-percent" type="number" step="0.1" value="${pct?.percent??''}" placeholder="z. B. 3"/></div></div>
    <div class="field"><div class="lbl">Startjahr der jährlichen Erhöhung</div><div class="sw"><select class="sel" id="pos-inc-year">${positionYearOptions(pct?.year??current.year,current.year)}</select></div></div>
    <div class="sheet-divider"></div><div class="card-title">Feste Betragserhöhung</div>
    <div class="form-grid two"><div class="field"><div class="lbl">Erhöhung ab Monat</div><div class="sw"><select class="sel" id="pos-fixed-inc-month"><option value="">Keine</option>${MF.map((name,index)=>`<option value="${index}"${fixedAdj&&Number(fixedAdj.month)===index?' selected':''}>${name}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Betrag (€)</div><input class="inp" id="pos-fixed-inc-amount" type="number" step="0.01" value="${fixedAdj?.amount??''}" placeholder="z. B. 20"/></div></div>
    <div class="field"><div class="lbl">Startjahr</div><div class="sw"><select class="sel" id="pos-fixed-inc-year">${positionYearOptions(fixedAdj?.year??current.year,current.year)}</select></div></div>
    <div class="sheet-divider"></div><div class="card-title">Einmalzahlung</div>
    <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="pos-once-label" value="${esc(once?.label||'')}" placeholder="z. B. Bonuszahlung"/></div>
    <div class="form-grid two"><div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" id="pos-once-month"><option value="">Keine</option>${MF.map((name,index)=>`<option value="${index}"${once&&Number(once.month)===index?' selected':''}>${name}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Betrag (€)</div><input class="inp" id="pos-once-amount" type="number" step="0.01" value="${once?.amount??''}" placeholder="z. B. 1600"/></div></div>
    <div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" id="pos-once-year">${positionYearOptions(once?.year??current.year,current.year)}</select></div></div>
    <div class="dialog-actions"><button class="btn btn-cancel" onclick="closeGenSheet()">Abbrechen</button><button class="btn btn-primary" onclick="savePositionDialog('${esc(catId)}')">Speichern</button></div>`);
}
function togglePositionEndDate(enabled){const fields=document.getElementById('pos-end-fields');if(fields)fields.hidden=!enabled;}
function savePositionDialog(catId){
  const current=PositionStore.currentPeriod();
  const name=document.getElementById('pos-name')?.value.trim(),amount=Number(document.getElementById('pos-amount')?.value),type=document.getElementById('pos-type')?.value;
  const chosen=document.getElementById('pos-group')?.value,category=chosen==='__new'?document.getElementById('pos-group-new')?.value.trim():chosen;
  const startMonth=Number(document.getElementById('pos-start-month')?.value||0),startYear=Number(document.getElementById('pos-start-year')?.value||current.year),endEnabled=Boolean(document.getElementById('pos-end-enabled')?.checked);
  const endMonth=endEnabled?Number(document.getElementById('pos-end-month')?.value):null,endYear=endEnabled?Number(document.getElementById('pos-end-year')?.value):null;
  if(!name||!category||!type||!Number.isFinite(amount)||amount<0)return toast('Bezeichnung, Kategorie und Betrag prüfen','err');
  if(endEnabled&&positionMonthNo(endYear,endMonth)<positionMonthNo(startYear,startMonth))return toast('Endmonat darf nicht vor dem Startmonat liegen','err');
  const incMonth=document.getElementById('pos-inc-month')?.value,percent=Number(document.getElementById('pos-inc-percent')?.value);
  const fixedMonth=document.getElementById('pos-fixed-inc-month')?.value,fixedAmount=Number(document.getElementById('pos-fixed-inc-amount')?.value);
  const oneMonth=document.getElementById('pos-once-month')?.value,oneAmount=Number(document.getElementById('pos-once-amount')?.value);
  PositionStore.savePosition({catId,name,amount,type,category,intervalMonths:Number(document.getElementById('pos-interval')?.value||1),startMonth,startYear,endMonth,endYear,
    percentage:incMonth!==''&&Number.isFinite(percent)&&percent!==0?{month:Number(incMonth),year:Number(document.getElementById('pos-inc-year')?.value||current.year),percent}:null,
    amountAdjustment:fixedMonth!==''&&Number.isFinite(fixedAmount)&&fixedAmount!==0?{month:Number(fixedMonth),year:Number(document.getElementById('pos-fixed-inc-year')?.value||current.year),amount:fixedAmount}:null,
    oneTime:oneMonth!==''&&Number.isFinite(oneAmount)&&oneAmount!==0?{month:Number(oneMonth),year:Number(document.getElementById('pos-once-year')?.value||current.year),amount:oneAmount,label:document.getElementById('pos-once-label')?.value.trim()||'Einmalzahlung'}:null});
  closeGenSheet();render();toast('Position gespeichert');
}
