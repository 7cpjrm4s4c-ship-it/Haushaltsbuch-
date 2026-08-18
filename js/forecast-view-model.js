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

function forecastAccounts(){
  const source=ForecastStateStore.accounts();
  return source.map((item,index)=>({id:String(item.id||`forecast_account_${index+1}`),name:String(item.name||'Konto'),bucket:item.bucket==='investments'?'investments':'liquidity',amount:Math.max(0,Number(item.amount)||0),annualReturn:Math.max(-99,Math.min(100,Number(item.annualReturn)||0))}));
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

function forecastAssetBuckets(accounts=forecastAccounts()){
  const liquidity=accounts.filter(item=>item.bucket==='liquidity').reduce((sum,item)=>sum+item.amount,0);
  const investments=accounts.filter(item=>item.bucket==='investments').reduce((sum,item)=>sum+item.amount,0);
  return {liquidity,investments,total:liquidity+investments};
}

function forecastReturnBuckets(assets=forecastAssets(),assumptions=forecastAssumptions()){
  const average=keys=>{
    const total=keys.reduce((sum,key)=>sum+Number(assets[key]||0),0);
    if(total>0)return keys.reduce((sum,key)=>sum+Number(assets[key]||0)*Number(assumptions.annualReturns[key]||0),0)/total;
    return keys.reduce((sum,key)=>sum+Number(assumptions.annualReturns[key]||0),0)/keys.length;
  };
  return {liquidity:average(['cash','callMoney','fixedDeposit']),investments:average(['etf','depot','other'])};
}

function forecastData(){
  const baseYear=ForecastStateStore.year(),ui=forecastUi(),assets=forecastAssets(),accounts=forecastAccounts(),assumptions=forecastAssumptions(),buckets=forecastAssetBuckets(accounts);
  const calculationUi=ui.focus==='debtFree'?{...ui,endYear:baseYear+40}:ui,input=buildForecastInput(calculationUi,assets,assumptions),result=ForecastEngine.project(input);
  return {baseYear,ui,assets,accounts,assumptions,startAssets:buckets.total,buckets,baseline:input.variableBaseline,...result};
}
