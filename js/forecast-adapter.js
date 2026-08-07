/* Adapter zwischen App-Zustand und reiner ForecastEngine. */
'use strict';

function forecastBaseMonths(startYear,startMonth,endYear,endMonth=11){
  const rows=[];
  const start=ForecastEngine.monthIndex(startYear,startMonth);
  const end=ForecastEngine.monthIndex(endYear,endMonth);
  if(end<start)throw new RangeError('Prognoseende liegt vor dem Startmonat');
  if(end-start>600)throw new RangeError('Prognosezeitraum ist zu groß');

  for(let index=start;index<=end;index++){
    const {year,month}=ForecastEngine.fromMonthIndex(index);
    let income=0,fixed=0,savings=0;
    for(const cat of S.cats){
      if(cat.t==='V'||cat.t==='K')continue;
      const value=Math.max(0,Number(gv(year,month,cat))||0);
      if(cat.t==='E')income+=value;
      else if(cat.t==='F')fixed+=value;
      else if(cat.t==='S')savings+=value;
    }
    let creditPayments=0,debt=0;
    for(const credit of S.kredite){
      const balance=Math.max(0,Number(creditBalanceAt(credit,year,month))||0);
      debt+=balance;
      if(balance>0.005){
        const interest=Math.max(0,Number(creditInterestAt(credit,year,month))||0);
        creditPayments+=Math.min(Math.max(0,Number(credit.m)||0),balance+interest);
      }
    }
    rows.push({year,month,income,fixed,savings,creditPayments,debt});
  }
  return rows;
}

function buildForecastInput(ui,startAssets){
  const variableIds=S.cats.filter(cat=>cat.t==='V').map(cat=>cat.id);
  const variableBaseline=ForecastEngine.historicalVariableAverage({
    bookings:S.buchungen,
    variableCategoryIds:variableIds,
    baseYear:S.year,
    baseMonth:S.month,
    lookbackMonths:ui.lookbackMonths,
  });
  return {
    baseMonths:forecastBaseMonths(S.year,S.month,ui.endYear,11),
    variableBaseline,
    annualInflation:ui.annualInflation,
    scenarioKey:ui.scenarioKey,
    startAssets,
  };
}
