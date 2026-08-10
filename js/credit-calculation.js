/* Reine Kredit-Fachlogik. Keine App-State-, DOM- oder UI-Abhängigkeiten. */
'use strict';

function creditStartAmount(k){
  const start=Number(k.s ?? k.startAmount);
  if(Number.isFinite(start)&&start>=0)return start;
  const legacy=Number(k.r||0)+Number(k.g||0);
  return Math.max(0,legacy);
}
function creditReferenceYear(k){const value=Number(k.balanceYear ?? k.ry);return Number.isInteger(value)?value:new Date().getFullYear();}
function creditReferenceMonth(k){const value=Number(k.balanceMonth ?? k.rm);return Number.isInteger(value)&&value>=0&&value<=11?value:new Date().getMonth();}
function creditMonthNumber(year,month){return Number(year)*12+Number(month);}
function creditBalanceAt(k,year,month){
  let balance=Math.max(0,Number(k.r||0));
  const payment=Math.max(0,Number(k.m||0)),monthlyRate=Math.max(0,Number(k.z||0))/1200;
  const reference=creditMonthNumber(creditReferenceYear(k),creditReferenceMonth(k)),target=creditMonthNumber(year,month),difference=target-reference;
  if(difference>0){for(let i=0;i<difference&&balance>0.005;i++){const interest=balance*monthlyRate;balance=Math.max(0,balance+interest-payment);}}
  else if(difference<0){for(let i=0;i<Math.abs(difference);i++){balance=monthlyRate>0?(balance+payment)/(1+monthlyRate):balance+payment;balance=Math.min(creditStartAmount(k)||balance,balance);}}
  return Math.round(balance*100)/100;
}
function creditInterestAt(k,year,month){const balance=creditBalanceAt(k,year,month);return Math.round(balance*(Math.max(0,Number(k.z||0))/1200)*100)/100;}
function creditPrincipalAt(k,year,month){const balance=creditBalanceAt(k,year,month);if(balance<=0)return 0;return Math.round(Math.max(0,Math.min(balance,Number(k.m||0)-creditInterestAt(k,year,month)))*100)/100;}
function creditPaidAmountAt(k,year,month){return Math.max(0,Math.round((creditStartAmount(k)-creditBalanceAt(k,year,month))*100)/100);}
function creditRemainingMonthsFrom(k,year,month){
  let balance=creditBalanceAt(k,year,month);const payment=Math.max(0,Number(k.m||0)),monthlyRate=Math.max(0,Number(k.z||0))/1200;
  if(balance<=0)return 0;if(payment<=0||(monthlyRate>0&&payment<=balance*monthlyRate))return null;
  let months=0;while(balance>0.005&&months<1200){balance=Math.max(0,balance+balance*monthlyRate-payment);months++;}return months>=1200?null:months;
}
function creditEndDateAt(k,year,month){const remaining=creditRemainingMonthsFrom(k,year,month);if(remaining===null)return 'Rate zu niedrig';const date=new Date(Number(year),Number(month)+remaining,1);return date.toLocaleDateString('de-DE',{month:'2-digit',year:'numeric'});}
function amortizeCredit(principal,annualRate,monthlyPayment){
  let balance=Math.max(0,Number(principal)||0);const payment=Math.max(0,Number(monthlyPayment)||0),monthlyRate=Math.max(0,Number(annualRate)||0)/1200;let months=0,interest=0;
  if(balance<=0)return{months:0,interest:0,total:0};if(payment<=0||(monthlyRate>0&&payment<=balance*monthlyRate))return null;
  while(balance>0.005&&months<1200){const monthInterest=balance*monthlyRate;interest+=monthInterest;balance=Math.max(0,balance+monthInterest-payment);months++;}
  if(months>=1200)return null;return{months,interest,total:Number(principal||0)+interest};
}
function specialRepaymentAnalysis(loan,year,month,amount){
  const currentPrincipal=creditBalanceAt(loan,year,month),baseline=amortizeCredit(currentPrincipal,loan.z,loan.m),reducedPrincipal=Math.max(0,currentPrincipal-Math.max(0,Number(amount)||0)),withPayment=amortizeCredit(reducedPrincipal,loan.z,loan.m);
  if(!baseline||!withPayment)return null;
  return{currentPrincipal,reducedPrincipal,baseline,withPayment,savedMonths:Math.max(0,baseline.months-withPayment.months),savedInterest:Math.max(0,baseline.interest-withPayment.interest)};
}
