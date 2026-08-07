/* Kreditmodul: Berechnung, Darstellung, Synchronisierung und Sondertilgung. */
'use strict';

const CREDIT_CATEGORY_SOURCE='loan';

function creditStartAmount(k){
  const start=Number(k.s ?? k.startAmount);
  if(Number.isFinite(start)&&start>=0)return start;
  const legacy=Number(k.r||0)+Number(k.g||0);
  return Math.max(0,legacy);
}

function creditReferenceYear(k){
  const value=Number(k.balanceYear ?? k.ry);
  return Number.isInteger(value)?value:new Date().getFullYear();
}

function creditReferenceMonth(k){
  const value=Number(k.balanceMonth ?? k.rm);
  return Number.isInteger(value)&&value>=0&&value<=11?value:new Date().getMonth();
}

function creditMonthNumber(year,month){return Number(year)*12+Number(month);}

function creditBalanceAt(k,year,month){
  let balance=Math.max(0,Number(k.r||0));
  const payment=Math.max(0,Number(k.m||0));
  const monthlyRate=Math.max(0,Number(k.z||0))/1200;
  const reference=creditMonthNumber(creditReferenceYear(k),creditReferenceMonth(k));
  const target=creditMonthNumber(year,month);
  const difference=target-reference;
  if(difference>0){
    for(let i=0;i<difference&&balance>0.005;i++){
      const interest=balance*monthlyRate;
      balance=Math.max(0,balance+interest-payment);
    }
  }else if(difference<0){
    for(let i=0;i<Math.abs(difference);i++){
      balance=monthlyRate>0?(balance+payment)/(1+monthlyRate):balance+payment;
      balance=Math.min(creditStartAmount(k)||balance,balance);
    }
  }
  return Math.round(balance*100)/100;
}

function creditInterestAt(k,year,month){
  const balance=creditBalanceAt(k,year,month);
  return Math.round(balance*(Math.max(0,Number(k.z||0))/1200)*100)/100;
}

function creditPrincipalAt(k,year,month){
  const balance=creditBalanceAt(k,year,month);
  if(balance<=0)return 0;
  return Math.round(Math.max(0,Math.min(balance,Number(k.m||0)-creditInterestAt(k,year,month)))*100)/100;
}

function creditPaidAmountAt(k,year,month){
  return Math.max(0,Math.round((creditStartAmount(k)-creditBalanceAt(k,year,month))*100)/100);
}

function creditRemainingMonthsFrom(k,year,month){
  let balance=creditBalanceAt(k,year,month);
  const payment=Math.max(0,Number(k.m||0));
  const monthlyRate=Math.max(0,Number(k.z||0))/1200;
  if(balance<=0)return 0;
  if(payment<=0||(monthlyRate>0&&payment<=balance*monthlyRate))return null;
  let months=0;
  while(balance>0.005&&months<1200){
    balance=Math.max(0,balance+balance*monthlyRate-payment);
    months++;
  }
  return months>=1200?null:months;
}

function creditEndDateAt(k,year,month){
  const remaining=creditRemainingMonthsFrom(k,year,month);
  if(remaining===null)return 'Rate zu niedrig';
  const date=new Date(Number(year),Number(month)+remaining,1);
  return date.toLocaleDateString('de-DE',{month:'2-digit',year:'numeric'});
}

function normalizeCreditName(value){
  return String(value||'').toLowerCase().replace(/[^a-z0-9äöüß]+/g,' ').trim();
}

function findLinkedCreditCategory(loan){
  return S.cats.find(cat=>cat.loanId===loan.id)
    ||S.cats.find(cat=>cat.t==='K'&&normalizeCreditName(cat.p)===normalizeCreditName(loan.n));
}

function syncLoanCategory(loan){
  let cat=findLinkedCreditCategory(loan);
  if(!cat){
    cat={id:uid(),g:'Kredite',p:loan.n,d:Number(loan.m)||0,t:'K',loanId:loan.id,source:CREDIT_CATEGORY_SOURCE};
    S.cats.push(cat);
  }else{
    Object.assign(cat,{g:'Kredite',p:loan.n,d:Number(loan.m)||0,t:'K',loanId:loan.id,source:CREDIT_CATEGORY_SOURCE});
  }
  return cat;
}

