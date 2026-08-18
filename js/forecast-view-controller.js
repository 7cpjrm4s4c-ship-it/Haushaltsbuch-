/* Schreibende UI-Aktionen der Prognose. State und Rendering werden hier bewusst koordiniert. */
'use strict';

function commitForecastChange(mutator){
  mutator();
  ForecastStateStore.save();
  render();
}

function setForecastOption(key,value){
  const ui=forecastUi();
  if(key==='lookbackMonths'||key==='endYear'||key==='annualInflation')value=Number(value);
  ui[key]=value;
  commitForecastChange(()=>ForecastStateStore.setForecastUi(ui));
}

function setForecastAsset(key,value){
  const assets=forecastAssets();
  assets[key]=Math.max(0,Number(value)||0);
  commitForecastChange(()=>ForecastStateStore.setAssets(assets));
}

function setForecastBucket(bucket,value){
  const assets=forecastAssets(),amount=Math.max(0,Number(value)||0),keys=bucket==='liquidity'?['cash','callMoney','fixedDeposit']:['etf','depot','other'];
  const current=keys.reduce((sum,key)=>sum+Number(assets[key]||0),0);
  if(current>0)for(const key of keys)assets[key]=amount*Number(assets[key]||0)/current;
  else{for(const key of keys)assets[key]=0;assets[keys[0]]=amount;}
  commitForecastChange(()=>ForecastStateStore.setAssets(assets));
}

function setForecastReturn(key,value){
  const assumptions=forecastAssumptions();
  assumptions.annualReturns[key]=Math.max(-99,Math.min(100,Number(value)||0));
  commitForecastChange(()=>ForecastStateStore.setAssumptions(assumptions));
}

function setForecastBucketReturn(bucket,value){
  const assumptions=forecastAssumptions(),rate=Math.max(-99,Math.min(100,Number(value)||0)),keys=bucket==='liquidity'?['cash','callMoney','fixedDeposit']:['etf','depot','other'];
  for(const key of keys)assumptions.annualReturns[key]=rate;
  commitForecastChange(()=>ForecastStateStore.setAssumptions(assumptions));
}

function setForecastAssumption(key,value){
  const assumptions=forecastAssumptions();
  assumptions[key]=key==='purchasingPowerInflation'?Math.max(-20,Math.min(50,Number(value)||0)):value;
  commitForecastChange(()=>ForecastStateStore.setAssumptions(assumptions));
}
