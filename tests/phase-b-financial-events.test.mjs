import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../js/financial-events.js',import.meta.url),'utf8');
const context={globalThis:{},Math,Number,Object,Array,Set,Map,String,Date};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'js/financial-events.js'});
const engine=context.FinancialEvents;assert.ok(engine);
const events=[
  {id:'b1',type:'oneTimeIncome',title:'Bonus',startYear:2026,startMonth:11,amount:1600,enabled:true},
  {id:'k1',type:'expenseDelta',title:'Kindergarten +20',startYear:2027,startMonth:8,amount:20,enabled:true},
  {id:'d1',type:'oneTimeExpense',title:'Deaktiviert',startYear:2026,startMonth:11,amount:999,enabled:false},
];
let impact=engine.monthImpact(events,2026,11);assert.equal(impact.income,1600);assert.equal(impact.expense,0);assert.equal(impact.items.length,1);
impact=engine.monthImpact(events,2027,7);assert.equal(impact.expense,0);
impact=engine.monthImpact(events,2027,8);assert.equal(impact.expense,20);
impact=engine.monthImpact(events,2028,0);assert.equal(impact.expense,20,'dauerhafte Änderung muss fortgelten');
const rows=engine.applyToBaseMonths([{year:2026,month:11,income:3000,fixed:1000},{year:2027,month:8,income:3000,fixed:1000}],events);
assert.equal(rows[0].income,4600);assert.equal(rows[0].fixed,1000);assert.equal(rows[1].fixed,1020);assert.equal(rows[0].financialEvents[0].title,'Bonus');

// Präziser Architekturvertrag: Nur echte Zugriffe auf App-State, DOM oder Persistenz verbieten.
assert.ok(!/(^|[^\w$])S\s*\./m.test(source),'financial-events.js darf keinen App-State über S.* lesen');
assert.ok(!/\b(?:globalThis|window)\s*\.\s*S\b/.test(source),'financial-events.js darf keinen globalen App-State lesen');
for(const forbidden of [
  /\bdocument\s*\./,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bpersist\s*\(/,
  /\brender\s*\(/,
  /\btoast\s*\(/,
  /\bgv\s*\(/,
  /\bcreditBalanceAt\s*\(/,
  /\bcreditInterestAt\s*\(/
]) assert.ok(!forbidden.test(source),'financial-events.js muss frei von App-, DOM- und Persistenz-Abhängigkeiten bleiben');

console.log('Phase-B-Finanzereignistests erfolgreich.');
