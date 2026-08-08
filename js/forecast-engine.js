/* Reine Prognoselogik. Keine DOM- oder App-Abhängigkeiten. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ForecastEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const ASSET_FIELDS=Object.freeze(['cash','callMoney','fixedDeposit','etf','depot','other']);
  const LIQUID_FIELDS=new Set(['cash','callMoney','fixedDeposit']);
  const SCENARIOS=Object.freeze({
    optimistic:Object.freeze({key:'optimistic',label:'Optimistisch',variableFactor:0.95}),
    realistic:Object.freeze({key:'realistic',label:'Realistisch',variableFactor:1}),
    cautious:Object.freeze({key:'cautious',label:'Vorsichtig',variableFactor:1.10}),
  });

  function monthIndex(year,month){return Number(year)*12+Number(month);}
  function fromMonthIndex(index){return {year:Math.floor(Number(index)/12),month:((Number(index)%12)+12)%12};}
  function round2(value){return Math.round((Number(value)||0)*100)/100;}
  function clamp(value,min,max,fallback=0){const n=Number(value);return Math.min(max,Math.max(min,Number.isFinite(n)?n:fallback));}

  function historicalVariableAverage(options){
    const bookings=Array.isArray(options.bookings)?options.bookings:[];
    const variableIds=new Set(options.variableCategoryIds||[]);
    const months=Math.max(1,Math.min(24,Number(options.lookbackMonths)||3));
    const end=monthIndex(options.baseYear,options.baseMonth)-1;
    let total=0;
    for(let offset=0;offset<months;offset++){
      const point=fromMonthIndex(end-offset);
      total+=bookings.filter(item=>Number(item.year)===point.year&&Number(item.month)===point.month&&variableIds.has(item.catId)).reduce((sum,item)=>sum+Number(item.betrag||0),0);
    }
    return round2(total/months);
  }

  function variableValue(baseAmount,monthsFromStart,annualInflation,scenarioKey){
    const scenario=SCENARIOS[scenarioKey]||SCENARIOS.realistic;
    const inflation=Math.max(-99,Number(annualInflation)||0)/100;
    return round2(Math.max(0,Number(baseAmount)||0)*scenario.variableFactor*Math.pow(1+inflation,Math.max(0,Number(monthsFromStart)||0)/12));
  }

  function monthlyRate(annualPercent){const annual=clamp(annualPercent,-99,100,0)/100;return Math.pow(1+annual,1/12)-1;}

  function normalizeBaseMonth(item){
    return {
      year:Number(item?.year),month:Number(item?.month),income:Math.max(0,Number(item?.income)||0),fixed:Math.max(0,Number(item?.fixed)||0),
      savings:Math.max(0,Number(item?.savings)||0),creditPayments:Math.max(0,Number(item?.creditPayments)||0),
      specialRepayment:Math.max(0,Number(item?.specialRepayment)||0),debt:Math.max(0,Number(item?.debt)||0),
      financialEvents:Array.isArray(item?.financialEvents)?item.financialEvents.map(event=>({...event})):[],
    };
  }

  function normalizeAssets(input){
    const source=input?.startAssetBreakdown&&typeof input.startAssetBreakdown==='object'?input.startAssetBreakdown:null;
    const assets={};
    if(source){for(const field of ASSET_FIELDS)assets[field]=Math.max(0,Number(source[field])||0);return assets;}
    const liquidity=Math.max(0,Number(input?.startLiquidity)||0),investments=Math.max(0,Number(input?.startInvestments)||0);
    if(liquidity||investments)return {cash:liquidity,callMoney:0,fixedDeposit:0,etf:investments,depot:0,other:0};
    return {cash:Math.max(0,Number(input?.startAssets)||0),callMoney:0,fixedDeposit:0,etf:0,depot:0,other:0};
  }

  function normalizeReturns(input){const source=input?.annualReturns&&typeof input.annualReturns==='object'?input.annualReturns:{};return Object.fromEntries(ASSET_FIELDS.map(field=>[field,clamp(source[field],-99,100,0)]));}
  function sumFields(assets,fields){let sum=0;for(const field of fields)sum+=Number(assets[field]||0);return sum;}
  function assetTotals(assets){const liquidity=sumFields(assets,LIQUID_FIELDS),total=sumFields(assets,ASSET_FIELDS);return {liquidity,investments:total-liquidity,total};}
  function applyMonthlyReturns(assets,annualReturns){let earned=0;for(const field of ASSET_FIELDS){const balance=Number(assets[field]||0);if(balance<=0)continue;const gain=balance*monthlyRate(annualReturns[field]);assets[field]=balance+gain;earned+=gain;}return earned;}

  function project(input){
    const baseMonths=Array.isArray(input?.baseMonths)?input.baseMonths.map(normalizeBaseMonth):[];
    const assets=normalizeAssets(input),annualReturns=normalizeReturns(input);
    const startTotals=assetTotals(assets),startAssets=round2(startTotals.total);
    const savingsTarget=ASSET_FIELDS.includes(input?.savingsTarget)?input.savingsTarget:'etf';
    const realInflation=clamp(input?.purchasingPowerInflation,-20,50,2)/100;
    if(!baseMonths.length)return {months:[],years:[],summary:{startAssets,startLiquidity:round2(startTotals.liquidity),startInvestments:round2(startTotals.investments),endAssets:startAssets,endLiquidity:round2(startTotals.liquidity),endInvestments:round2(startTotals.investments),endDebt:0,endNetWorth:startAssets,endRealNetWorth:startAssets,cumulative:0,cumulativeReturns:0,totalSpecialRepayments:0,minLiquidity:round2(startTotals.liquidity),minLiquidityYear:null,minLiquidityMonth:null}};
    if(baseMonths.length>601)throw new RangeError('Prognosezeitraum ist zu groß');

    const months=[];let cumulative=0,accumulatedSavings=0,cumulativeReturns=0,totalSpecialRepayments=0;
    let minLiquidity=startTotals.liquidity,minLiquidityYear=baseMonths[0].year,minLiquidityMonth=baseMonths[0].month;
    for(let i=0;i<baseMonths.length;i++){
      const base=baseMonths[i],investmentReturn=applyMonthlyReturns(assets,annualReturns);cumulativeReturns+=investmentReturn;
      const variable=variableValue(input.variableBaseline,i,input.annualInflation,input.scenarioKey);
      const expenses=base.fixed+variable+base.creditPayments+base.specialRepayment+base.savings;
      const saldo=base.income-expenses;
      cumulative+=saldo;accumulatedSavings+=base.savings;totalSpecialRepayments+=base.specialRepayment;
      assets.cash=Number(assets.cash||0)+saldo;assets[savingsTarget]=Number(assets[savingsTarget]||0)+base.savings;
      const totals=assetTotals(assets),netWorth=totals.total-base.debt,inflationFactor=Math.pow(1+realInflation,(i+1)/12),realNetWorth=inflationFactor>0?netWorth/inflationFactor:netWorth;
      if(totals.liquidity<minLiquidity){minLiquidity=totals.liquidity;minLiquidityYear=base.year;minLiquidityMonth=base.month;}
      months.push({...base,variable:round2(variable),expenses:round2(expenses),saldo:round2(saldo),cumulative:round2(cumulative),accumulatedSavings:round2(accumulatedSavings),investmentReturn:round2(investmentReturn),cumulativeReturns:round2(cumulativeReturns),assetBreakdown:Object.fromEntries(ASSET_FIELDS.map(field=>[field,round2(assets[field])])),liquidity:round2(totals.liquidity),investments:round2(totals.investments),assets:round2(totals.total),netWorth:round2(netWorth),realNetWorth:round2(realNetWorth)});
    }
    const years=aggregateYears(months),last=months[months.length-1];
    return {months,years,summary:{startAssets,startLiquidity:round2(startTotals.liquidity),startInvestments:round2(startTotals.investments),endAssets:last.assets,endLiquidity:last.liquidity,endInvestments:last.investments,endDebt:last.debt,endNetWorth:last.netWorth,endRealNetWorth:last.realNetWorth,cumulative:last.cumulative,cumulativeReturns:last.cumulativeReturns,totalSpecialRepayments:round2(totalSpecialRepayments),minLiquidity:round2(minLiquidity),minLiquidityYear,minLiquidityMonth}};
  }

  function aggregateYears(months){
    const map=new Map();
    for(const item of months||[]){
      if(!map.has(item.year))map.set(item.year,{year:item.year,income:0,fixed:0,variable:0,creditPayments:0,specialRepayment:0,savings:0,investmentReturn:0,expenses:0,saldo:0,endDebt:0,endCumulative:0,endLiquidity:0,endInvestments:0,endAssets:0,endNetWorth:0,endRealNetWorth:0,eventCount:0});
      const row=map.get(item.year);row.income+=item.income;row.fixed+=item.fixed;row.variable+=item.variable;row.creditPayments+=item.creditPayments;row.specialRepayment+=item.specialRepayment;row.savings+=item.savings;row.investmentReturn+=item.investmentReturn;row.expenses+=item.expenses;row.saldo+=item.saldo;row.eventCount+=item.financialEvents.length;
      row.endDebt=item.debt;row.endCumulative=item.cumulative;row.endLiquidity=item.liquidity;row.endInvestments=item.investments;row.endAssets=item.assets;row.endNetWorth=item.netWorth;row.endRealNetWorth=item.realNetWorth;
    }
    return [...map.values()].map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,['year','eventCount'].includes(key)?value:round2(value)])));
  }

  return Object.freeze({ASSET_FIELDS,SCENARIOS,monthIndex,fromMonthIndex,historicalVariableAverage,variableValue,monthlyRate,project,aggregateYears});
});
