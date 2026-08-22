import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const context={console,Date,Math,Number,String,Array,Object,Set,Map,JSON,Error,RangeError};context.globalThis=context;vm.createContext(context);
vm.runInContext(await read('js/credit-calculation.js'),context,{filename:'js/credit-calculation.js'});

const frame={id:'frame-1',type:'revolving',n:'Rahmenkredit',r:0,limit:25000,z:3.65,dayCountConvention:'act365',balanceYear:2026,balanceMonth:0};
const movements=[
  {id:'d1',loanId:'frame-1',type:'drawdown',amount:1000,date:'2026-01-16',year:2026,month:0,createdAt:'1'},
  {id:'r1',loanId:'frame-1',type:'repayment',amount:400,date:'2026-01-21',year:2026,month:0,createdAt:'2'}
];
const january=context.revolvingMonth(frame,0,2026,0,movements);
assert.equal(january.drawdowns,1000);assert.equal(january.repayments,400);assert.equal(january.closingBalance,600);assert.equal(january.available,24400);
assert.equal(january.interest,1.16,'ACT/365 muss den tagesgenauen Saldo verwenden');
assert.equal(context.creditBalanceAt(frame,2026,1,movements),600,'Folgemonat muss die Bewegungen des Vormonats übernehmen');
assert.equal(context.revolvingMonth({...frame,dayCountConvention:'act360'},0,2026,0,movements).interest,1.18);
const frameWithRate={...frame,m:50},januaryWithRate=context.revolvingMonth(frameWithRate,0,2026,0,movements);
assert.equal(januaryWithRate.scheduledPayment,50);assert.equal(januaryWithRate.scheduledPrincipal,48.84);assert.equal(januaryWithRate.closingBalance,551.16);
assert.equal(context.creditBalanceAt(frameWithRate,2026,1,movements),551.16,'Die Monatsrate muss zum Monatsende die Folgerestschuld reduzieren');
const minimumInterest=context.revolvingMonth({...frame,m:0},1000,2026,0,[]);assert.equal(minimumInterest.scheduledPayment,3.1);assert.equal(minimumInterest.scheduledPrincipal,0,'Eine Rate unterhalb der Zinsen darf keine Tilgung erzeugen');
assert.equal(context.revolvingMonth({...frame,m:1000},0,2026,0,[{...movements[0],amount:25001}]).limitExceeded,true,'Eine Monatsendtilgung darf eine zwischenzeitliche Limitüberschreitung nicht verdecken');

const installment={id:'loan-1',type:'installment',n:'Auto',s:1200,r:1200,m:100,z:0,balanceYear:2026,balanceMonth:0};
const special=[{id:'s1',loanId:'loan-1',type:'specialRepayment',amount:200,date:'2026-01-20',year:2026,month:0}];
assert.equal(context.installmentMonth(installment,1200,2026,0,special).closingBalance,900);
assert.equal(context.creditBalanceAt(installment,2026,1,special),900);

vm.runInContext(await read('js/state-schema.js'),context,{filename:'js/state-schema.js'});
const normalized=context.StateSchema.normalize({years:[2026],kredite:[frame,{id:'legacy',n:'Alt',r:800,g:200,m:100,z:2,balanceYear:2026,balanceMonth:0}],creditMovements:[...movements,{id:'orphan',loanId:'missing',type:'drawdown',amount:1,date:'2026-01-01'}]},{defaultYears:()=>[2026]});
assert.equal(normalized.schemaVersion,10);assert.equal(normalized.kredite[1].type,'installment');assert.equal(normalized.kredite[1].s,1000);assert.equal(normalized.creditMovements.length,2);
assert.equal(context.StateSchema.normalize({kredite:[frameWithRate]},{defaultYears:()=>[2026]}).kredite[0].m,50,'Die Rahmenkreditrate muss persistiert und normalisiert werden');

