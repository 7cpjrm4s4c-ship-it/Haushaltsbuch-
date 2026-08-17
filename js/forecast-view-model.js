/* Reines Datenmodell der Prognoseansicht. State-Zugriff ausschließlich über ForecastStateStore. */
'use strict';

const FORECAST_ASSET_LABELS={cash:'Kontostand / Liquidität',callMoney:'Tagesgeld',fixedDeposit:'Festgeld',etf:'ETF',depot:'Sonstiges Depot',other:'Sonstiges Vermögen'};

function forecastUi(){
  const baseYear=ForecastStateStore.year(),current=ForecastStateStore.forecastUi(),minEnd=baseYear+1;
  return {
    focus:['netWorth','debtFree','liquidity'].includes(current.focus)?current.focus:'netWorth',
    scenarioKey:current.scenarioKey||'realistic',
    lookbackMonths:[3,6,12].includes(Number(current.lookbackMonths))?Number(current.lookbackMonths):3,
    annualInflation:Number.isFinite(Number(current.annualInflation))?Number(current.annualInflation):0,
    endYear:Math.max(minEnd,Number(current.endYear)||baseYear+5),
  };
}

function forecastAssets(){
  const source=ForecastStateStore.assets(),result={};
  for(const key of Object.keys(FORECAST_ASSET_LABELS)){
    const amount=Number(source[key]);
    result[key]=Number.isFinite(amount)&&amount>=0?amount:0;
  }
  return result;
}

function forecastAssumptions(){
  const raw=ForecastStateStore.assumptions();
  if(typeof StateSchema!=='undefined'&&typeof StateSchema.normalizeForecastAssumptions==='function')return StateSchema.normalizeForecastAssumptions(raw);
  const annualReturns={};
  for(const key of Object.keys(FORECAST_ASSET_LABELS)){
    const value=Number(raw.annualReturns?.[key]);
    annualReturns[key]=Number.isFinite(value)?Math.max(-99,Math.min(100,value)):0;
  }
  return {
    annualReturns,
    purchasingPowerInflation:Number.isFinite(Number(raw.purchasingPowerInflation))?Number(raw.purchasingPowerInflation):2,
    savingsTarget:Object.keys(FORECAST_ASSET_LABELS).includes(raw.savingsTarget)?raw.savingsTarget:'etf',
  };
}

function forecastAssetBuckets(assets=forecastAssets()){
  const liquidity=Number(assets.cash||0)+Number(assets.callMoney||0)+Number(assets.fixedDeposit||0);
  const investments=Number(assets.etf||0)+Number(assets.depot||0)+Number(assets.other||0);
  return {liquidity,investments,total:liquidity+investments};
}

function forecastData(){
  const baseYear=ForecastStateStore.year(),ui=forecastUi(),assets=forecastAssets(),assumptions=forecastAssumptions(),buckets=forecastAssetBuckets(assets);
  const calculationUi=ui.focus==='debtFree'?{...ui,endYear:baseYear+40}:ui,input=buildForecastInput(calculationUi,assets,assumptions),result=ForecastEngine.project(input);
  return {baseYear,ui,assets,assumptions,startAssets:buckets.total,buckets,baseline:input.variableBaseline,...result};
}