function syncAllLoans(){
  const activeIds=new Set((S.kredite||[]).map(loan=>loan.id));
  (S.kredite||[]).forEach(syncLoanCategory);
  S.cats=(S.cats||[]).filter(cat=>cat.source!==CREDIT_CATEGORY_SOURCE||activeIds.has(cat.loanId));
}

function removeLoanCategory(loanId){
  const removedIds=new Set(S.cats.filter(cat=>cat.loanId===loanId).map(cat=>cat.id));
  S.cats=S.cats.filter(cat=>cat.loanId!==loanId);
  if(removedIds.size){
    S.recurringRules=(S.recurringRules||[]).filter(rule=>!removedIds.has(rule.catId));
    S.annualAdjustments=(S.annualAdjustments||[]).filter(item=>!removedIds.has(item.catId));
    S.percentageAdjustments=(S.percentageAdjustments||[]).filter(item=>!removedIds.has(item.catId));
  }
}

function amortizeCredit(principal,annualRate,monthlyPayment){
  let balance=Math.max(0,Number(principal)||0);
  const payment=Math.max(0,Number(monthlyPayment)||0);
  const monthlyRate=Math.max(0,Number(annualRate)||0)/1200;
  let months=0,interest=0;
  if(balance<=0)return{months:0,interest:0,total:0};
  if(payment<=0||(monthlyRate>0&&payment<=balance*monthlyRate))return null;
  while(balance>0.005&&months<1200){
    const monthInterest=balance*monthlyRate;
    interest+=monthInterest;
    balance=Math.max(0,balance+monthInterest-payment);
    months++;
  }
  if(months>=1200)return null;
  return{months,interest,total:principal+interest};
}

function specialRepaymentMonthLabel(offset){
  const date=new Date(S.year,S.month+Number(offset),1);
  return date.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
}

function calculateSpecialRepayment(){
  const loanId=document.getElementById('specialLoan')?.value;
  const amount=Math.max(0,Number(document.getElementById('specialAmount')?.value)||0);
  const loan=S.kredite.find(item=>item.id===loanId);
  const result=document.getElementById('specialResult');
  if(!loan||!result)return;
  const currentPrincipal=creditBalanceAt(loan,S.year,S.month);
  const baseline=amortizeCredit(currentPrincipal,loan.z,loan.m);
  const reducedPrincipal=Math.max(0,currentPrincipal-amount);
  const withPayment=amortizeCredit(reducedPrincipal,loan.z,loan.m);
  if(!baseline||!withPayment){
    result.innerHTML='<div class="loan-calc-error">Die Monatsrate reicht bei diesem Zinssatz nicht für eine vollständige Tilgung aus.</div>';
    return;
  }
  const savedMonths=Math.max(0,baseline.months-withPayment.months);
  const savedInterest=Math.max(0,baseline.interest-withPayment.interest);
  result.innerHTML=`<div class="loan-calc-grid"><div><span>Restschuld ${MF[S.month]} ${S.year}</span><strong>${fmt(currentPrincipal)}</strong></div><div><span>Neue Restschuld</span><strong>${fmt(reducedPrincipal)}</strong></div><div><span>Laufzeitverkürzung</span><strong>${savedMonths} Monate</strong></div><div><span>Zinsersparnis</span><strong>${fmt(savedInterest)}</strong></div><div><span>Neues Enddatum</span><strong>${specialRepaymentMonthLabel(withPayment.months)}</strong></div></div><div class="loan-calc-compare"><div><span>Ohne Sondertilgung</span><b>${baseline.months} Monate · ${fmt(baseline.interest)} Zinsen</b></div><div><span>Mit Sondertilgung</span><b>${withPayment.months} Monate · ${fmt(withPayment.interest)} Zinsen</b></div></div>`;
}