let persists=0,id=0;context.S={kredite:[frame,installment],creditMovements:[]};context.persist=()=>persists++;context.uid=()=>`m${++id}`;
vm.runInContext(await read('js/credit-movement-store.js'),context,{filename:'js/credit-movement-store.js'});
context.CreditMovementStore.add({loanId:'frame-1',type:'drawdown',amount:1000,date:'2026-01-16',note:'Abruf'},context.uid);
context.CreditMovementStore.add({loanId:'frame-1',type:'repayment',amount:400,date:'2026-01-21'},context.uid);
context.CreditMovementStore.add({loanId:'loan-1',type:'specialRepayment',amount:200,date:'2026-01-20'},context.uid);
assert.equal(persists,3);assert.equal(context.CreditMovementStore.monthlyTotals(2026,0).netMainAccount,398.84);
assert.equal(context.CreditMovementStore.displayEntries(2026,0).filter(item=>item.type==='interest').length,0,'Zinsen gehören nicht in die variablen Kreditbewegungen');
assert.equal(context.CreditMovementStore.fixedPaymentEntries(2026,0).length,1);assert.equal(context.CreditMovementStore.fixedPaymentEntries(2026,0)[0].interest,1.16);
assert.throws(()=>context.CreditMovementStore.add({loanId:'frame-1',type:'drawdown',amount:25000,date:'2026-01-22'},context.uid),/Kreditrahmen/);
assert.throws(()=>context.CreditMovementStore.add({loanId:'frame-1',type:'repayment',amount:1000,date:'2026-01-22'},context.uid),/Restschuld/);
assert.throws(()=>context.CreditMovementStore.add({loanId:'loan-1',type:'specialRepayment',amount:2000,date:'2026-01-22'},context.uid),/Restschuld/);
const snapshot=context.CreditMovementStore.all();snapshot[0].amount=1;assert.equal(context.S.creditMovements[0].amount,1000);

context.S.cats=[];context.S.data={};context.S.buchungen=[];context.S.recurringRules=[];context.S.annualAdjustments=[];context.S.percentageAdjustments=[];context.S.amountAdjustments=[];context.S.oneTimeEntries=[];context.BookingStore={forMonth:()=>[]};context.PlanningEvents={fromLegacy:()=>[],valueForMonth:()=>0};context.dkey=()=>'';context.AppExtensionRegistry={registerCalculation(){}};
vm.runInContext(await read('js/data-consistency.js'),context,{filename:'js/data-consistency.js'});
const month=context.consistentMonthCalculation(2026,0);assert.equal(month.v,-400,'Nur einzelne Kreditbewegungen gehören in die variablen Kosten');assert.equal(month.k,1.16,'Rahmenkreditzinsen gehören als Monatsrate zu den Kredit-Fixkosten');assert.ok(Math.abs(month.saldo-398.84)<1e-9,'Kreditabrufe und -zahlungen müssen spiegelbildlich auf das Hauptkonto wirken');

vm.runInContext(await read('js/forecast-engine.js'),context,{filename:'js/forecast-engine.js'});vm.runInContext(await read('js/financial-events.js'),context,{filename:'js/financial-events.js'});context.S.year=2026;context.S.month=0;context.S.financialEvents=[];context.gv=()=>0;
vm.runInContext(await read('js/forecast-adapter.js'),context,{filename:'js/forecast-adapter.js'});
const schedule=context.forecastCreditSchedule(2026,0,2026,0),forecastMonth=schedule.get('2026-0');assert.equal(forecastMonth.creditDrawdowns,1000);assert.equal(forecastMonth.creditPayments,501.16);assert.equal(forecastMonth.specialRepayment,200);assert.equal(forecastMonth.debt,1500);
context.S.kredite[0]=frameWithRate;const rateForecast=context.forecastCreditSchedule(2026,0,2026,0).get('2026-0');assert.equal(rateForecast.creditPayments,550);assert.ok(Math.abs(rateForecast.debt-1451.16)<1e-9);context.S.kredite[0]=frame;

