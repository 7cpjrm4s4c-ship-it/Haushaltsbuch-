/* Gemeinsame Eingabehilfen und mobile Bedienung. */
'use strict';

const INTERVALS = [
  [1,'Monatlich'],
  [3,'Vierteljährlich'],
  [4,'Dritteljährlich'],
  [6,'Halbjährlich'],
  [12,'Jährlich']
];

function monthNo(y,m){
  return Number(y)*12+Number(m);
}

function variableCategoryOptions(selected=''){
  return S.cats
    .filter(c=>c.t==='V')
    .slice()
    .sort((a,b)=>String(a.p||'').localeCompare(String(b.p||''),'de',{sensitivity:'base'}))
    .map(c=>`<option value="${esc(c.id)}"${c.id===selected?' selected':''}>${esc(c.p)}</option>`)
    .join('');
}

function clearExpenseForm(){
  ['quick-amount','quick-name','quick-cat'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.value='';
  });
}

function findRecurringRule(catId){
  return (S.recurringRules||[]).find(r=>r.catId===catId)||null;
}

function latestPercent(catId){
  return (S.percentageAdjustments||[])
    .filter(a=>a.catId===catId)
    .sort((a,b)=>monthNo(b.year,b.month)-monthNo(a.year,a.month))[0]||null;
}

function latestAmountAdjustment(catId){
  return (S.amountAdjustments||[])
    .filter(a=>a.catId===catId)
    .sort((a,b)=>monthNo(b.year,b.month)-monthNo(a.year,a.month))[0]||null;
}

function latestOneTimeEntry(catId){
  return (S.oneTimeEntries||[])
    .filter(a=>a.catId===catId)
    .sort((a,b)=>monthNo(b.year,b.month)-monthNo(a.year,a.month))[0]||null;
}

function positionEndYearOptions(startYear,endYear){
  const years=new Set((S.years||[]).map(Number));
  for(let year=startYear;year<=startYear+20;year++)years.add(year);
  if(Number.isFinite(Number(endYear)))years.add(Number(endYear));
  return [...years].sort((a,b)=>a-b);
}

function planningYearOptions(selected){
  const start=Math.min(S.year,Number(selected)||S.year);
  const years=new Set((S.years||[]).map(Number));
  for(let year=start;year<=start+20;year++)years.add(year);
  return [...years].sort((a,b)=>a-b).map(y=>`<option value="${y}"${Number(selected)===y?' selected':''}>${y}</option>`).join('');
}