function creditCalculatorMarkup(){
  if(!S.kredite.length)return'';
  const options=S.kredite.map(loan=>`<option value="${esc(loan.id)}">${esc(loan.n)}</option>`).join('');
  return `<section class="loan-calc-card"><div class="loan-calc-title">Sondertilgung berechnen</div><div class="loan-calc-sub">Basis: berechnete Restschuld für ${MF[S.month]} ${S.year}</div><div class="loan-calc-fields"><label>Kredit<select class="inp" id="specialLoan">${options}</select></label><label>Sondertilgung (€)<input class="inp" id="specialAmount" type="number" min="0" step="50" inputmode="decimal" value="500"></label></div><button class="btn btn-primary btn-full" onclick="calculateSpecialRepayment()">Berechnen</button><div id="specialResult"></div></section>`;
}

function vKredite(){
  const y=S.year,mo=S.month;
  const tR=S.kredite.reduce((sum,k)=>sum+creditBalanceAt(k,y,mo),0);
  const tM=S.kredite.reduce((sum,k)=>sum+Number(k.m||0),0);
  const tG=S.kredite.reduce((sum,k)=>sum+creditPaidAmountAt(k,y,mo),0);
  const cards=S.kredite.map(k=>{
    const start=creditStartAmount(k);
    const balance=creditBalanceAt(k,y,mo);
    const paid=creditPaidAmountAt(k,y,mo);
    const interest=creditInterestAt(k,y,mo);
    const principal=creditPrincipalAt(k,y,mo);
    const pct=start>0?Math.min(100,Math.round((paid/start)*100)):0;
    return `<div class="kredit-item"><div class="kredit-header"><span class="kredit-name">${esc(k.n)}</span><button class="btn btn-ghost btn-sm" onclick="editKredit('${esc(k.id)}')">✎ Bearbeiten</button></div><div class="krow"><span>Startbetrag</span><span>${fmt(start)}</span></div><div class="krow"><span>Restschuld ${MF[mo]} ${y}</span><span>${fmt(balance)}</span></div><div class="krow"><span>Monatl. Rate</span><span>${fmt(Number(k.m||0))}</span></div><div class="krow"><span>Davon Zinsen</span><span>${fmt(interest)}</span></div><div class="krow"><span>Davon Tilgung</span><span>${fmt(principal)}</span></div><div class="krow"><span>Zinssatz</span><span>${Number(k.z||0).toFixed(2)} %</span></div><div class="krow"><span>Laufzeit bis</span><span>${esc(creditEndDateAt(k,y,mo))}</span></div><div class="krow"><span>Bereits getilgt</span><span>${fmt(paid)}</span></div><div class="kprog"><div class="kprog-fill" style="width:${pct}%"></div></div><div class="kprog-lbl">${pct} % getilgt</div></div>`;
  }).join('');
  const main=`<div class="hero"><div class="hero-bg"></div><div class="hero-content"><div class="hero-lbl">Gesamtschulden · ${MF[mo]} ${y}</div><div class="hero-val neg">${fmtS(tR)}</div><div class="hero-sub"><div class="hsi"><div class="hsi-lbl">Monatl. Raten</div><div class="hsi-val">${fmtS(tM)}</div></div><div class="hsi"><div class="hsi-lbl">Getilgt</div><div class="hsi-val">${fmtS(tG)}</div></div><div class="hsi"><div class="hsi-lbl">Anzahl</div><div class="hsi-val">${S.kredite.length}</div></div></div></div></div>${cards}<button class="btn btn-primary btn-full mt8" onclick="addKredit()">+ Neuen Kredit hinzufügen</button>`;
  return `<div class="desktop-page-title">Kredite</div><div class="layout-grid loans-grid"><div class="grid-primary">${main}</div><div class="grid-secondary">${creditCalculatorMarkup()}</div></div>`;
}

