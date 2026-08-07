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

function openPositionDialog(catId=''){
  const cat=S.cats.find(c=>c.id===catId)||{id:'',p:'',g:'Wohnen',t:'F',d:0};
  const rule=findRecurringRule(catId);
  const pct=latestPercent(catId);
  const groups=[...new Set(fixedCostCategories().map(c=>c.g))]
    .sort((a,b)=>String(a).localeCompare(String(b),'de',{sensitivity:'base'}));

  openGenSheet(`<div class="sheet-title">${catId?'Position bearbeiten':'Position hinzufügen'}</div>
    <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="pos-name" value="${esc(cat.p)}" placeholder="z. B. Kindergarten"/></div>
    <div class="field"><div class="lbl">Gruppe</div><div class="sw"><select class="sel" id="pos-group">${groups.map(g=>`<option value="${esc(g)}"${g===cat.g?' selected':''}>${esc(g)}</option>`).join('')}<option value="__new">Neue Gruppe…</option></select></div><input class="inp mt8" id="pos-group-new" placeholder="Neue Gruppe"/></div>
    <div class="form-grid two"><div class="field"><div class="lbl">Bereich</div><div class="sw"><select class="sel" id="pos-type">${[['E','Einnahmen'],['F','Fixkosten'],['K','Kredite'],['S','Sparen']].map(([v,l])=>`<option value="${v}"${v===cat.t?' selected':''}>${l}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Betrag</div><input class="inp" id="pos-amount" type="number" step="0.01" min="0" value="${rule?.amount??cat.d??0}"/></div></div>
    <div class="form-grid two"><div class="field"><div class="lbl">Intervall</div><div class="sw"><select class="sel" id="pos-interval">${INTERVALS.map(([v,l])=>`<option value="${v}"${Number(rule?.intervalMonths||1)===v?' selected':''}>${l}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Startmonat</div><div class="sw"><select class="sel" id="pos-start-month">${MF.map((x,i)=>`<option value="${i}"${Number(rule?.startMonth??S.month)===i?' selected':''}>${x}</option>`).join('')}</select></div></div></div>
    <div class="field"><div class="lbl">Startjahr</div><div class="sw"><select class="sel" id="pos-start-year">${S.years.map(y=>`<option value="${y}"${Number(rule?.startYear??S.year)===y?' selected':''}>${y}</option>`).join('')}</select></div></div>
    <div class="sheet-divider"></div><div class="card-title">Optionale Steigerung</div>
    <div class="form-grid two"><div class="field"><div class="lbl">Ab Monat</div><div class="sw"><select class="sel" id="pos-inc-month"><option value="">Keine</option>${MF.map((x,i)=>`<option value="${i}"${pct&&Number(pct.month)===i?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Prozent</div><input class="inp" id="pos-inc-percent" type="number" step="0.1" value="${pct?.percent??''}" placeholder="z. B. 3"/></div></div>
    <div class="field"><div class="lbl">Jahr der Steigerung</div><div class="sw"><select class="sel" id="pos-inc-year">${S.years.map(y=>`<option value="${y}"${Number(pct?.year??S.year)===y?' selected':''}>${y}</option>`).join('')}</select></div></div>
    <div class="dialog-actions"><button class="btn btn-cancel" onclick="closeGenSheet()">Abbrechen</button><button class="btn btn-primary" onclick="savePositionDialog('${esc(catId)}')">Speichern</button></div>`);
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
