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

function openForecastAccounts(bucket){
  const title=bucket==='liquidity'?'Liquiditätskonten':'Anlagevermögen';
  openGenSheet(`<div class="sheet-title">${title}</div>${forecastAccountRows(bucket)}<div class="dialog-actions"><button class="btn btn-primary" onclick="openForecastAccountDialog('${bucket}')">+ Hinzufügen</button><button class="btn btn-cancel" onclick="closeGenSheet()">Schließen</button></div>`);
}

function openForecastAccountDialog(bucket,id=''){
  const account=forecastAccounts().find(item=>item.id===id)||{};
  openGenSheet(`<div class="sheet-title">${id?'Eintrag bearbeiten':'Eintrag hinzufügen'}</div>${forecastAccountForm(bucket,account)}<div class="dialog-actions"><button class="btn btn-primary" onclick="saveForecastAccount('${bucket}','${esc(id)}')">Speichern</button>${id?`<button class="btn btn-red" onclick="removeForecastAccount('${esc(id)}')">Löschen</button>`:''}<button class="btn btn-cancel" onclick="openForecastAccounts('${bucket}')">Zurück</button></div>`);
}

function saveForecastAccount(bucket,id=''){
  const name=document.getElementById('forecast-account-name')?.value.trim(),amount=Number(document.getElementById('forecast-account-amount')?.value),annualReturn=Number(document.getElementById('forecast-account-return')?.value);
  if(!name||!Number.isFinite(amount)||amount<0||!Number.isFinite(annualReturn)||annualReturn<-99||annualReturn>100)return toast('Bitte Bezeichnung, Betrag und Zinssatz prüfen','err');
  const accounts=forecastAccounts(),index=accounts.findIndex(item=>item.id===id),entry={id:id||uid(),name,bucket:bucket==='investments'?'investments':'liquidity',amount,annualReturn};
  if(index>=0)accounts[index]=entry;else accounts.push(entry);
  closeGenSheet();commitForecastChange(()=>ForecastStateStore.setAccounts(accounts));
}

function removeForecastAccount(id){
  const accounts=forecastAccounts(),account=accounts.find(item=>item.id===id);if(!account||!confirm(`„${account.name}“ wirklich löschen?`))return;
  closeGenSheet();commitForecastChange(()=>ForecastStateStore.setAccounts(accounts.filter(item=>item.id!==id)));
}
