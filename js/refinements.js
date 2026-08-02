/* Letzte fachliche und UX-Korrekturen. Dashboard-Darstellung bleibt unverändert. */
'use strict';

const VARIABLE_CATEGORY_NAMES = ['Freizeit','Auto','Kinder','Lebensmittel','Drogerie','Urlaub','Kleidung','Online'];
const INTERVALS = [
  [1,'Monatlich'],[3,'Vierteljährlich'],[4,'Dritteljährlich'],[6,'Halbjährlich'],[12,'Jährlich']
];

function normalizeVariableCategories(){
  const existing = S.cats.filter(c=>c.t==='V');
  const aliases = {
    Freizeit:['freizeit','essen gehen'], Auto:['auto','benzin','mobilität'], Kinder:['kinder'],
    Lebensmittel:['lebensmittel','einkauf'], Drogerie:['drogerie','hygiene'], Urlaub:['urlaub'],
    Kleidung:['kleidung'], Online:['online','shopping']
  };
  const canonical=[];
  for(const name of VARIABLE_CATEGORY_NAMES){
    const words=aliases[name];
    let cat=existing.find(c=>words.some(w=>`${c.p} ${c.g}`.toLowerCase().includes(w)) && !canonical.includes(c));
    if(!cat) cat={id:uid(),g:'Variable Ausgaben',p:name,d:0,t:'V'};
    cat.g='Variable Ausgaben'; cat.p=name; cat.d=0; cat.t='V'; canonical.push(cat);
  }
  const validIds=new Set(canonical.map(c=>c.id));
  const fallback=canonical[0];
  for(const booking of S.buchungen){
    const old=S.cats.find(c=>c.id===booking.catId);
    if(old?.t==='V'&&!validIds.has(old.id)){
      const text=`${old.p} ${old.g}`.toLowerCase();
      booking.catId=(canonical.find(c=>(aliases[c.p]||[]).some(w=>text.includes(w)))||fallback).id;
    }
  }
  S.cats=[...S.cats.filter(c=>c.t!=='V'),...canonical];
}

const _loadRefined=load;
load=function(){
  _loadRefined();
  S.percentageAdjustments=Array.isArray(S.percentageAdjustments)?S.percentageAdjustments:[];
  normalizeVariableCategories();
};

const _persistRefined=persist;
persist=function(){
  clearTimeout(_pTimer);
  _pTimer=setTimeout(()=>{
    try{
      localStorage.setItem(LS_KEY,JSON.stringify({
        data:S.data,cats:S.cats,kredite:S.kredite,years:S.years,buchungen:S.buchungen,budgets:S.budgets,
        recurringRules:S.recurringRules||[],annualAdjustments:S.annualAdjustments||[],percentageAdjustments:S.percentageAdjustments||[]
      }));
    }catch(e){console.warn('persist failed',e);}
  },300);
};

function monthNo(y,m){return Number(y)*12+Number(m);}
const _gvRefined=gv;
gv=function(y,m,cat){
  let value=_gvRefined(y,m,cat);
  const adjustments=(S.percentageAdjustments||[])
    .filter(a=>a.catId===cat.id&&monthNo(a.year,a.month)<=monthNo(y,m))
    .sort((a,b)=>monthNo(a.year,a.month)-monthNo(b.year,b.month));
  for(const adj of adjustments) value*=1+Number(adj.percent||0)/100;
  return Math.round(value*100)/100;
};

calcMonth=function(y,m){
  let e=0,f=0,v=0,k=0,s=0;
  for(const cat of S.cats){
    if(cat.t==='V') continue;
    const val=gv(y,m,cat);
    if(cat.t==='E')e+=val; else if(cat.t==='F')f+=val; else if(cat.t==='K')k+=val; else if(cat.t==='S')s+=val;
  }
  v=getBuchungenForMonth(y,m).reduce((sum,b)=>sum+Number(b.betrag||0),0);
  const aus=f+v+k+s;
  return {e,f,v,k,s,aus,saldo:e-aus};
};

