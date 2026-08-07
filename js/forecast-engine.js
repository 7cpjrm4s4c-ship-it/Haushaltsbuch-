/* Reine Prognoselogik ohne DOM-Zugriffe. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ForecastEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCENARIOS=Object.freeze({
    optimistic:Object.freeze({key:'optimistic',label:'Optimistisch',variableFactor:0.95}),
    realistic:Object.freeze({key:'realistic',label:'Realistisch',variableFactor:1}),
    cautious:Object.freeze({key:'cautious',label:'Vorsichtig',variableFactor:1.10}),
  });

  function monthIndex(year,month){return Number(year)*12+Number(month);}
  function fromMonthIndex(index){
    const year=Math.floor(Number(index)/12);
    const month=((Number(index)%12)+12)%12;
    return {year,month};
  }
  function round2(value){return Math.round((Number(value)||0)*100)/100;}

  function historicalVariableAverage(options){
    const bookings=Array.isArray(options.bookings)?options.bookings:[];
    const variableIds=new Set(options.variableCategoryIds||[]);
    const months=Math.max(1,Math.min(24,Number(options.lookbackMonths)||3));
    const end=monthIndex(options.baseYear,options.baseMonth)-1;
    let total=0;
    for(let offset=0;offset<months;offset++){
      const point=fromMonthIndex(end-offset);
      total+=bookings
        .filter(item=>Number(item.year)===point.year&&Number(item.month)===point.month&&variableIds.has(item.catId))
        .reduce((sum,item)=>sum+Number(item.betrag||0),0);
    }
    return round2(total/months);
  }

  function variableValue(baseAmount,monthsFromStart,annualInflation,scenarioKey){
    const scenario=SCENARIOS[scenarioKey]||SCENARIOS.realistic;
    const inflation=Math.max(-99,Number(annualInflation)||0)/100;
    const factor=Math.pow(1+inflation,Math.max(0,Number(monthsFromStart)||0)/12);
    return round2(Math.max(0,Number(baseAmount)||0)*scenario.variableFactor*factor);
  }

  function creditPaymentForMonth(credit,year,month,creditBalanceAt,creditInterestAt){
    const balance=Math.max(0,Number(creditBalanceAt(credit,year,month))||0);
    if(balance<=0.005)return 0;
    const contractual=Math.max(0,Number(credit.m)||0);
    const interest=Math.max(0,Number(creditInterestAt(credit,year,month))||0);
    return round2(Math.min(contractual,balance+interest));
  }

  function project(options){
    const start=monthIndex(options.startYear,options.startMonth);
    const end=monthIndex(options.endYear,options.endMonth??11);
    if(end<start)throw new RangeError('Prognoseende liegt vor dem Startmonat');
    if(end-start>600)throw new RangeError('Prognosezeitraum ist zu groß');

    const categories=Array.isArray(options.categories)?options.categories:[];
    const credits=Array.isArray(options.credits)?options.credits:[];
    const categoryValue=options.categoryValue;
    const creditBalanceAt=options.creditBalanceAt;
    const creditInterestAt=options.creditInterestAt;
    if(typeof categoryValue!=='function'||typeof creditBalanceAt!=='function'||typeof creditInterestAt!=='function'){
      throw new TypeError('Prognose benötigt Berechnungsfunktionen');
    }

    const startAssets=Math.max(0,Number(options.startAssets)||0);
    const months=[];
    let cumulative=0;
    let accumulatedSavings=0;
    for(let index=start;index<=end;index++){
      const {year,month}=fromMonthIndex(index);
      let income=0,fixed=0,savings=0;
      for(const cat of categories){
        if(cat.t==='V'||cat.t==='K')continue;
        const value=Math.max(0,Number(categoryValue(year,month,cat))||0);
        if(cat.t==='E')income+=value;
        else if(cat.t==='F')fixed+=value;
        else if(cat.t==='S')savings+=value;
      }

      const variable=variableValue(options.variableBaseline,index-start,options.annualInflation,options.scenarioKey);
      const creditPayments=credits.reduce((sum,credit)=>sum+creditPaymentForMonth(credit,year,month,creditBalanceAt,creditInterestAt),0);
      const debt=credits.reduce((sum,credit)=>sum+Math.max(0,Number(creditBalanceAt(credit,year,month))||0),0);
      const expenses=fixed+variable+creditPayments+savings;
      const saldo=income-expenses;
      cumulative+=saldo;
      accumulatedSavings+=savings;
      const assets=startAssets+cumulative+accumulatedSavings;
      const netWorth=assets-debt;
      months.push({
        year,month,
        income:round2(income),fixed:round2(fixed),variable:round2(variable),
        creditPayments:round2(creditPayments),savings:round2(savings),
        expenses:round2(expenses),saldo:round2(saldo),cumulative:round2(cumulative),debt:round2(debt),
        accumulatedSavings:round2(accumulatedSavings),assets:round2(assets),netWorth:round2(netWorth),
      });
    }
    return months;
  }

  function aggregateYears(months){
    const map=new Map();
    for(const item of months||[]){
      if(!map.has(item.year))map.set(item.year,{year:item.year,income:0,fixed:0,variable:0,creditPayments:0,savings:0,expenses:0,saldo:0,endDebt:0,endCumulative:0,endAssets:0,endNetWorth:0});
      const row=map.get(item.year);
      row.income+=item.income;row.fixed+=item.fixed;row.variable+=item.variable;
      row.creditPayments+=item.creditPayments;row.savings+=item.savings;row.expenses+=item.expenses;row.saldo+=item.saldo;
      row.endDebt=item.debt;row.endCumulative=item.cumulative;row.endAssets=item.assets;row.endNetWorth=item.netWorth;
    }
    return [...map.values()].map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,key==='year'?value:round2(value)])));
  }

  return Object.freeze({SCENARIOS,monthIndex,fromMonthIndex,historicalVariableAverage,variableValue,creditPaymentForMonth,project,aggregateYears});
});