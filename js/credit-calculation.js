/* Kreditverwaltung: Startbetrag, automatische Tilgung und Laufzeit. */
'use strict';

function creditStartAmount(k){
  const start=Number(k.s ?? k.startAmount);
  if(Number.isFinite(start)&&start>=0)return start;
  const legacy=Number(k.r||0)+Number(k.g||0);
  return Math.max(0,legacy);
}

function creditPaidAmount(k){
  return Math.max(0,creditStartAmount(k)-Number(k.r||0));
}

function creditRemainingMonths(k){
  const principal=Math.max(0,Number(k.r||0));
  const payment=Math.max(0,Number(k.m||0));
  const annualRate=Math.max(0,Number(k.z||0));
  if(principal<=0)return 0;
  if(payment<=0)return null;
  const monthlyRate=annualRate/100/12;
  if(monthlyRate===0)return Math.ceil(principal/payment);
  if(payment<=principal*monthlyRate)return null;
  const months=-Math.log(1-(principal*monthlyRate/payment))/Math.log(1+monthlyRate);
  return Number.isFinite(months)?Math.ceil(months):null;
}

function creditEndDate(k){
  const months=creditRemainingMonths(k);
  if(months===null)return 'Rate zu niedrig';
  const date=new Date();
  date.setDate(1);
  date.setMonth(date.getMonth()+months);
  return `${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;
}

const _loadCredits=load;
load=function(){
  _loadCredits();
  S.kredite=(S.kredite||[]).map(k=>({
    ...k,
    s:creditStartAmount(k),
    g:creditPaidAmount(k),
    b:creditEndDate(k)
  }));
};

vKredite=function(){
  const tR=S.kredite.reduce((s,k)=>s+Number(k.r||0),0);
  const tM=S.kredite.reduce((s,k)=>s+Number(k.m||0),0);
  const tG=S.kredite.reduce((s,k)=>s+creditPaidAmount(k),0);
  const cards=S.kredite.map(k=>{
    const start=creditStartAmount(k);
    const paid=creditPaidAmount(k);
    const pct=start>0?Math.min(100,Math.round((paid/start)*100)):0;
    const end=creditEndDate(k);
    return `<div class="kredit-item">
      <div class="kredit-header"><span class="kredit-name">${esc(k.n)}</span>
        <button class="btn btn-ghost btn-sm" onclick="editKredit('${esc(k.id)}')">✎ Bearbeiten</button></div>
      <div class="krow"><span>Startbetrag</span><span>${fmt(start)}</span></div>
      <div class="krow"><span>Restschuld</span><span>${fmt(Number(k.r||0))}</span></div>
      <div class="krow"><span>Monatl. Rate</span><span>${fmt(Number(k.m||0))}</span></div>
      <div class="krow"><span>Zinssatz</span><span>${Number(k.z||0).toFixed(2)} %</span></div>
      <div class="krow"><span>Laufzeit bis</span><span>${esc(end)}</span></div>
      <div class="krow"><span>Bereits getilgt</span><span>${fmt(paid)}</span></div>
      <div class="kprog"><div class="kprog-fill" style="width:${pct}%"></div></div>
      <div class="kprog-lbl">${pct} % getilgt</div>
    </div>`;
  }).join('');
  return `<div class="desktop-page-title">Kredite</div>
    <div class="hero"><div class="hero-bg"></div><div class="hero-content">
      <div class="hero-lbl">Gesamtschulden</div><div class="hero-val neg">${fmtS(tR)}</div>
      <div class="hero-sub">
        <div class="hsi"><div class="hsi-lbl">Monatl. Raten</div><div class="hsi-val">${fmtS(tM)}</div></div>
        <div class="hsi"><div class="hsi-lbl">Getilgt</div><div class="hsi-val">${fmtS(tG)}</div></div>
        <div class="hsi"><div class="hsi-lbl">Anzahl</div><div class="hsi-val">${S.kredite.length}</div></div>
      </div></div></div>${cards}<button class="btn btn-primary btn-full mt8" onclick="addKredit()">+ Neuen Kredit hinzufügen</button>`;
};

kreditForm=function(k={}){
  const start=creditStartAmount(k);
  return `<div class="field"><div class="lbl">Name</div><input class="inp" id="kn" value="${esc(k.n||'')}" placeholder="z. B. Deutsche Bank"/></div>
    <div class="field"><div class="lbl">Startbetrag (€)</div><input class="inp" type="number" id="ks" value="${start||''}" min="0" step="0.01" inputmode="decimal" placeholder="0,00"/></div>
    <div class="field"><div class="lbl">Aktuelle Restschuld (€)</div><input class="inp" type="number" id="kr" value="${k.r??''}" min="0" step="0.01" inputmode="decimal" placeholder="0,00"/></div>
    <div class="field"><div class="lbl">Monatl. Rate (€)</div><input class="inp" type="number" id="km" value="${k.m??''}" min="0" step="0.01" inputmode="decimal" placeholder="0,00"/></div>
    <div class="field"><div class="lbl">Zinssatz (%)</div><input class="inp" type="number" id="kz" value="${k.z??''}" min="0" step="0.001" inputmode="decimal" placeholder="0,00"/></div>
    <div class="annual-note">Bereits getilgt und Laufzeit bis werden automatisch berechnet.</div>`;
};

readKreditForm=function(existing={}){
  const n=document.getElementById('kn')?.value.trim();
  const s=parseFloat(document.getElementById('ks')?.value);
  const r=parseFloat(document.getElementById('kr')?.value);
  const m=parseFloat(document.getElementById('km')?.value);
  const z=parseFloat(document.getElementById('kz')?.value);
  if(!n){toast('Bitte einen Namen eingeben','err');return null;}
  if([s,r,m,z].some(v=>!Number.isFinite(v)||v<0)){toast('Bitte alle Pflichtfelder prüfen','err');return null;}
  if(r>s){toast('Restschuld darf nicht höher als der Startbetrag sein','err');return null;}
  const next={...existing,n,s,r,m,z};
  next.g=creditPaidAmount(next);
  next.b=creditEndDate(next);
  return next;
};
