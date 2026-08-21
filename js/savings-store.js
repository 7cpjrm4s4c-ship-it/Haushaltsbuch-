/**
 * State- und Fachgrenze fuer Sparanlagen und wertneutrale Kontotransfers.
 * Ein Guthaben gilt fuer den Monatsanfang des Referenzmonats.
 * @module SavingsStore
 */
'use strict';

(function(root){
  const monthIndex=(year,month)=>Number(year)*12+Number(month);
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const round2=value=>Math.round((Number(value)||0)*100)/100;
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function save(){if(typeof root.persist==='function')root.persist();}
  function accounts(){return clone(Array.isArray(state().savingsAccounts)?state().savingsAccounts:[]);}
  function transfers(){return clone(Array.isArray(state().savingsTransfers)?state().savingsTransfers:[]);}
  function find(id){return clone((state().savingsAccounts||[]).find(item=>item.id===id)||null);}
  function due(account,year,month){
    const amount=Math.max(0,Number(account.monthlyAmount)||0),interval=Math.max(1,Number(account.intervalMonths)||1);
    if(!amount)return 0;
    const current=monthIndex(year,month),start=monthIndex(account.startYear,account.startMonth);
    return current>=start&&(current-start)%interval===0?amount:0;
  }
  function movementsForMonth(year,month,accountId){
    let regularDeposits=0,individualDeposits=0,withdrawals=0;
    const account=(state().savingsAccounts||[]).find(item=>item.id===accountId);
    if(account)regularDeposits+=due(account,year,month);
    for(const item of state().savingsTransfers||[]){
      if(item.accountId!==accountId||Number(item.year)!==Number(year)||Number(item.month)!==Number(month))continue;
      if(item.direction==='withdrawal')withdrawals+=Number(item.amount)||0;else individualDeposits+=Number(item.amount)||0;
    }
    const deposits=regularDeposits+individualDeposits;
    return {regularDeposits:round2(regularDeposits),individualDeposits:round2(individualDeposits),deposits:round2(deposits),withdrawals:round2(withdrawals),net:round2(deposits-withdrawals)};
  }
  function monthlyTotals(year,month){
    const totals=(state().savingsAccounts||[]).reduce((sum,account)=>{const value=movementsForMonth(year,month,account.id);sum.regularDeposits+=value.regularDeposits;sum.individualDeposits+=value.individualDeposits;sum.deposits+=value.deposits;sum.withdrawals+=value.withdrawals;return sum;},{regularDeposits:0,individualDeposits:0,deposits:0,withdrawals:0});
    return Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,round2(value)]));
  }
  function balanceAtStart(accountId,year,month){
    const account=(state().savingsAccounts||[]).find(item=>item.id===accountId);if(!account)return null;
    const reference=monthIndex(account.balanceYear,account.balanceMonth),target=monthIndex(year,month);let balance=Number(account.openingBalance)||0;
    if(target<reference)return null;
    for(let index=reference;index<target;index++){const y=Math.floor(index/12),m=index%12;balance+=movementsForMonth(y,m,accountId).net;}
    return round2(balance);
  }
  function balanceAtEnd(accountId,year,month){const opening=balanceAtStart(accountId,year,month);return opening===null?null:round2(opening+movementsForMonth(year,month,accountId).net);}
  function totalAtEnd(year,month){return round2((state().savingsAccounts||[]).reduce((sum,item)=>sum+Math.max(0,balanceAtEnd(item.id,year,month)||0),0));}
  function addAccount(input,makeId){
    const item={id:makeId(),...clone(input)};state().savingsAccounts=Array.isArray(state().savingsAccounts)?state().savingsAccounts:[];state().savingsAccounts.push(item);save();return clone(item);
  }
  function updateAccount(id,changes){const item=(state().savingsAccounts||[]).find(entry=>entry.id===id);if(!item)return null;const previous=clone(item);Object.assign(item,clone(changes));const invalid=(state().savingsTransfers||[]).filter(entry=>entry.accountId===id&&entry.direction==='withdrawal').some(entry=>(balanceAtEnd(id,entry.year,entry.month)||0)<0);if(invalid){Object.assign(item,previous);throw new RangeError('Änderung würde ein vorhandenes Sparkonto-Guthaben unterschreiten');}save();return clone(item);}
  function removeAccount(id){
    const item=(state().savingsAccounts||[]).find(entry=>entry.id===id);if(!item)return null;
    state().savingsAccounts=(state().savingsAccounts||[]).filter(entry=>entry.id!==id);state().savingsTransfers=(state().savingsTransfers||[]).filter(entry=>entry.accountId!==id);save();return clone(item);
  }
  function addTransfer(input,makeId){
    const item={id:makeId(),...clone(input)},amount=Math.max(0,Number(item.amount)||0);if(!find(item.accountId))throw new Error('Sparanlage nicht gefunden');if(!amount)throw new RangeError('Transferbetrag muss größer als null sein');item.amount=round2(amount);
    if(item.direction==='withdrawal'){
      const available=balanceAtEnd(item.accountId,item.year,item.month);if(available===null)throw new RangeError('Transfer liegt vor dem Guthaben-Stichtag');if(round2(available-item.amount)<0)throw new RangeError('Guthaben der Sparanlage reicht nicht aus');
    }else item.direction='deposit';
    state().savingsTransfers=Array.isArray(state().savingsTransfers)?state().savingsTransfers:[];state().savingsTransfers.push(item);save();return clone(item);
  }
  function removeTransfer(id){const before=(state().savingsTransfers||[]).length;state().savingsTransfers=(state().savingsTransfers||[]).filter(item=>item.id!==id);const removed=before!==state().savingsTransfers.length;if(removed)save();return removed;}
  function forecastAccounts(year,month){return (state().savingsAccounts||[]).map(item=>({id:`savings_${item.id}`,name:item.name,bucket:item.bucket==='investments'?'investments':'liquidity',amount:Math.max(0,balanceAtStart(item.id,year,month)||0),annualReturn:Number(item.annualReturn)||0,managedSavingsAccount:true}));}
  root.SavingsStore=Object.freeze({accounts,transfers,find,due,movementsForMonth,monthlyTotals,balanceAtStart,balanceAtEnd,totalAtEnd,addAccount,updateAccount,removeAccount,addTransfer,removeTransfer,forecastAccounts});
})(typeof globalThis!=='undefined'?globalThis:window);
