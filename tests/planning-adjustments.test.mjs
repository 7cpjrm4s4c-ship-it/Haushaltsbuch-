import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../js/data-consistency.js',import.meta.url),'utf8');
const S={
  data:{},cats:[],recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],buchungen:[],budgets:{},ui:{},year:2027,month:0,
};
const context={console,Math,Number,Object,Array,Set,Map,JSON,S,gv:()=>0,calcMonth:()=>({}),variableBookingGroups:()=>'',dkey:(y,m,id)=>`${y}_${m}_${id}`,getBuchungenForMonth:(y,m)=>S.buchungen.filter(b=>b.year===y&&b.month===m),persist:()=>{},closeGenSheet:()=>{},render:()=>{},toast:()=>{},uid:()=>`id-${Math.random()}`,document:{getElementById:()=>null},esc:String,fmt:String,MF:[],managerButton:()=>''};
context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'js/data-consistency.js'});

const kindergarten={id:'kg',g:'Kinder',p:'Kindergarten',d:200,t:'F'};
S.cats=[kindergarten];
S.recurringRules=[{id:'r1',catId:'kg',amount:200,intervalMonths:1,startYear:2027,startMonth:0,endYear:null,endMonth:null}];
S.amountAdjustments=[{id:'a1',catId:'kg',year:2027,month:8,amount:20}];
assert.equal(context.gv(2027,7,kindergarten),200,'vor September muss der alte Betrag gelten');
assert.equal(context.gv(2027,8,kindergarten),220,'ab September muss die feste Erhöhung greifen');
assert.equal(context.gv(2028,0,kindergarten),220,'feste Erhöhung muss dauerhaft fortgelten');

const salary={id:'salary',g:'Einnahmen',p:'Gehalt',d:3000,t:'E'};
S.cats=[salary];
S.recurringRules=[{id:'r2',catId:'salary',amount:3000,intervalMonths:1,startYear:2026,startMonth:0,endYear:null,endMonth:null}];
S.amountAdjustments=[];
S.oneTimeEntries=[{id:'o1',catId:'salary',year:2026,month:11,amount:1600,label:'Bonus'}];
assert.equal(context.gv(2026,10,salary),3000,'vor Bonusmonat darf kein Bonus enthalten sein');
assert.equal(context.gv(2026,11,salary),4600,'im Dezember muss der Bonus zusätzlich zum Gehalt wirken');
assert.equal(context.gv(2027,0,salary),3000,'Einmalzahlung darf nicht in Folgemonate fortgeschrieben werden');
const december=context.calcMonth(2026,11);
assert.equal(december.e,4600,'Einmalzahlung muss auch in der Monats-/Dashboardberechnung enthalten sein');

console.log('Planungsanpassungen erfolgreich geprüft.');
