/* Reine Kredit-Fachlogik. Keine App-State-, DOM- oder UI-Abhängigkeiten. */
'use strict';

function creditStartAmount(k){
  const start=Number(k.s ?? k.startAmount);
  if(Number.isFinite(start)&&start>=0)return start;
  const legacy=Number(k.r||0)+Number(k.g||0);
  return Math.max(0,legacy);
}
function creditType(k){return k?.type==='revolving'?'revolving':'installment';}
function creditReferenceYear(k){const value=Number(k.balanceYear ?? k.ry);return Number.isInteger(value)?value:new Date().getFullYear();}
function creditReferenceMonth(k){const value=Number(k.balanceMonth ?? k.rm);return Number.isInteger(value)&&value>=0&&value<=11?value:new Date().getMonth();}
function creditMonthNumber(year,month){return Number(year)*12+Number(month);}
function creditRound(value){return Math.round((Number(value)||0)*100)/100;}
function creditDate(year,month,day=1){return new Date(Date.UTC(Number(year),Number(month),Number(day)));}
function creditMovementDate(item){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(item?.date||''));
  if(!match)return null;
  const date=creditDate(Number(match[1]),Number(match[2])-1,Number(match[3]));
  return date.getUTCFullYear()===Number(match[1])&&date.getUTCMonth()===Number(match[2])-1&&date.getUTCDate()===Number(match[3])?date:null;
}
function creditDayFraction(start,end,convention='act365'){
  if(convention==='30e360'){
    const y1=start.getUTCFullYear(),m1=start.getUTCMonth()+1,d1=Math.min(30,start.getUTCDate());
    const y2=end.getUTCFullYear(),m2=end.getUTCMonth()+1,d2=Math.min(30,end.getUTCDate());
    return (360*(y2-y1)+30*(m2-m1)+d2-d1)/360;
  }
  return (end-start)/86400000/(convention==='act360'?360:365);
}
function creditMovementsInMonth(movements,loanId,year,month,types){
  const allowed=new Set(types||[]);
  return (Array.isArray(movements)?movements:[]).filter(item=>String(item.loanId||'')===String(loanId||'')&&Number(item.year)===Number(year)&&Number(item.month)===Number(month)&&(!allowed.size||allowed.has(item.type))).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id||'').localeCompare(String(b.id||'')));
}
function installmentMonth(k,openingBalance,year,month,movements=[]){
  const opening=Math.max(0,Number(openingBalance)||0),monthlyRate=Math.max(0,Number(k.z||0))/1200,interest=opening*monthlyRate;
  const regularPayment=Math.min(Math.max(0,Number(k.m)||0),opening+interest),afterRegular=Math.max(0,opening+interest-regularPayment);
  const requestedSpecial=creditMovementsInMonth(movements,k.id,year,month,['specialRepayment']).reduce((sum,item)=>sum+Math.max(0,Number(item.amount)||0),0);
  const specialRepayment=Math.min(afterRegular,requestedSpecial),closingBalance=Math.max(0,afterRegular-specialRepayment);
  return {openingBalance:creditRound(opening),interest:creditRound(interest),regularPayment:creditRound(regularPayment),requestedSpecial:creditRound(requestedSpecial),specialRepayment:creditRound(specialRepayment),closingBalance:creditRound(closingBalance)};
}
function revolvingMonth(k,openingBalance,year,month,movements=[]){
  const start=creditDate(year,month,1),end=creditDate(year,Number(month)+1,1),annualRate=Math.max(0,Number(k.z)||0)/100,limit=Math.max(0,Number(k.limit)||0),convention=['act360','30e360'].includes(k.dayCountConvention)?k.dayCountConvention:'act365';
  let balance=Math.max(0,Number(openingBalance)||0),interest=0,drawdowns=0,repayments=0,cursor=start,overpayment=false,limitExceeded=balance>limit+0.005;
  const entries=creditMovementsInMonth(movements,k.id,year,month,['drawdown','repayment']);
  for(const item of entries){
    const date=creditMovementDate(item);if(!date||date<start||date>=end)continue;
    interest+=balance*annualRate*creditDayFraction(cursor,date,convention);
    const amount=Math.max(0,Number(item.amount)||0);
    if(item.type==='drawdown'){balance+=amount;drawdowns+=amount;if(balance>limit+0.005)limitExceeded=true;}else{if(amount>balance+0.005)overpayment=true;const applied=Math.min(balance,amount);balance-=applied;repayments+=applied;}
    cursor=date;
  }
  interest+=balance*annualRate*creditDayFraction(cursor,end,convention);
  const roundedInterest=creditRound(interest),configuredPayment=Math.max(0,Number(k.m)||0),scheduledPrincipal=Math.min(balance,Math.max(0,configuredPayment-roundedInterest)),scheduledPayment=roundedInterest+scheduledPrincipal;
  balance=Math.max(0,balance-scheduledPrincipal);
  return {openingBalance:creditRound(openingBalance),interest:roundedInterest,drawdowns:creditRound(drawdowns),repayments:creditRound(repayments),scheduledPayment:creditRound(scheduledPayment),scheduledPrincipal:creditRound(scheduledPrincipal),closingBalance:creditRound(balance),available:creditRound(Math.max(0,limit-balance)),limitExceeded,overpayment};
}
function creditBalanceAt(k,year,month,movements=[]){
  if(creditType(k)==='revolving'){
    let balance=Math.max(0,Number(k.r||0));const reference=creditMonthNumber(creditReferenceYear(k),creditReferenceMonth(k)),target=creditMonthNumber(year,month);
    if(target<reference)return balance;
    for(let index=reference;index<target;index++){const y=Math.floor(index/12),m=index-y*12;balance=revolvingMonth(k,balance,y,m,movements).closingBalance;}
    return creditRound(balance);
  }
  let balance=Math.max(0,Number(k.r||0));
  const payment=Math.max(0,Number(k.m||0)),monthlyRate=Math.max(0,Number(k.z||0))/1200;
  const reference=creditMonthNumber(creditReferenceYear(k),creditReferenceMonth(k)),target=creditMonthNumber(year,month),difference=target-reference;
  if(difference>0){for(let i=0;i<difference&&balance>0.005;i++){const index=reference+i,y=Math.floor(index/12),m=index-y*12;balance=installmentMonth(k,balance,y,m,movements).closingBalance;}}
  else if(difference<0){for(let i=0;i<Math.abs(difference);i++){balance=monthlyRate>0?(balance+payment)/(1+monthlyRate):balance+payment;balance=Math.min(creditStartAmount(k)||balance,balance);}}
  return creditRound(balance);
}
function creditInterestAt(k,year,month,movements=[]){const balance=creditBalanceAt(k,year,month,movements);return creditType(k)==='revolving'?revolvingMonth(k,balance,year,month,movements).interest:creditRound(balance*(Math.max(0,Number(k.z||0))/1200));}
function creditPrincipalAt(k,year,month,movements=[]){if(creditType(k)==='revolving')return revolvingMonth(k,creditBalanceAt(k,year,month,movements),year,month,movements).scheduledPrincipal;const balance=creditBalanceAt(k,year,month,movements);if(balance<=0)return 0;return creditRound(Math.max(0,Math.min(balance,Number(k.m||0)-creditInterestAt(k,year,month,movements))));}
function creditPaidAmountAt(k,year,month,movements=[]){return Math.max(0,creditRound(creditStartAmount(k)-creditBalanceAt(k,year,month,movements)));}
function creditRemainingMonthsFrom(k,year,month,movements=[]){
  if(creditType(k)==='revolving')return null;
  const opening=creditBalanceAt(k,year,month,movements);let balance=installmentMonth(k,opening,year,month,movements).closingBalance;const payment=Math.max(0,Number(k.m||0)),monthlyRate=Math.max(0,Number(k.z||0))/1200;
  if(balance<=0)return 0;if(payment<=0||(monthlyRate>0&&payment<=balance*monthlyRate))return null;
  let months=0;while(balance>0.005&&months<1200){balance=Math.max(0,balance+balance*monthlyRate-payment);months++;}return months>=1200?null:months;
}
function creditEndDateAt(k,year,month,movements=[]){if(creditType(k)==='revolving')return 'Unbefristet';const remaining=creditRemainingMonthsFrom(k,year,month,movements);if(remaining===null)return 'Rate zu niedrig';const date=new Date(Number(year),Number(month)+remaining,1);return date.toLocaleDateString('de-DE',{month:'2-digit',year:'numeric'});}
function amortizeCredit(principal,annualRate,monthlyPayment){
  let balance=Math.max(0,Number(principal)||0);const payment=Math.max(0,Number(monthlyPayment)||0),monthlyRate=Math.max(0,Number(annualRate)||0)/1200;let months=0,interest=0;
  if(balance<=0)return{months:0,interest:0,total:0};if(payment<=0||(monthlyRate>0&&payment<=balance*monthlyRate))return null;
  while(balance>0.005&&months<1200){const monthInterest=balance*monthlyRate;interest+=monthInterest;balance=Math.max(0,balance+monthInterest-payment);months++;}
  if(months>=1200)return null;return{months,interest,total:Number(principal||0)+interest};
}
function specialRepaymentAnalysis(loan,year,month,amount,movements=[]){
  const opening=creditBalanceAt(loan,year,month,movements),currentPrincipal=installmentMonth(loan,opening,year,month,movements).closingBalance,baseline=amortizeCredit(currentPrincipal,loan.z,loan.m),reducedPrincipal=Math.max(0,currentPrincipal-Math.max(0,Number(amount)||0)),withPayment=amortizeCredit(reducedPrincipal,loan.z,loan.m);
  if(!baseline||!withPayment)return null;
  return{currentPrincipal,reducedPrincipal,baseline,withPayment,savedMonths:Math.max(0,baseline.months-withPayment.months),savedInterest:Math.max(0,baseline.interest-withPayment.interest)};
}
