/* Reine Prognoselogik. Keine DOM- oder App-Abhängigkeiten. */
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
  function fromMonthIndex(index){return {year:Math.floor(Number(index)/12),month:((Number(index)%12)+12)%12};}
  function round2(value){return Math.round((Number(value)||0)*100)/100;}

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

  function normalizeBaseMonth(item){
    return {
      year:Number(item?.year),month:Number(item?.month),
      income:Math.max(0,Number(item?.income)||0),fixed:Math.max(0,Number(item?.fixed)||0),
      savings:Math.max(0,Number(item?.savings)||0),creditPayments:Math.max(0,Number(item?.creditPayments)||0),
      debt:Math.max(0,Number(item?.debt)||0),
    };
  }

  function startAssetBuckets(input){
    const hasBuckets=Number.isFinite(Number(input?.startLiquidity))||Number.isFinite(Number(input?.startInvestments));
    if(hasBuckets){
      return {
        liquidity:Math.max(0,Number(input?.startLiquidity)||0),
        investments:Math.max(0,Number(input?.startInvestments)||0),
      };
    }
    return {liquidity:Math.max(0,Number(input?.startAssets)||0),investments:0};
  }

  function project(input){
    const baseMonths=Array.isArray(input?.baseMonths)?input.baseMonths.map(normalizeBaseMonth):[];
    const start=startAssetBuckets(input);
    const startAssets=round2(start.liquidity+start.investments);
    if(!baseMonths.length)return {months:[],years:[],summary:{startAssets,startLiquidity:round2(start.liquidity),startInvestments:round2(start.investments),endAssets:startAssets,endLiquidity:round2(start.liquidity),endInvestments:round2(start.investments),endDebt:0,endNetWorth:startAssets,cumulative:0,minLiquidity:round2(start.liquidity),minLiquidityYear:null,minLiquidityMonth:null}};
    if(baseMonths.length>601)throw new RangeError('Prognosezeitraum ist zu groß');

    const months=[];
    let cumulative=0,accumulatedSavings=0;
    let liquidity=start.liquidity;
    let investments=start.investments;
    let minLiquidity=liquidity;
    let minLiquidityYear=baseMonths[0].year;
    let minLiquidityMonth=baseMonths[0].month;

    for(let i=0;i<baseMonths.length;i++){
      const base=baseMonths[i];
      const variable=variableValue(input.variableBaseline,i,input.annualInflation,input.scenarioKey);
      const expenses=base.fixed+variable+base.creditPayments+base.savings;
      const saldo=base.income-expenses;
      cumulative+=saldo;
      accumulatedSavings+=base.savings;
      liquidity+=saldo;
      investments+=base.savings;
      const assets=liquidity+investments;
      const netWorth=assets-base.debt;
      if(liquidity<minLiquidity){
        minLiquidity=liquidity;
        minLiquidityYear=base.year;
        minLiquidityMonth=base.month;
      }
      months.push({...base,variable:round2(variable),expenses:round2(expenses),saldo:round2(saldo),cumulative:round2(cumulative),accumulatedSavings:round2(accumulatedSavings),liquidity:round2(liquidity),investments:round2(investments),assets:round2(assets),netWorth:round2(netWorth)});
    }
    const years=aggregateYears(months);
    const last=months[months.length-1];
    return {months,years,summary:{startAssets,startLiquidity:round2(start.liquidity),startInvestments:round2(start.investments),endAssets:last.assets,endLiquidity:last.liquidity,endInvestments:last.investments,endDebt:last.debt,endNetWorth:last.netWorth,cumulative:last.cumulative,minLiquidity:round2(minLiquidity),minLiquidityYear,minLiquidityMonth}};
  }

  function aggregateYears(months){
    const map=new Map();
    for(const item of months||[]){
      if(!map.has(item.year))map.set(item.year,{year:item.year,income:0,fixed:0,variable:0,creditPayments:0,savings:0,expenses:0,saldo:0,endDebt:0,endCumulative:0,endLiquidity:0,endInvestments:0,endAssets:0,endNetWorth:0});
      const row=map.get(item.year);
      row.income+=item.income;row.fixed+=item.fixed;row.variable+=item.variable;row.creditPayments+=item.creditPayments;row.savings+=item.savings;row.expenses+=item.expenses;row.saldo+=item.saldo;
      row.endDebt=item.debt;row.endCumulative=item.cumulative;row.endLiquidity=item.liquidity;row.endInvestments=item.investments;row.endAssets=item.assets;row.endNetWorth=item.netWorth;
    }
    return [...map.values()].map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,key==='year'?value:round2(value)])));
  }

  return Object.freeze({SCENARIOS,monthIndex,fromMonthIndex,historicalVariableAverage,variableValue,project,aggregateYears});
});