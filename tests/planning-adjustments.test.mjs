import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const registrySource=await readFile(new URL('../js/app-extension-registry.js',import.meta.url),'utf8');
const bookingSource=await readFile(new URL('../js/booking-store.js',import.meta.url),'utf8');
const planningSource=await readFile(new URL('../js/planning-events.js',import.meta.url),'utf8');
const dataSource=await readFile(new URL('../js/data-consistency.js',import.meta.url),'utf8');
const bindingsSource=await readFile(new URL('../js/app-extension-bindings.js',import.meta.url),'utf8');
const S={data:{},cats:[],recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],buchungen:[],budgets:{},ui:{},year:2027,month:0};
const context={console,Math,Number,Object,Array,Set,Map,JSON,S,gv:()=>0,calcMonth:()=>({}),dkey:(y,m,id)=>`${y}_${m}_${id}`,persist:()=>{},closeGenSheet:()=>{},render:()=>{},toast:()=>{},uid:()=>`id-${Math.random()}`,document:{getElementById:()=>null}};
context.globalThis=context;vm.createContext(context);
vm.runInContext(registrySource,context,{filename:'js/app-extension-registry.js'});
vm.runInContext(bookingSource,context,{filename:'js/booking-store.js'});
vm.runInContext(planningSource,context,{filename:'js/planning-events.js'});
vm.runInContext(dataSource,context,{filename:'js/data-consistency.js'});
vm.runInContext(bindingsSource,context,{filename:'js/app-extension-bindings.js'});

const kindergarten={id:'kg',g:'Kinder',p:'Kindergarten',d:200,t:'F'};
S.cats=[kindergarten];S.recurringRules=[{id:'r1',catId:'kg',amount:200,intervalMonths:1,startYear:2027,startMonth:0,endYear:2028,endMonth:5}];S.amountAdjustments=[{id:'a1',catId:'kg',year:2027,month:8,amount:20}];
assert.equal(context.gv(2027,7,kindergarten),200);assert.equal(context.gv(2027,8,kindergarten),220);assert.equal(context.gv(2028,0,kindergarten),220);assert.equal(context.gv(2028,6,kindergarten),0,'nach Endmonat darf keine Belastung mehr entstehen');
S.percentageAdjustments=[{id:'p1',catId:'kg',year:2027,month:8,percent:10,repeatAnnual:true}];
assert.equal(context.gv(2027,8,kindergarten),242,'feste Erhöhung muss vor Prozentsteigerung berücksichtigt werden');

const salary={id:'salary',g:'Einnahmen',p:'Gehalt',d:3000,t:'E'};
S.cats=[salary];S.recurringRules=[{id:'r2',catId:'salary',amount:3000,intervalMonths:1,startYear:2026,startMonth:0,endYear:null,endMonth:null}];S.amountAdjustments=[];S.percentageAdjustments=[{id:'p2',catId:'salary',year:2026,month:0,percent:3,repeatAnnual:true}];S.oneTimeEntries=[{id:'o1',catId:'salary',year:2026,month:11,amount:1600,label:'Bonus'}];
assert.equal(context.gv(2026,11,salary),4690,'Bonus und Gehaltserhöhung müssen im selben Monat kombinierbar sein');
assert.equal(context.gv(2027,0,salary),3182.7,'Bonus darf nicht fortgeschrieben werden, jährliche Erhöhung aber schon');
assert.equal(context.calcMonth(2026,11).e,4690);

const events=context.PlanningEvents.fromLegacy(S);assert.ok(events.some(e=>e.type==='recurring'));assert.ok(events.some(e=>e.type==='percentageIncrease'));assert.ok(events.some(e=>e.type==='oneTime'));
console.log('Planungsanpassungen erfolgreich geprüft.');
