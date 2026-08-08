/* Zentrales Schema für den persistierten App-Zustand. Keine DOM-Abhängigkeiten. */
'use strict';

(function(root){
  const CURRENT_VERSION = 6;
  const ASSET_FIELDS=['cash','callMoney','fixedDeposit','etf','depot','other'];
  const SAVINGS_TARGETS=new Set(ASSET_FIELDS);
  const SCENARIO_KEYS=new Set(['optimistic','realistic','cautious']);
  const LOOKBACKS=new Set([3,6,12]);
  const GOAL_TYPES=new Set(['minLiquidity','netWorth','investments','debtFree','wealthGrowth']);

  function isRecord(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
  function objectOrEmpty(value){return isRecord(value)?value:{};}
  function arrayOrEmpty(value){return Array.isArray(value)?value:[];}
  function finite(value,fallback=0){const number=Number(value);return Number.isFinite(number)?number:fallback;}
  function clamp(value,min,max,fallback=0){return Math.min(max,Math.max(min,finite(value,fallback)));}

  function normalizeYears(value,fallbackYears){
    const years=arrayOrEmpty(value).map(Number).filter(year=>Number.isInteger(year)&&year>=2000&&year<=2200);
    const unique=[...new Set(years)].sort((a,b)=>a-b);
    if(unique.length)return unique;
    const fallback=typeof fallbackYears==='function'?fallbackYears():fallbackYears;
    return arrayOrEmpty(fallback).map(Number).filter(Number.isInteger).sort((a,b)=>a-b);
  }

  function normalizeForecastAssets(value){
    const source=objectOrEmpty(value),result={};
    for(const field of ASSET_FIELDS){const amount=Number(source[field]);result[field]=Number.isFinite(amount)&&amount>=0?amount:0;}
    return result;
  }

  function normalizeForecastAssumptions(value){
    const source=objectOrEmpty(value),returnsSource=objectOrEmpty(source.annualReturns),annualReturns={};
    for(const field of ASSET_FIELDS)annualReturns[field]=clamp(returnsSource[field],-99,100,0);
    const savingsTarget=SAVINGS_TARGETS.has(source.savingsTarget)?source.savingsTarget:'etf';
    return {annualReturns,purchasingPowerInflation:clamp(source.purchasingPowerInflation,-20,50,2),savingsTarget};
  }

  function normalizeFinancialEvents(value){
    return arrayOrEmpty(value).filter(isRecord).map(item=>({
      id:String(item.id||''),type:String(item.type||'oneTimeExpense'),title:String(item.title||'Finanzereignis'),
      startYear:finite(item.startYear,new Date().getFullYear()),startMonth:clamp(item.startMonth,0,11,0),
      endYear:item.endYear===null||item.endYear===undefined||item.endYear===''?null:finite(item.endYear,null),
      endMonth:item.endYear===null||item.endYear===undefined||item.endYear===''?null:clamp(item.endMonth,0,11,11),
      amount:Math.max(0,finite(item.amount,0)),enabled:item.enabled!==false,metadata:objectOrEmpty(item.metadata),
    }));
  }

  function normalizeForecastScenarios(value,baseYear){
    const currentYear=Number.isFinite(Number(baseYear))?Number(baseYear):new Date().getFullYear();
    return arrayOrEmpty(value).filter(isRecord).map(item=>{
      const ui=objectOrEmpty(item.ui);
      return {
        id:String(item.id||''),title:String(item.title||'Szenario'),
        ui:{scenarioKey:SCENARIO_KEYS.has(ui.scenarioKey)?ui.scenarioKey:'realistic',lookbackMonths:LOOKBACKS.has(Number(ui.lookbackMonths))?Number(ui.lookbackMonths):3,annualInflation:clamp(ui.annualInflation,-10,20,0),endYear:Math.max(currentYear+1,Math.min(currentYear+40,finite(ui.endYear,currentYear+5)))},
        assumptions:normalizeForecastAssumptions(item.assumptions),financialEvents:normalizeFinancialEvents(item.financialEvents),
        createdAt:String(item.createdAt||''),updatedAt:String(item.updatedAt||''),
      };
    });
  }

  function normalizeForecastGoals(value,baseYear){
    const currentYear=Number.isFinite(Number(baseYear))?Number(baseYear):new Date().getFullYear();
    return arrayOrEmpty(value).filter(isRecord).map(item=>{
      const type=GOAL_TYPES.has(item.type)?item.type:'netWorth';
      return {id:String(item.id||''),title:String(item.title||'Finanzziel'),type,targetAmount:type==='debtFree'?0:Math.max(0,finite(item.targetAmount,0)),targetYear:Math.max(currentYear,Math.min(currentYear+40,Math.floor(finite(item.targetYear,currentYear+5)))),targetMonth:Math.floor(clamp(item.targetMonth,0,11,11)),enabled:item.enabled!==false};
    });
  }

  function normalize(raw,options={}){
    const source=isRecord(raw)?raw:{},fallbackYears=typeof options.defaultYears==='function'?options.defaultYears():options.defaultYears,currentYear=Array.isArray(source.years)&&source.years.length?Math.min(...source.years.map(Number).filter(Number.isFinite)):Array.isArray(fallbackYears)&&fallbackYears.length?Math.min(...fallbackYears.map(Number).filter(Number.isFinite)):new Date().getFullYear();
    return {
      schemaVersion:CURRENT_VERSION,data:objectOrEmpty(source.data),cats:arrayOrEmpty(source.cats),kredite:arrayOrEmpty(source.kredite),
      years:normalizeYears(source.years,options.defaultYears),buchungen:arrayOrEmpty(source.buchungen),budgets:objectOrEmpty(source.budgets),
      recurringRules:arrayOrEmpty(source.recurringRules),annualAdjustments:arrayOrEmpty(source.annualAdjustments),percentageAdjustments:arrayOrEmpty(source.percentageAdjustments),
      amountAdjustments:arrayOrEmpty(source.amountAdjustments),oneTimeEntries:arrayOrEmpty(source.oneTimeEntries),forecastAssets:normalizeForecastAssets(source.forecastAssets),
      forecastAssumptions:normalizeForecastAssumptions(source.forecastAssumptions),financialEvents:normalizeFinancialEvents(source.financialEvents),forecastScenarios:normalizeForecastScenarios(source.forecastScenarios,currentYear),forecastGoals:normalizeForecastGoals(source.forecastGoals,currentYear),
    };
  }

  root.StateSchema=Object.freeze({CURRENT_VERSION,ASSET_FIELDS:Object.freeze([...ASSET_FIELDS]),normalize,isRecord,normalizeForecastAssumptions,normalizeFinancialEvents,normalizeForecastScenarios,normalizeForecastGoals});
})(typeof globalThis!=='undefined'?globalThis:window);