function openPositionDialog(catId=''){
  const cat=S.cats.find(c=>c.id===catId)||{id:'',p:'',g:'Wohnen',t:'F',d:0};
  const rule=findRecurringRule(catId);
  const pct=latestPercent(catId);
  const fixedAdj=latestAmountAdjustment(catId);
  const once=latestOneTimeEntry(catId);
  const groups=[...new Set(fixedCostCategories().map(c=>c.g))]
    .sort((a,b)=>String(a).localeCompare(String(b),'de',{sensitivity:'base'}));
  const pending=S.ui?.pendingFixedCategory||'';
  if(pending&&!groups.includes(pending))groups.push(pending);
  groups.sort((a,b)=>String(a).localeCompare(String(b),'de',{sensitivity:'base'}));

  const startYear=Number(rule?.startYear??S.year);
  const endYear=rule?.endYear;
  const endMonth=rule?.endMonth;
  const endEnabled=endYear!==null&&endYear!==undefined&&Number.isFinite(Number(endYear));
  const endYears=positionEndYearOptions(startYear,endYear);

  openGenSheet(`<div class="sheet-title">${catId?'Position bearbeiten':'Position hinzufügen'}</div>
    <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="pos-name" value="${esc(cat.p)}" placeholder="z. B. Kindergarten"/></div>
    <div class="field"><div class="lbl">Kategorie</div><div class="sw"><select class="sel" id="pos-group">${groups.map(g=>`<option value="${esc(g)}"${g===cat.g||(!catId&&g===pending)?' selected':''}>${esc(g)}</option>`).join('')}<option value="__new">Neue Kategorie…</option></select></div><input class="inp mt8" id="pos-group-new" placeholder="Neue Kategorie"/></div>
    <div class="form-grid two"><div class="field"><div class="lbl">Bereich</div><div class="sw"><select class="sel" id="pos-type">${[['E','Einnahmen'],['F','Fixkosten'],['K','Kredite'],['S','Sparen']].map(([v,l])=>`<option value="${v}"${v===cat.t?' selected':''}>${l}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Betrag</div><input class="inp" id="pos-amount" type="number" step="0.01" min="0" value="${rule?.amount??cat.d??0}"/></div></div>
    <div class="form-grid two"><div class="field"><div class="lbl">Intervall</div><div class="sw"><select class="sel" id="pos-interval">${INTERVALS.map(([v,l])=>`<option value="${v}"${Number(rule?.intervalMonths||1)===v?' selected':''}>${l}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Startmonat</div><div class="sw"><select class="sel" id="pos-start-month">${MF.map((x,i)=>`<option value="${i}"${Number(rule?.startMonth??S.month)===i?' selected':''}>${x}</option>`).join('')}</select></div></div></div>
    <div class="field"><div class="lbl">Startjahr</div><div class="sw"><select class="sel" id="pos-start-year">${planningYearOptions(rule?.startYear??S.year)}</select></div></div>

    <div class="sheet-divider"></div><div class="card-title">Optionale Laufzeitbegrenzung</div>
    <label class="compact-row" style="cursor:pointer;margin-bottom:12px"><div class="compact-main"><div class="compact-title">Endmonat festlegen</div><div class="compact-sub">Danach wird die Position nicht mehr berücksichtigt.</div></div><input id="pos-end-enabled" type="checkbox" ${endEnabled?'checked':''} onchange="togglePositionEndDate(this.checked)"/></label>
    <div id="pos-end-fields" class="form-grid two" ${endEnabled?'':'hidden'}><div class="field"><div class="lbl">Endmonat</div><div class="sw"><select class="sel" id="pos-end-month">${MF.map((name,index)=>`<option value="${index}"${Number(endMonth??11)===index?' selected':''}>${name}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Endjahr</div><div class="sw"><select class="sel" id="pos-end-year">${endYears.map(y=>`<option value="${y}"${Number(endYear??startYear)===y?' selected':''}>${y}</option>`).join('')}</select></div></div></div>

    <div class="sheet-divider"></div><div class="card-title">Prozentuale Erhöhung</div>
    <div class="form-grid two"><div class="field"><div class="lbl">Jährliche Erhöhung ab Monat</div><div class="sw"><select class="sel" id="pos-inc-month"><option value="">Keine</option>${MF.map((x,i)=>`<option value="${i}"${pct&&Number(pct.month)===i?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Prozent</div><input class="inp" id="pos-inc-percent" type="number" step="0.1" value="${pct?.percent??''}" placeholder="z. B. 3"/></div></div>
    <div class="annual-note">Der Prozentwert wird ab dem gewählten Monat in jedem folgenden Jahr erneut angewendet.</div>
    <div class="field"><div class="lbl">Startjahr der jährlichen Erhöhung</div><div class="sw"><select class="sel" id="pos-inc-year">${planningYearOptions(pct?.year??S.year)}</select></div></div>

    <div class="sheet-divider"></div><div class="card-title">Feste Betragserhöhung</div>
    <div class="form-grid two"><div class="field"><div class="lbl">Erhöhung ab Monat</div><div class="sw"><select class="sel" id="pos-fixed-inc-month"><option value="">Keine</option>${MF.map((x,i)=>`<option value="${i}"${fixedAdj&&Number(fixedAdj.month)===i?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Betrag (€)</div><input class="inp" id="pos-fixed-inc-amount" type="number" step="0.01" value="${fixedAdj?.amount??''}" placeholder="z. B. 20"/></div></div>
    <div class="field"><div class="lbl">Startjahr</div><div class="sw"><select class="sel" id="pos-fixed-inc-year">${planningYearOptions(fixedAdj?.year??S.year)}</select></div></div>
    <div class="annual-note">Der Betrag wird ab dem gewählten Monat dauerhaft auf den Grundbetrag aufgeschlagen, z. B. +20 € ab September 2027.</div>

    <div class="sheet-divider"></div><div class="card-title">Einmalzahlung</div>
    <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="pos-once-label" value="${esc(once?.label||'')}" placeholder="z. B. Bonuszahlung"/></div>
    <div class="form-grid two"><div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" id="pos-once-month"><option value="">Keine</option>${MF.map((x,i)=>`<option value="${i}"${once&&Number(once.month)===i?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Betrag (€)</div><input class="inp" id="pos-once-amount" type="number" step="0.01" value="${once?.amount??''}" placeholder="z. B. 1600"/></div></div>
    <div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" id="pos-once-year">${planningYearOptions(once?.year??S.year)}</select></div></div>
    <div class="annual-note">Die Einmalzahlung wird nur in diesem Monat zusätzlich berücksichtigt.</div>

    <div class="dialog-actions"><button class="btn btn-cancel" onclick="closeGenSheet()">Abbrechen</button><button class="btn btn-primary" onclick="savePositionDialog('${esc(catId)}')">Speichern</button></div>`);
}

function togglePositionEndDate(enabled){
  const fields=document.getElementById('pos-end-fields');
  if(fields)fields.hidden=!enabled;
}

function applyFixedSearch(){
  S.ui.fixedSearch=document.getElementById('fixed-search')?.value||'';
  render();
}

(function enableSwipeClose(){
  let startY=0,currentSheet=null;
  document.addEventListener('touchstart',e=>{
    const sheet=e.target.closest('.sheet');
    if(!sheet)return;
    startY=e.touches[0].clientY;
    currentSheet=sheet;
  },{passive:true});
  document.addEventListener('touchend',e=>{
    if(!currentSheet)return;
    const dy=e.changedTouches[0].clientY-startY;
    if(dy>90)currentSheet.closest('.overlay')?.classList.remove('open');
    currentSheet=null;
  },{passive:true});
})();
