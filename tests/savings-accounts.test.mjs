import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const schemaSource=await readFile(new URL('../js/state-schema.js',import.meta.url),'utf8');
const storeSource=await readFile(new URL('../js/savings-store.js',import.meta.url),'utf8');
const engineSource=await readFile(new URL('../js/forecast-engine.js',import.meta.url),'utf8');
const context={console,JSON,Object,Array,Number,String,Math,Date,Set,Map,RangeError,Error};context.globalThis=context;vm.createContext(context);
vm.runInContext(schemaSource,context,{filename:'js/state-schema.js'});
const normalized=context.StateSchema.normalize({years:[2026],savingsAccounts:[{id:'s1',name:'Tagesgeld',openingBalance:'1000',balanceYear:2026,balanceMonth:0,monthlyAmount:'100',intervalMonths:1}],savingsTransfers:[{id:'t1',accountId:'s1',direction:'withdrawal',amount:'50',year:2026,month:1},{id:'orphan',accountId:'missing',amount:5,year:2026,month:1}]},{defaultYears:()=>[2026]});
assert.equal(normalized.schemaVersion,9);assert.equal(normalized.savingsAccounts[0].openingBalance,1000);assert.equal(normalized.savingsTransfers.length,1);

let persists=0;context.S={savingsAccounts:normalized.savingsAccounts,savingsTransfers:normalized.savingsTransfers};context.persist=()=>persists++;context.uid=()=>`x${persists}`;
vm.runInContext(storeSource,context,{filename:'js/savings-store.js'});
assert.equal(context.SavingsStore.balanceAtStart('s1',2026,0),1000);
assert.equal(context.SavingsStore.balanceAtEnd('s1',2026,0),1100);
assert.equal(context.SavingsStore.balanceAtEnd('s1',2026,1),1150);
assert.deepEqual(JSON.parse(JSON.stringify(context.SavingsStore.monthlyTotals(2026,1))),{deposits:100,withdrawals:50});
assert.throws(()=>context.SavingsStore.addTransfer({accountId:'s1',direction:'withdrawal',amount:2000,year:2026,month:1},()=> 'bad'),/reicht nicht aus/);
assert.equal(context.S.savingsTransfers.length,1);
context.SavingsStore.addTransfer({accountId:'s1',direction:'deposit',amount:25,year:2026,month:1,note:'Extra'},()=> 't2');
assert.equal(context.SavingsStore.balanceAtEnd('s1',2026,1),1175);assert.equal(persists,1);
const snapshot=context.SavingsStore.accounts();snapshot[0].openingBalance=0;assert.equal(context.S.savingsAccounts[0].openingBalance,1000);
vm.runInContext(engineSource,context,{filename:'js/forecast-engine.js'});
const projected=context.ForecastEngine.project({startAccounts:[{id:'main',bucket:'liquidity',amount:1000,annualReturn:0},{id:'savings_s1',bucket:'investments',amount:500,annualReturn:0}],baseMonths:[{year:2026,month:0,income:0,fixed:0,savings:100,savingsWithdrawals:0,accountTransfers:[{accountId:'s1',deposits:100,withdrawals:0}],debt:0}]});
assert.equal(projected.months[0].liquidity,900);assert.equal(projected.months[0].investments,600);assert.equal(projected.months[0].assets,1500,'Interner Transfer darf das Gesamtvermögen nicht verändern');
console.log('Sparanlagen und gekoppelte Transfers erfolgreich geprüft.');
