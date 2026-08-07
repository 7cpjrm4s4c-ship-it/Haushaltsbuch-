import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../js/forecast-engine.js',import.meta.url),'utf8');
const context={globalThis:{},Math,Number,Object,Array,Set,Map,RangeError,TypeError};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'js/forecast-engine.js'});
const engine=context.ForecastEngine;

const baseMonths=[
  {year:2026,month:0,income:3000,fixed:2000,savings:500,creditPayments:0,debt:0},
  {year:2026,month:1,income:3000,fixed:2800,savings:500,creditPayments:0,debt:0},
  {year:2026,month:2,income:3000,fixed:1800,savings:500,creditPayments:0,debt:0},
];

const result=engine.project({
  baseMonths,
  variableBaseline:0,
  annualInflation:0,
  scenarioKey:'realistic',
  startLiquidity:5000,
  startInvestments:10000,
});

assert.equal(result.summary.startLiquidity,5000);
assert.equal(result.summary.startInvestments,10000);
assert.equal(result.summary.startAssets,15000);

assert.equal(result.months[0].saldo,500);
assert.equal(result.months[0].liquidity,5500,'Monatssaldo muss die Liquidität verändern');
assert.equal(result.months[0].investments,10500,'Sparrate muss dem Anlagevermögen zugeschlagen werden');
assert.equal(result.months[0].assets,16000,'Gesamtvermögen muss Liquidität plus Anlagevermögen entsprechen');

assert.equal(result.months[1].saldo,-300);
assert.equal(result.months[1].liquidity,5200,'negativer Monatssaldo muss die Liquidität reduzieren');
assert.equal(result.months[1].investments,11000);

assert.equal(result.summary.minLiquidity,5000,'Startliquidität bleibt Tiefpunkt, wenn alle Monatsendstände darüber liegen');
assert.equal(result.years[0].endLiquidity,result.months[2].liquidity);
assert.equal(result.years[0].endInvestments,result.months[2].investments);

const deficit=engine.project({
  baseMonths:[
    {year:2027,month:4,income:1000,fixed:1600,savings:0,creditPayments:0,debt:0},
    {year:2027,month:5,income:1000,fixed:1800,savings:0,creditPayments:0,debt:0},
  ],
  variableBaseline:0,
  annualInflation:0,
  scenarioKey:'realistic',
  startLiquidity:1000,
  startInvestments:0,
});

assert.equal(deficit.summary.minLiquidity,-400);
assert.equal(deficit.summary.minLiquidityYear,2027);
assert.equal(deficit.summary.minLiquidityMonth,5);
assert.equal(deficit.summary.endLiquidity,-400);
assert.equal(deficit.summary.endNetWorth,-400);

console.log('Phase-B-Liquiditätstests erfolgreich.');
