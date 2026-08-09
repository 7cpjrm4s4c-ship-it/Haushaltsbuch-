/* Adapter zwischen App-Zustand und reiner ForecastEngine. */
'use strict';

function forecastCreditSchedule(startYear,startMonth,endYear,endMonth=11,eventsOverride){
  const events=Array.isArray(eventsOverride)?eventsOverride:(S.financialEvents||[]);
  const balances=new Map((S.kredite||[]).map(credit=>[credit.id,Math.max(0,Number(creditBalanceAt(credit,startYear,startMonth))||0)]));
  const rows=new Map();
  const start=ForecastEngine.monthIndex(startYear,startMonth),end=ForecastEngine.monthIndex(endYear,endMonth);
  for(let index=start;index<=end;index++){
    const {year,month}=ForecastEngine.fromMonthIndex(index);
    let creditPayments=0,openingDebt=0,debt=0,specialRepayment=0;
    for(const credit of S.kredite||[]){
      let balance=Math.max(0,Number(balances.get(credit.id))||0);
      openingDebt+=balance;
      if(balance<=0.005){balances.set(credit.id,0);continue;}
      const monthlyRate=Math.max(0,Number(credit.z||0))/1200;
      const interest=balance*monthlyRate;
      const regularPayment=Math.min(Math.max(0,Number(credit.m)||0),balance+interest);
      const requested=typeof FinancialEvents!=='undefined'?FinancialEvents.specialRepaymentForLoan(events,credit.id,year,month):0;
      const afterRegular=Math.max(0,balance+interest-regularPayment);
      const appliedSpecial=Math.min(afterRegular,Math.max(0,Number(requested)||0));
      creditPayments+=regularPayment;specialRepayment+=appliedSpecial;
      balance=Math.max(0,afterRegular-appliedSpecial);
      debt+=balance;
      balances.set(credit.id,balance);
    }
    rows.set(`${year}-${month}`,{creditPayments,openingDebt,debt,specialRepayment});
  }
  return rows;
}

function forecastBaseMonths(startYear,startMonth,endYear,endMonth=11,eventsOverride){
  const rows=[];
  const start=ForecastEngine.monthIndex(startYear,startMonth),end=ForecastEngine.monthIndex(endYear,endMonth);
  if(end<start)throw new RangeError('Prognoseende liegt vor dem Startmonat');
  if(end-start>600)throw new RangeError('Prognosezeitraum ist zu groß');
  const events=Array.isArray(eventsOverride)?eventsOverride:(S.financialEvents||[]);
  const creditSchedule=forecastCreditSchedule(startYear,startMonth,endYear,endMonth,events);
  for(let index=start;index<=end;index++){
    const {year,month}=ForecastEngine.fromMonthIndex(index);let income=0,fixed=0,savings=0;
    for(const cat of S.cats){
      if(cat.t==='V'||cat.t==='K')continue;
      const value=Math.max(0,Number(gv(year,month,cat))||0);
      if(cat.t==='E')income+=value;else if(cat.t==='F')fixed+=value;else if(cat.t==='S')savings+=value;
    }
    const credit=creditSchedule.get(`${year}-${month}`)||{creditPayments:0,openingDebt:0,debt:0,specialRepayment:0};
    rows.push({year,month,income,fixed,savings,creditPayments:credit.creditPayments,openingDebt:credit.openingDebt,debt:credit.debt,specialRepayment:credit.specialRepayment});
  }
  return typeof FinancialEvents!=='undefined'?FinancialEvents.applyToBaseMonths(rows,events):rows;
}

function buildForecastInput(ui,assetBreakdown,assumptions,eventsOverride){
  const variableIds=S.cats.filter(cat=>cat.t==='V').map(cat=>cat.id);
  const variableBaseline=ForecastEngine.historicalVariableAverage({bookings:S.buchungen,variableCategoryIds:variableIds,baseYear:S.year,baseMonth:S.month,lookbackMonths:ui.lookbackMonths});
  return {baseMonths:forecastBaseMonths(S.year,S.month,ui.endYear,11,eventsOverride),variableBaseline,annualInflation:ui.annualInflation,scenarioKey:ui.scenarioKey,startAssetBreakdown:{...(assetBreakdown||{})},annualReturns:{...(assumptions?.annualReturns||{})},purchasingPowerInflation:Number(assumptions?.purchasingPowerInflation)||0,savingsTarget:assumptions?.savingsTarget||'etf'};
}
