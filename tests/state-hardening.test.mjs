import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

async function source(path){
  return readFile(new URL(`../${path}`,import.meta.url),'utf8');
}

async function run(path,context){
  vm.runInContext(await source(path),context,{filename:path});
}

function makeContext(extra={}){
  const context={console,setTimeout,clearTimeout,Date,Intl,Math,Number,String,Array,Object,Set,Map,JSON,...extra};
  context.globalThis=context;
  vm.createContext(context);
  return context;
}

// Schema normalisiert ungültige Top-Level-Strukturen ohne valide Daten zu verändern.
{
  const context=makeContext();
  await run('js/state-schema.js',context);

  const normalized=context.StateSchema.normalize({
    data:[],
    cats:[{id:'c1'}],
    kredite:null,
    years:['2028','x',2026,2028,1999,2201],
    buchungen:'invalid',
    budgets:[],
    recurringRules:[{id:'r1'}],
  },{defaultYears:()=>[2026,2027,2028]});

  assert.equal(normalized.schemaVersion,1);
  assert.deepEqual([...normalized.years],[2026,2028]);
  assert.equal(normalized.cats.length,1);
  assert.equal(normalized.kredite.length,0);
  assert.equal(normalized.buchungen.length,0);
  assert.equal(Object.keys(normalized.data).length,0);
  assert.equal(Object.keys(normalized.budgets).length,0);
  assert.equal(normalized.recurringRules.length,1);
}

// Beschädigtes JSON wird gesichert und die App fällt kontrolliert auf Werkseinstellungen zurück.
{
  const store=new Map([['hp5','{"defekt":']]);
  const localStorage={
    getItem:key=>store.has(key)?store.get(key):null,
    setItem:(key,value)=>store.set(key,String(value)),
    removeItem:key=>store.delete(key),
  };

  const S={
    data:{},cats:[],kredite:[],years:[],buchungen:[],budgets:{},
    recurringRules:[],annualAdjustments:[],percentageAdjustments:[],
    year:2026,month:0,
  };
  let factoryCalls=0;

  const context=makeContext({
    S,localStorage,LS_KEY:'hp5',_pTimer:null,persist:()=>{},load:()=>{},
    now:new Date(2026,0,1),
    defaultYears:()=>[2026,2027,2028],
    applyFactoryState:()=>{
      factoryCalls++;
      S.data={};S.cats=[];S.kredite=[];S.years=[2026,2027,2028];S.buchungen=[];S.budgets={};
      S.recurringRules=[];S.annualAdjustments=[];S.percentageAdjustments=[];
    },
    normalizeVariableCategories:()=>{},
    creditStartAmount:k=>Number(k.s??0),
    creditReferenceYear:k=>Number(k.balanceYear??2026),
    creditReferenceMonth:k=>Number(k.balanceMonth??0),
    syncAllLoans:()=>{},
    sortCategoriesInPlace:()=>{},
  });

  await run('js/state-schema.js',context);
  await run('js/state-storage.js',context);
  context.load();

  assert.equal(factoryCalls,1,'bei beschädigtem JSON müssen Werkseinstellungen kontrolliert geladen werden');
  assert.equal(localStorage.getItem('hp5_corrupt_backup'),'{"defekt":','der beschädigte Rohzustand muss zur Recovery erhalten bleiben');
  const repaired=JSON.parse(localStorage.getItem('hp5'));
  assert.equal(repaired.schemaVersion,1,'nach Recovery muss wieder ein gültiger versionierter Zustand gespeichert sein');
}

// Alte gültige Speicherstände ohne Versionsfeld werden transparent auf das aktuelle Schema migriert.
{
  const oldState={
    data:{},cats:[],kredite:[],years:[2026,2027],buchungen:[],budgets:{},
    recurringRules:[],annualAdjustments:[],percentageAdjustments:[],
  };
  const store=new Map([['hp5',JSON.stringify(oldState)]]);
  const localStorage={
    getItem:key=>store.has(key)?store.get(key):null,
    setItem:(key,value)=>store.set(key,String(value)),
  };
  const S={...oldState,year:2026,month:0};

  const context=makeContext({
    S,localStorage,LS_KEY:'hp5',_pTimer:null,persist:()=>{},load:()=>{},
    now:new Date(2026,0,1),defaultYears:()=>[2026,2027,2028],
    applyFactoryState:()=>{throw new Error('gültiger Altzustand darf nicht verworfen werden');},
    normalizeVariableCategories:()=>{},creditStartAmount:k=>Number(k.s??0),
    creditReferenceYear:k=>Number(k.balanceYear??2026),creditReferenceMonth:k=>Number(k.balanceMonth??0),
    syncAllLoans:()=>{},sortCategoriesInPlace:()=>{},
  });

  await run('js/state-schema.js',context);
  await run('js/state-storage.js',context);
  context.load();

  const migrated=JSON.parse(localStorage.getItem('hp5'));
  assert.equal(migrated.schemaVersion,1);
  assert.deepEqual([...S.years],[2026,2027]);
  assert.equal(S.kredite.length,0,'bewusst leere Arrays müssen bei Migration leer bleiben');
}

console.log('Alle State-Härtungstests erfolgreich.');