context.MF=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];context.AppUiState={year:()=>2026,month:()=>0,years:()=>[2026]};context.LoanStore={all:()=>JSON.parse(JSON.stringify(context.S.kredite)),find:id=>context.S.kredite.find(item=>item.id===id)||null};context.AppExtensionRegistry.registerView=()=>{};context.esc=value=>String(value);context.fmt=value=>`${Number(value).toFixed(2)} €`;context.fmtS=context.fmt;
vm.runInContext(await read('js/credit-ui.js'),context,{filename:'js/credit-ui.js'});
const markup=context.CreditUi.view();assert.match(markup,/Rahmenkredit/);assert.match(markup,/ACT\/365/);assert.match(markup,/Monatsrate/);assert.match(markup,/Davon Tilgung/);assert.match(markup,/Sondertilgung erfassen/);assert.match(markup,/Bewegung erfassen/);
let creditSheet='';context.openGenSheet=value=>{creditSheet=value;};context.CreditUi.openEdit('frame-1');assert.match(creditSheet,/Monatsrate inkl\. Zinsen/);assert.match(creditSheet,/id="kframepayment"/);
const formValues={ktype:{value:'revolving'},kn:{value:'Rahmenkredit'},kr:{value:'600'},kz:{value:'3.65'},krm:{value:'0'},kry:{value:'2026'},klimit:{value:'25000'},kframepayment:{value:'50'},kdaycount:{value:'act365'}};context.document={getElementById:id=>formValues[id]||null};context.toast=()=>{};assert.equal(context.CreditUi.readForm().m,50);

context.RC={K:'r'};context.INTERVALS=[];vm.runInContext(await read('js/compact-manager.js'),context,{filename:'js/compact-manager.js'});const fixedCreditGroup=context.recurringCreditFixedGroup(2026,0,{fixedSearch:'',fixedType:'K',fixedGroup:'Kredite'});assert.equal(fixedCreditGroup.count,1);assert.match(fixedCreditGroup.html,/Kredite/);assert.match(fixedCreditGroup.html,/Zinsen und/);

assert.throws(()=>context.CreditMovementStore.validateDataset([{...frame,r:26000}],[]),/Kreditrahmen/);

const backupMeta=new Map();context.localStorage={getItem:key=>backupMeta.get(key)||null,setItem:(key,value)=>backupMeta.set(key,String(value))};context.defaultYears=()=>[2026];Object.assign(context.S,{data:{},cats:[],years:[2026],buchungen:[],budgets:{},recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],accountBalances:{},savingsAccounts:[],savingsTransfers:[],forecastAssets:{},forecastAssumptions:{},forecastAccounts:[],financialEvents:[],forecastScenarios:[],forecastGoals:[]});
vm.runInContext(await read('js/backup-store.js'),context,{filename:'js/backup-store.js'});assert.equal(context.BackupStore.snapshot().appData.creditMovements.length,3);assert.equal(context.BackupStore.valid({appData:{cats:[],kredite:[{...frame,r:26000}],creditMovements:[],years:[2026]}}),false,'Ungültige Kreditrahmen dürfen nicht als Backup akzeptiert werden');
const beforeRejectedMerge=JSON.stringify(context.S),conflictingMerge={appData:{cats:[],kredite:[frame],creditMovements:[{id:'import-drawdown',loanId:'frame-1',type:'drawdown',amount:24500,date:'2026-01-25',year:2026,month:0}],years:[2026]}};
assert.throws(()=>context.BackupStore.apply(conflictingMerge,'merge'),/Kreditrahmen/,'Erst der kombinierte Verlauf kann den Kreditrahmen überschreiten');assert.equal(JSON.stringify(context.S),beforeRejectedMerge,'Ein abgewiesener Merge darf den aktiven Zustand nicht teilweise verändern');

console.log('Kreditbewegungs- und Rahmenkredittests erfolgreich.');
