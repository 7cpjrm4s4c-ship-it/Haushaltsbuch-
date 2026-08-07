import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../js/forecast-engine.js',import.meta.url),'utf8');
const context={globalThis:{},Math,Number,Object,Array,Set,Map,RangeError,TypeError};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'js/forecast-engine.js'});
const engine=context.ForecastEngine;
assert.ok(engine,'ForecastEngine wurde nicht geladen');

const variableIds=['food','car'];
const bookings=[
  {catId:'food',betrag:60,year:2026,month:0},
  {catId:'car',betrag:30,year:2026,month:0},
  {catId:'food',betrag:120,year:2026,month:1},
  {catId:'food',betrag:100,year:2026,month:2},
  {catId:'car',betrag:50,year:2026,month:2},
  {catId:'other',betrag:999,year:2026,month:2},
];
const baseline=engine.historicalVariableAverage({bookings,variableCategoryIds:variableIds,baseYear:2026,baseMonth:3,lookbackMonths:3});
assert.equal(baseline,120,'historischer 3-Monats-Durchschnitt muss 120 € ergeben');
assert.equal(engine.variableValue(120,0,0,'realistic'),120);
assert.equal(engine.variableValue(120,0,0,'optimistic'),114);
assert.equal(engine.variableValue(120,0,0,'cautious'),132);
assert.equal(engine.variableValue(120,12,12,'realistic'),134.4,'12 % Inflation muss nach zwölf Monaten einmal wirken');

const categories=[
  {id:'salary',t:'E'},
  {id:'rent',t:'F'},
  {id:'save',t:'S'},
  {id:'food',t:'V'},
  {id:'loan-cat',t:'K'},
];
const credit={id:'loan',r:1200,m:100,z:12,balanceYear:2026,balanceMonth:0};
function balanceAt(k,year,month){
  let balance=k.r;
  const target=year*12+month-(k.balanceYear*12+k.balanceMonth);
  for(let i=0;i<target&&balance>0.005;i++)balance=Math.max(0,balance+balance*(k.z/1200)-k.m);
  return Math.round(balance*100)/100;
}
function interestAt(k,year,month){return Math.round(balanceAt(k,year,month)*(k.z/1200)*100)/100;}
function categoryValue(year,month,cat){
  if(cat.id==='salary')return 3000;
  if(cat.id==='rent')return 1000;
  if(cat.id==='save')return 200;
  return 0;
}

const months=engine.project({
  startYear:2026,startMonth:0,endYear:2026,endMonth:11,
  categories,credits:[credit],categoryValue,creditBalanceAt:balanceAt,creditInterestAt:interestAt,
  variableBaseline:120,annualInflation:0,scenarioKey:'realistic',
});
assert.equal(months.length,12);
assert.equal(months[0].income,3000);
assert.equal(months[0].fixed,1000);
assert.equal(months[0].variable,120);
assert.equal(months[0].creditPayments,100);
assert.equal(months[0].savings,200);
assert.equal(months[0].saldo,1580);
assert.ok(months[11].debt<months[0].debt,'Restschuld muss über die Prognose sinken');
assert.ok(months[11].cumulative>months[0].cumulative,'kumuliertes Plansaldo muss fortgeschrieben werden');

const years=engine.aggregateYears(months);
assert.equal(years.length,1);
assert.equal(years[0].year,2026);
assert.equal(years[0].income,36000);
assert.equal(years[0].fixed,12000);
assert.equal(years[0].variable,1440);
assert.equal(years[0].endDebt,months[11].debt);
assert.equal(years[0].endCumulative,months[11].cumulative);

assert.throws(()=>engine.project({
  startYear:2027,startMonth:0,endYear:2026,endMonth:11,categories:[],credits:[],
  categoryValue,creditBalanceAt:balanceAt,creditInterestAt:interestAt,
}),/Prognoseende/);

console.log('Alle Prognose-Tests erfolgreich.');
