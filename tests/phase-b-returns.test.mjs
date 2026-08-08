import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../js/forecast-engine.js',import.meta.url),'utf8');
const context={globalThis:{},Math,Number,Object,Array,Set,Map,RangeError,TypeError};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'js/forecast-engine.js'});
const engine=context.ForecastEngine;
const months=(count,savings=0)=>Array.from({length:count},(_,i)=>({year:2026+Math.floor(i/12),month:i%12,income:0,fixed:0,savings,creditPayments:0,debt:0}));

// Effektive Jahresrendite muss nach zwölf Monatsperioden exakt erreicht werden.
{
  const result=engine.project({baseMonths:months(12),startAssetBreakdown:{etf:12000},annualReturns:{etf:12},savingsTarget:'etf',purchasingPowerInflation:0,variableBaseline:0,annualInflation:0,scenarioKey:'realistic'});
  assert.ok(Math.abs(result.summary.endAssets-13440)<0.02,`12 % p.a. auf 12.000 € müssen ca. 13.440 € ergeben, erhalten ${result.summary.endAssets}`);
  assert.ok(Math.abs(result.summary.cumulativeReturns-1440)<0.02);
}

// Negative Rendite muss ebenfalls als effektive Jahresrendite wirken.
{
  const result=engine.project({baseMonths:months(12),startAssetBreakdown:{etf:10000},annualReturns:{etf:-12},savingsTarget:'etf',purchasingPowerInflation:0,variableBaseline:0,annualInflation:0,scenarioKey:'realistic'});
  assert.ok(Math.abs(result.summary.endAssets-8800)<0.02);
  assert.ok(result.summary.cumulativeReturns<0);
}

// Sparraten werden am Monatsende investiert und erhalten ab dem Folgemonat Rendite.
{
  const result=engine.project({baseMonths:months(12,100),startAssetBreakdown:{etf:0},annualReturns:{etf:12},savingsTarget:'etf',purchasingPowerInflation:0,variableBaseline:0,annualInflation:0,scenarioKey:'realistic'});
  assert.ok(result.summary.endInvestments>1200,'Sparraten müssen durch Rendite über den reinen Einzahlungsbetrag wachsen');
  assert.ok(Math.abs(result.summary.endInvestments-1200-result.summary.cumulativeReturns)<0.02,'Endwert muss Einzahlungen plus Rendite entsprechen');
}

// Unterschiedliche Anlageklassen müssen unabhängig verzinst werden.
{
  const result=engine.project({baseMonths:months(12),startAssetBreakdown:{cash:1000,callMoney:1000,etf:1000},annualReturns:{cash:0,callMoney:4,etf:8},savingsTarget:'etf',purchasingPowerInflation:0,variableBaseline:0,annualInflation:0,scenarioKey:'realistic'});
  const end=result.months.at(-1).assetBreakdown;
  assert.ok(Math.abs(end.cash-1000)<0.02);assert.ok(Math.abs(end.callMoney-1040)<0.02);assert.ok(Math.abs(end.etf-1080)<0.02);
}

// Reales Nettovermögen wird nur um Kaufkraftinflation bereinigt; nominal bleibt unverändert.
{
  const result=engine.project({baseMonths:months(12),startAssetBreakdown:{cash:10000},annualReturns:{cash:0},savingsTarget:'etf',purchasingPowerInflation:2,variableBaseline:0,annualInflation:0,scenarioKey:'realistic'});
  assert.equal(result.summary.endNetWorth,10000);
  assert.ok(Math.abs(result.summary.endRealNetWorth-(10000/1.02))<0.02);
}

console.log('Phase-B-Rendite- und Realwerttests erfolgreich.');