function variableCategoryOptions(selected=''){
  return S.cats.filter(c=>c.t==='V').map(c=>`<option value="${esc(c.id)}"${c.id===selected?' selected':''}>${esc(c.p)}</option>`).join('');
}

vAusgaben=function(){
  const y=S.year,mo=S.month;
  const recent=getBuchungenForMonth(y,mo).slice().reverse().slice(0,10);
  const rows=recent.map(b=>{const c=S.cats.find(x=>x.id===b.catId);return `<div class="compact-row"><div class="compact-main"><div class="compact-title">${esc(b.bezeichnung||c?.p||'Ausgabe')}</div><div class="compact-sub">${esc(c?.p||'Ohne Kategorie')} · ${new Date(b.ts).toLocaleDateString('de-DE')}</div></div><div class="compact-value k">-${fmt(b.betrag)}</div></div>`}).join('');
  return `<div class="desktop-page-title">Ausgaben</div><div class="card form-card"><div class="card-title">Variable Ausgabe erfassen</div>
    <div class="form-grid two"><div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" onchange="selMonth(Number(this.value))">${MF.map((x,i)=>`<option value="${i}"${i===mo?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" onchange="selYear(Number(this.value))">${S.years.map(x=>`<option value="${x}"${x===y?' selected':''}>${x}</option>`).join('')}</select></div></div></div>
    <div class="field"><div class="lbl">Betrag</div><input class="inp" id="quick-amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00"/></div>
    <div class="field"><div class="lbl">Kategorie</div><div class="sw"><select class="sel" id="quick-cat"><option value="">Bitte auswählen</option>${variableCategoryOptions(S.ausgabeCatId)}</select></div></div>
    <div class="field"><div class="lbl">Bezeichnung</div><input class="inp" id="quick-name" placeholder="z. B. REWE oder Freizeitpark"/></div>
    <div class="dialog-actions"><button class="btn btn-cancel" onclick="clearExpenseForm()">Abbrechen</button><button class="btn btn-green" onclick="saveStructuredExpense()">Speichern</button></div></div>
    <div class="card list-card"><div class="list-head"><div class="card-title" style="margin:0">Letzte Buchungen</div><span class="muted">${MF[mo]} ${y}</span></div><div class="list-body">${rows||'<div class="empty-state">Noch keine Buchungen.</div>'}</div></div>`;
};

function clearExpenseForm(){['quick-amount','quick-name','quick-cat'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});}

function findRecurringRule(catId){return (S.recurringRules||[]).find(r=>r.catId===catId)||null;}
function latestPercent(catId){return (S.percentageAdjustments||[]).filter(a=>a.catId===catId).sort((a,b)=>monthNo(b.year,b.month)-monthNo(a.year,a.month))[0]||null;}

function openPositionDialog(catId=''){
  const cat=S.cats.find(c=>c.id===catId)||{id:'',p:'',g:'Wohnen',t:'F',d:0};
  const rule=findRecurringRule(catId);
  const pct=latestPercent(catId);
  const groups=[...new Set(fixedCostCategories().map(c=>c.g))];
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

function savePositionDialog(catId){
  const name=document.getElementById('pos-name')?.value.trim();
  const amount=Number(document.getElementById('pos-amount')?.value);
  if(!name||!Number.isFinite(amount)||amount<0)return toast('Bezeichnung und Betrag prüfen','err');
  const chosen=document.getElementById('pos-group')?.value;
  const group=chosen==='__new'?document.getElementById('pos-group-new')?.value.trim():chosen;
  if(!group)return toast('Gruppe auswählen','err');
  let cat=S.cats.find(c=>c.id===catId);
  if(!cat){cat={id:uid(),g:group,p:name,d:amount,t:document.getElementById('pos-type').value};S.cats.push(cat);catId=cat.id;}
  Object.assign(cat,{g:group,p:name,d:amount,t:document.getElementById('pos-type').value});
  S.recurringRules=(S.recurringRules||[]).filter(r=>r.catId!==catId);
  S.recurringRules.push({id:uid(),catId,amount,intervalMonths:Number(document.getElementById('pos-interval').value),startMonth:Number(document.getElementById('pos-start-month').value),startYear:Number(document.getElementById('pos-start-year').value),endMonth:null,endYear:null});
  S.percentageAdjustments=(S.percentageAdjustments||[]).filter(a=>a.catId!==catId);
  const incMonth=document.getElementById('pos-inc-month').value, percent=Number(document.getElementById('pos-inc-percent').value);
  if(incMonth!==''&&Number.isFinite(percent)&&percent!==0)S.percentageAdjustments.push({id:uid(),catId,month:Number(incMonth),year:Number(document.getElementById('pos-inc-year').value),percent});
  persist();closeGenSheet();render();toast('Position gespeichert');
}

addFixedCategory=function(){openPositionDialog('');};
fixedCostRows=function(categories){return categories.map(cat=>`<div class="compact-row"><div class="compact-main"><div class="compact-title">${esc(cat.p)}</div><div class="compact-sub">${esc(cat.g)} · ${TL[cat.t]}</div></div><div class="compact-value ${RC[cat.t]||''}">${fmtS(gv(S.year,S.month,cat))}</div><button class="row-edit-btn" onclick="openPositionDialog('${esc(cat.id)}')">✎</button></div>`).join('');};

vUebersicht=function(){
  const type=S.ui.fixedType||'all',group=S.ui.fixedGroup||'all',search=(S.ui.fixedSearch||'').trim().toLowerCase();
  const all=fixedCostCategories();
  const categories=all.filter(c=>(type==='all'||c.t===type)&&(group==='all'||c.g===group)&&(!search||c.p.toLowerCase().includes(search)||c.g.toLowerCase().includes(search)));
  return `<div class="desktop-page-title">Fixkosten</div><div class="card form-card"><div class="card-title">Zeitraum und Filter</div><div class="form-grid two"><div class="field"><div class="lbl">Monat</div><div class="sw"><select class="sel" onchange="selMonth(Number(this.value))">${MF.map((x,i)=>`<option value="${i}"${i===S.month?' selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Jahr</div><div class="sw"><select class="sel" onchange="selYear(Number(this.value))">${S.years.map(y=>`<option value="${y}"${y===S.year?' selected':''}>${y}</option>`).join('')}</select></div></div></div>
    <div class="compact-toolbar"><input class="inp wide" id="fixed-search" placeholder="Position suchen" value="${esc(S.ui.fixedSearch||'')}"/><button class="btn btn-ghost" onclick="applyFixedSearch()">Suchen</button><div class="sw"><select class="sel" onchange="S.ui.fixedType=this.value;render()">${fixedCostTypeOptions(type)}</select></div><div class="sw"><select class="sel" onchange="S.ui.fixedGroup=this.value;render()">${fixedCostGroups(group)}</select></div></div><button class="btn btn-primary btn-full" onclick="openPositionDialog('')">Position hinzufügen</button></div>
    <div class="card list-card"><div class="list-head"><div class="card-title" style="margin:0">Feste Positionen</div><span class="muted">${categories.length} Einträge</span></div><div class="list-body">${fixedCostRows(categories)||'<div class="empty-state">Keine passenden Positionen.</div>'}</div></div>
    <div class="card"><div class="card-title">Verwaltung</div><div class="form-actions"><button class="btn btn-ghost" onclick="openAddYear()">Jahr hinzufügen</button><button class="btn btn-ghost" onclick="openFixedDataActions()">Daten verwalten</button></div></div>`;
};
vEinstellungen=vUebersicht;
function applyFixedSearch(){S.ui.fixedSearch=document.getElementById('fixed-search')?.value||'';render();}

(function enableSwipeClose(){
  let startY=0,currentSheet=null;
  document.addEventListener('touchstart',e=>{const sheet=e.target.closest('.sheet');if(!sheet)return;startY=e.touches[0].clientY;currentSheet=sheet;},{passive:true});
  document.addEventListener('touchend',e=>{if(!currentSheet)return;const dy=e.changedTouches[0].clientY-startY;if(dy>90){currentSheet.closest('.overlay')?.classList.remove('open');}currentSheet=null;},{passive:true});
})();
