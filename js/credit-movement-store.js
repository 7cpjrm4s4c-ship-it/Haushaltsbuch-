/**
 * State-, Validierungs- und Persistenzgrenze für operative Kreditbewegungen.
 * Kreditabrufe und Rückzahlungen sind wertneutrale Finanzierungen; Zinsen sind Aufwand.
 * @module CreditMovementStore
 */
'use strict';

(function(root){
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const round2=value=>Math.round((Number(value)||0)*100)/100;
  const monthIndex=(year,month)=>Number(year)*12+Number(month);
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function save(){if(typeof root.persist==='function')root.persist();}
  function all(){return clone(Array.isArray(state().creditMovements)?state().creditMovements:[]);}
  function forLoan(loanId){return all().filter(item=>item.loanId===loanId);}
  function forMonth(year,month){return all().filter(item=>Number(item.year)===Number(year)&&Number(item.month)===Number(month));}
  function parseDate(value){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));if(!match)return null;const year=Number(match[1]),month=Number(match[2])-1,day=Number(match[3]),date=new Date(Date.UTC(year,month,day));return year>=2000&&year<=2200&&date.getUTCFullYear()===year&&date.getUTCMonth()===month&&date.getUTCDate()===day?{date:String(value),year,month}:null;}
  function loanById(id){return (state().kredite||[]).find(item=>item.id===id)||null;}
  function validateTimeline(loan,movements){
    const reference=monthIndex(root.creditReferenceYear(loan),root.creditReferenceMonth(loan)),ordered=movements.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id||'').localeCompare(String(b.id||'')));
    if(ordered.some(item=>monthIndex(item.year,item.month)<reference))throw new RangeError('Kreditbewegung liegt vor dem Restschuld-Stichtag');
    if(root.creditType(loan)==='revolving'){
      if(ordered.some(item=>!['drawdown','repayment'].includes(item.type)))throw new RangeError('Vorhandene Bewegungen passen nicht zum Kredittyp');
      const limit=Number(loan.limit);if(!Number.isFinite(limit)||limit<=0)throw new RangeError('Kreditrahmen muss größer als null sein');const last=Math.max(reference,...ordered.map(item=>monthIndex(item.year,item.month)));let balance=Math.max(0,Number(loan.r)||0);
      if(balance>limit+0.005)throw new RangeError('Aktuelle Inanspruchnahme überschreitet den Kreditrahmen');
      for(let index=reference;index<=last;index++){const year=Math.floor(index/12),month=index-year*12,result=root.revolvingMonth(loan,balance,year,month,ordered);if(result.limitExceeded)throw new RangeError('Kreditrahmen wird überschritten');if(result.overpayment)throw new RangeError('Rückzahlung übersteigt die offene Restschuld');balance=result.closingBalance;}
      return;
    }
    for(const item of ordered){if(item.type!=='specialRepayment')throw new RangeError('Für Ratenkredite sind nur Sondertilgungen zulässig');}
    const months=[...new Set(ordered.map(item=>monthIndex(item.year,item.month)))].sort((a,b)=>a-b);
    for(const index of months){const year=Math.floor(index/12),month=index-year*12,opening=root.creditBalanceAt(loan,year,month,ordered.filter(item=>monthIndex(item.year,item.month)<index)),result=root.installmentMonth(loan,opening,year,month,ordered);if(result.requestedSpecial>result.specialRepayment+0.005)throw new RangeError('Sondertilgung übersteigt die Restschuld nach der regulären Rate');}
  }
  /** @param {Object} input Bewegungsdaten. @param {Function} makeId ID-Generator. @returns {Object} Gespeicherte Bewegung. */
  function add(input,makeId){
    const loan=loanById(String(input?.loanId||'')),parsed=parseDate(input?.date),rawAmount=Number(input?.amount),amount=Number.isFinite(rawAmount)?round2(Math.max(0,rawAmount)):0;if(!loan)throw new Error('Kredit nicht gefunden');if(!parsed)throw new RangeError('Gültiges Buchungsdatum erforderlich');if(!amount)throw new RangeError('Betrag muss größer als null sein');
    const allowed=root.creditType(loan)==='revolving'?new Set(['drawdown','repayment']):new Set(['specialRepayment']),type=String(input.type||'');if(!allowed.has(type))throw new RangeError('Bewegungsart passt nicht zum Kredittyp');
    const item={id:makeId(),loanId:loan.id,type,amount,...parsed,note:String(input.note||'').slice(0,120),createdAt:String(input.createdAt||new Date().toISOString())},next=[...(state().creditMovements||[]),item];validateTimeline(loan,next.filter(entry=>entry.loanId===loan.id));state().creditMovements=next;save();return clone(item);
  }
  function remove(id){const current=(state().creditMovements||[]).find(item=>item.id===id);if(!current)return false;const next=(state().creditMovements||[]).filter(item=>item.id!==id),loan=loanById(current.loanId);if(loan)validateTimeline(loan,next.filter(item=>item.loanId===loan.id));state().creditMovements=next;save();return true;}
  function removeForLoan(loanId,shouldSave=true){const before=(state().creditMovements||[]).length;state().creditMovements=(state().creditMovements||[]).filter(item=>item.loanId!==loanId);const removed=before!==state().creditMovements.length;if(removed&&shouldSave)save();return removed;}
  function validateLoan(loan){validateTimeline(loan,(state().creditMovements||[]).filter(item=>item.loanId===loan.id));return true;}
  function validateDataset(loans,movements){for(const loan of loans||[])validateTimeline(loan,(movements||[]).filter(item=>item.loanId===loan.id));return true;}
  function monthlyTotals(year,month){
    const entries=forMonth(year,month);let inflows=0,repayments=0,specialRepayments=0,interest=0,scheduledPrincipal=0,scheduledPayments=0;
    for(const item of entries){if(item.type==='drawdown')inflows+=item.amount;else if(item.type==='repayment')repayments+=item.amount;else if(item.type==='specialRepayment')specialRepayments+=item.amount;}
    for(const loan of state().kredite||[]){if(root.creditType(loan)!=='revolving')continue;const opening=root.creditBalanceAt(loan,year,month,state().creditMovements||[]),result=root.revolvingMonth(loan,opening,year,month,state().creditMovements||[]);interest+=result.interest;scheduledPrincipal+=result.scheduledPrincipal;scheduledPayments+=result.scheduledPayment;}
    const variableOutflows=repayments+specialRepayments,outflows=variableOutflows+scheduledPayments;return {inflows:round2(inflows),repayments:round2(repayments),specialRepayments:round2(specialRepayments),interest:round2(interest),scheduledPrincipal:round2(scheduledPrincipal),scheduledPayments:round2(scheduledPayments),variableOutflows:round2(variableOutflows),outflows:round2(outflows),variableNetMainAccount:round2(inflows-variableOutflows),netMainAccount:round2(inflows-outflows)};
  }
  function displayEntries(year,month){
    const loans=new Map((state().kredite||[]).map(item=>[item.id,item])),entries=forMonth(year,month).map(item=>({...item,loanName:loans.get(item.loanId)?.n||'Kredit',derived:false}));
    return entries.sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  }
  function fixedPaymentEntries(year,month){
    const movements=state().creditMovements||[],lastDay=new Date(Number(year),Number(month)+1,0).getDate();return (state().kredite||[]).filter(loan=>root.creditType(loan)==='revolving').map(loan=>{const opening=root.creditBalanceAt(loan,year,month,movements),result=root.revolvingMonth(loan,opening,year,month,movements);return {id:`scheduled_${loan.id}_${year}_${month}`,loanId:loan.id,loanName:loan.n,type:'scheduledPayment',amount:result.scheduledPayment,interest:result.interest,principal:result.scheduledPrincipal,date:`${year}-${String(Number(month)+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`,year:Number(year),month:Number(month),derived:true};}).filter(item=>item.amount>0);
  }
  root.CreditMovementStore=Object.freeze({all,forLoan,forMonth,add,remove,removeForLoan,validateLoan,validateDataset,monthlyTotals,displayEntries,fixedPaymentEntries});
})(typeof globalThis!=='undefined'?globalThis:window);
