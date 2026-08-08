/* Neutrale Finanzziele und Zielbewertung. Keine DOM- oder App-Abhängigkeiten. */
(function(root){
  'use strict';
  const TYPES=Object.freeze({minLiquidity:'Mindestliquidität',netWorth:'Nettovermögen',investments:'Anlagevermögen',debtFree:'Schuldenfreiheit',wealthGrowth:'Vermögensaufbau'});
  const TYPE_KEYS=Object.freeze(Object.keys(TYPES));
  const monthIndex=(year,month)=>Number(year)*12+Number(month);
  const round2=value=>Math.round((Number(value)||0)*100)/100;
  const finite=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback;};
  function normalizeGoal(value,baseYear=new Date().getFullYear()){
    const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{},type=TYPE_KEYS.includes(source.type)?source.type:'netWorth',targetYear=Math.max(Number(baseYear),Math.floor(finite(source.targetYear,Number(baseYear)+5))),targetMonth=Math.min(11,Math.max(0,Math.floor(finite(source.targetMonth,11))));
    return {id:String(source.id||''),title:String(source.title||TYPES[type]),type,targetAmount:type==='debtFree'?0:Math.max(0,round2(source.targetAmount)),targetYear,targetMonth,enabled:source.enabled!==false};
  }
  function monthsUntilTarget(months,goal){const end=monthIndex(goal.targetYear,goal.targetMonth);return (months||[]).filter(row=>monthIndex(row.year,row.month)<=end);}
  function metricValue(row,type,startNetWorth=0){if(type==='minLiquidity')return Number(row.liquidity||0);if(type==='netWorth')return Number(row.netWorth||0);if(type==='investments')return Number(row.investments||0);if(type==='debtFree')return Number(row.debt||0);if(type==='wealthGrowth')return Number(row.netWorth||0)-Number(startNetWorth||0);return 0;}
  function evaluateGoal(rawGoal,forecast){
    const baseYear=forecast?.months?.[0]?.year||new Date().getFullYear(),goal=normalizeGoal(rawGoal,baseYear),allMonths=Array.isArray(forecast?.months)?forecast.months:[],months=monthsUntilTarget(allMonths,goal),startNetWorth=Number(forecast?.summary?.startAssets||0)-Number(forecast?.summary?.startDebt||0),targetIndex=monthIndex(goal.targetYear,goal.targetMonth),lastForecast=allMonths[allMonths.length-1],outsideHorizon=!lastForecast||targetIndex>monthIndex(lastForecast.year,lastForecast.month);
    if(!goal.enabled)return {goal,status:'disabled',achieved:false,firstAchieved:null,value:null,gap:null,critical:null};
    if(!months.length)return {goal,status:'outside',achieved:false,firstAchieved:null,value:null,gap:goal.targetAmount,critical:null};
    if(goal.type==='minLiquidity'){
      const critical=months.reduce((min,row)=>Number(row.liquidity||0)<Number(min.liquidity||0)?row:min,months[0]),achieved=!outsideHorizon&&Number(critical.liquidity||0)>=goal.targetAmount;
      return {goal,status:outsideHorizon?'outside':achieved?'achieved':'missed',achieved,firstAchieved:achieved?{year:months[0].year,month:months[0].month}:null,value:round2(critical.liquidity),gap:round2(Math.max(0,goal.targetAmount-Number(critical.liquidity||0))),critical:{year:critical.year,month:critical.month,value:round2(critical.liquidity)}};
    }
    const predicate=goal.type==='debtFree'?value=>value<=0.005:value=>value>=goal.targetAmount;
    const first=months.find(row=>predicate(metricValue(row,goal.type,startNetWorth)))||null,last=months[months.length-1],value=metricValue(last,goal.type,startNetWorth),achieved=Boolean(first),gap=goal.type==='debtFree'?Math.max(0,value):Math.max(0,goal.targetAmount-value),status=achieved?'achieved':outsideHorizon?'outside':'missed';
    return {goal,status,achieved,firstAchieved:first?{year:first.year,month:first.month}:null,value:round2(value),gap:round2(gap),critical:null};
  }
  function evaluateGoals(goals,forecast){return (goals||[]).map(goal=>evaluateGoal(goal,forecast));}
  root.ForecastGoals=Object.freeze({TYPES,TYPE_KEYS,normalizeGoal,evaluateGoal,evaluateGoals,metricValue});
})(typeof globalThis!=='undefined'?globalThis:window);
