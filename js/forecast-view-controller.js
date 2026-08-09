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

function setForecastReturn(key,value){
  const assumptions=forecastAssumptions();
  assumptions.annualReturns[key]=Math.max(-99,Math.min(100,Number(value)||0));
  commitForecastChange(()=>ForecastStateStore.setAssumptions(assumptions));
}

function setForecastAssumption(key,value){
  const assumptions=forecastAssumptions();
  assumptions[key]=key==='purchasingPowerInflation'?Math.max(-20,Math.min(50,Number(value)||0)):value;
  commitForecastChange(()=>ForecastStateStore.setAssumptions(assumptions));
}
