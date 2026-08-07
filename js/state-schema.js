/* Zentrales Schema für den persistierten App-Zustand. Keine DOM-Abhängigkeiten. */
'use strict';

(function(root){
  const CURRENT_VERSION = 3;
  const ASSET_FIELDS=['cash','callMoney','fixedDeposit','etf','depot','other'];
  const SAVINGS_TARGETS=new Set(ASSET_FIELDS);

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
    for(const field of ASSET_FIELDS){
      const amount=Number(source[field]);
      result[field]=Number.isFinite(amount)&&amount>=0?amount:0;
    }
    return result;
  }

  function normalizeForecastAssumptions(value){
    const source=objectOrEmpty(value);
    const returnsSource=objectOrEmpty(source.annualReturns);
    const annualReturns={};
    for(const field of ASSET_FIELDS)annualReturns[field]=clamp(returnsSource[field],-99,100,0);
    const savingsTarget=SAVINGS_TARGETS.has(source.savingsTarget)?source.savingsTarget:'etf';
    return {
      annualReturns,
      purchasingPowerInflation:clamp(source.purchasingPowerInflation,-20,50,2),
      savingsTarget,
    };
  }

  function normalize(raw,options={}){
    const source=isRecord(raw)?raw:{};
    return {
      schemaVersion:CURRENT_VERSION,
      data:objectOrEmpty(source.data),
      cats:arrayOrEmpty(source.cats),
      kredite:arrayOrEmpty(source.kredite),
      years:normalizeYears(source.years,options.defaultYears),
      buchungen:arrayOrEmpty(source.buchungen),
      budgets:objectOrEmpty(source.budgets),
      recurringRules:arrayOrEmpty(source.recurringRules),
      annualAdjustments:arrayOrEmpty(source.annualAdjustments),
      percentageAdjustments:arrayOrEmpty(source.percentageAdjustments),
      amountAdjustments:arrayOrEmpty(source.amountAdjustments),
      oneTimeEntries:arrayOrEmpty(source.oneTimeEntries),
      forecastAssets:normalizeForecastAssets(source.forecastAssets),
      forecastAssumptions:normalizeForecastAssumptions(source.forecastAssumptions),
    };
  }

  root.StateSchema=Object.freeze({CURRENT_VERSION,ASSET_FIELDS:Object.freeze([...ASSET_FIELDS]),normalize,isRecord,normalizeForecastAssumptions});
})(typeof globalThis!=='undefined'?globalThis:window);