function kreditForm(k={}){
  const today=new Date();
  const start=creditStartAmount(k);
  const referenceYear=creditReferenceYear(k)||today.getFullYear();
  const referenceMonth=creditReferenceMonth(k);
  const yearOptions=Array.from(new Set([...(S.years||[]),referenceYear,today.getFullYear()])).sort((a,b)=>a-b).map(y=>`<option value="${y}"${y===referenceYear?' selected':''}>${y}</option>`).join('');
  return `<div class="field"><div class="lbl">Name</div><input class="inp" id="kn" value="${esc(k.n||'')}" placeholder="z. B. Deutsche Bank"/></div><div class="field"><div class="lbl">Startbetrag (€)</div><input class="inp" type="number" id="ks" value="${start||''}" min="0" step="0.01" inputmode="decimal" placeholder="0,00"/></div><div class="field"><div class="lbl">Eingegebene Restschuld (€)</div><input class="inp" type="number" id="kr" value="${k.r??''}" min="0" step="0.01" inputmode="decimal" placeholder="0,00"/></div><div class="form-grid two"><div class="field"><div class="lbl">Stand Monat</div><div class="sw"><select class="sel" id="krm">${MF.map((name,index)=>`<option value="${index}"${index===referenceMonth?' selected':''}>${name}</option>`).join('')}</select></div></div><div class="field"><div class="lbl">Stand Jahr</div><div class="sw"><select class="sel" id="kry">${yearOptions}</select></div></div></div><div class="field"><div class="lbl">Monatl. Rate (€)</div><input class="inp" type="number" id="km" value="${k.m??''}" min="0" step="0.01" inputmode="decimal" placeholder="0,00"/></div><div class="field"><div class="lbl">Zinssatz (%)</div><input class="inp" type="number" id="kz" value="${k.z??''}" min="0" step="0.001" inputmode="decimal" placeholder="0,00"/></div><div class="annual-note">Die eingegebene Restschuld gilt für den gewählten Stichtagsmonat. Für andere Monate wird sie automatisch mit Zinsen und Tilgung fortgeschrieben.</div>`;
}

function readKreditForm(existing={}){
  const n=document.getElementById('kn')?.value.trim();
  const s=parseFloat(document.getElementById('ks')?.value);
  const r=parseFloat(document.getElementById('kr')?.value);
  const m=parseFloat(document.getElementById('km')?.value);
  const z=parseFloat(document.getElementById('kz')?.value);
  const balanceMonth=Number(document.getElementById('krm')?.value);
  const balanceYear=Number(document.getElementById('kry')?.value);
  if(!n){toast('Bitte einen Namen eingeben','err');return null;}
  if([s,r,m,z,balanceMonth,balanceYear].some(v=>!Number.isFinite(v)||v<0)){toast('Bitte alle Pflichtfelder prüfen','err');return null;}
  if(r>s){toast('Restschuld darf nicht höher als der Startbetrag sein','err');return null;}
  if(balanceMonth>11){toast('Stichtagsmonat prüfen','err');return null;}
  return {...existing,n,s,r,m,z,balanceMonth,balanceYear};
}

function saveNewKredit(){
  const values=readKreditForm();
  if(!values)return;
  const loan={id:uid(),...values};
  S.kredite.push(loan);
  syncLoanCategory(loan);
  if(typeof sortCategoriesInPlace==='function')sortCategoriesInPlace();
  persist();
  closeGenSheet();
  render();
  toast(`${esc(loan.n)} hinzugefügt`);
}

function saveEditKredit(kid){
  const loan=S.kredite.find(x=>x.id===kid);
  if(!loan)return;
  const values=readKreditForm(loan);
  if(!values)return;
  Object.assign(loan,values);
  syncLoanCategory(loan);
  if(typeof sortCategoriesInPlace==='function')sortCategoriesInPlace();
  persist();
  closeGenSheet();
  render();
  toast(`${esc(loan.n)} gespeichert`);
}

function delKredit(kid){
  const loan=S.kredite.find(x=>x.id===kid);
  if(!loan||!confirm(`"${loan.n}" wirklich löschen?`))return;
  S.kredite=S.kredite.filter(x=>x.id!==kid);
  removeLoanCategory(kid);
  if(typeof sortCategoriesInPlace==='function')sortCategoriesInPlace();
  persist();
  closeGenSheet();
  render();
  toast(`${esc(loan.n)} gelöscht`);
}
