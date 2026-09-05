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
assert.equal(januaryWithRate.scheduledPayment,51.16);assert.equal(januaryWithRate.scheduledPrincipal,50);assert.equal(januaryWithRate.balanceBeforeScheduledPayment,600);assert.equal(januaryWithRate.available,24400,'Im ausgewählten Monat darf die Tilgung vom Folgemonat den abrufbaren Betrag noch nicht erhöhen');assert.equal(januaryWithRate.availableAfterPayment,24450);assert.equal(januaryWithRate.closingBalance,550);
assert.equal(context.creditBalanceAt(frameWithRate,2026,1,movements),550,'Die konfigurierte Tilgung muss die Folgerestschuld vollständig reduzieren');
const februaryPayment=context.revolvingPaymentDueAt(frameWithRate,2026,1,movements);assert.equal(februaryPayment.amount,51.16);assert.equal(februaryPayment.principal,50);assert.equal(februaryPayment.interest,1.16);assert.equal(februaryPayment.date,'2026-02-01','Tilgung und Zinsen des Januars müssen am 1. des Folgemonats verrechnet werden');
assert.equal(context.revolvingPaymentDueAt(frameWithRate,2026,0,movements).amount,0,'Im Restschuld-Stichtagsmonat darf keine rückwirkende Zahlung erzeugt werden');
const principalPayment=context.revolvingMonth({...frame,m:200},1000,2026,0,[]);assert.equal(principalPayment.interest,3.1);assert.equal(principalPayment.scheduledPrincipal,200);assert.equal(principalPayment.scheduledPayment,203.1);assert.equal(principalPayment.closingBalance,800,'200 Euro Tilgung müssen die Restschuld um 200 Euro reduzieren');
const finalPayment=context.revolvingMonth({...frame,m:200},150,2026,0,[]);assert.equal(finalPayment.scheduledPrincipal,150);assert.equal(finalPayment.scheduledPayment,150.47);assert.equal(finalPayment.closingBalance,0,'Die letzte Tilgung muss auf die offene Restschuld begrenzt werden');
const interestOnly=context.revolvingMonth({...frame,m:0},1000,2026,0,[]);assert.equal(interestOnly.scheduledPayment,3.1);assert.equal(interestOnly.scheduledPrincipal,0,'Ohne Tilgung müssen ausschließlich die Zinsen belastet werden');
assert.equal(context.revolvingMonth({...frame,m:1000},0,2026,0,[{...movements[0],amount:25001}]).limitExceeded,true,'Eine Monatsendtilgung darf eine zwischenzeitliche Limitüberschreitung nicht verdecken');

const installment={id:'loan-1',type:'installment',n:'Auto',s:1200,r:1200,m:100,z:0,balanceYear:2026,balanceMonth:0};
const special=[{id:'s1',loanId:'loan-1',type:'specialRepayment',amount:200,date:'2026-01-20',year:2026,month:0}];
assert.equal(context.installmentMonth(installment,1200,2026,0,special).closingBalance,900);
assert.equal(context.creditBalanceAt(installment,2026,1,special),900);

vm.runInContext(await read('js/state-schema.js'),context,{filename:'js/state-schema.js'});
const normalized=context.StateSchema.normalize({years:[2026],kredite:[frame,{id:'legacy',n:'Alt',r:800,g:200,m:100,z:2,balanceYear:2026,balanceMonth:0}],creditMovements:[...movements,{id:'orphan',loanId:'missing',type:'drawdown',amount:1,date:'2026-01-01'}]},{defaultYears:()=>[2026]});
assert.equal(normalized.schemaVersion,12);assert.equal(normalized.kredite[1].type,'installment');assert.equal(normalized.kredite[1].s,1000);assert.equal(normalized.creditMovements.length,2);
const migratedFrame=context.StateSchema.normalize({schemaVersion:10,kredite:[frameWithRate]},{defaultYears:()=>[2026]}).kredite[0];
assert.equal(migratedFrame.m,50,'Der gespeicherte Zahlenwert bestehender Rahmenkredite muss bei der Migration erhalten bleiben');
assert.equal(migratedFrame.paymentMode,'principalPlusInterest','Die neue Tilgungssemantik muss im normalisierten Zustand eindeutig sein');
const legacyNamedState=context.StateSchema.normalize({schemaVersion:11,kredite:[{id:'legacy-frame',type:'installment',n:' Rahmenkredit ',s:25000,r:24489.54,m:200,z:7.98,balanceYear:2026,balanceMonth:9}],creditMovements:[{id:'legacy-special',loanId:'legacy-frame',type:'specialRepayment',amount:100,date:'2026-10-15'}]},{defaultYears:()=>[2026]});
const legacyNamedFrame=legacyNamedState.kredite[0];
assert.equal(legacyNamedFrame.type,'revolving','Der bestehende, eindeutig benannte Rahmenkredit muss einmalig umklassifiziert werden');
assert.equal(legacyNamedFrame.limit,25000,'Der bisherige Startbetrag muss zum Kreditrahmen werden');
assert.equal(legacyNamedFrame.r,24489.54);assert.equal(legacyNamedFrame.m,200);assert.equal(legacyNamedFrame.z,7.98);assert.equal(legacyNamedFrame.paymentMode,'principalPlusInterest');assert.equal(legacyNamedFrame.loanTypeConfirmed,true);
assert.equal(legacyNamedState.creditMovements[0].type,'repayment','Bestehende Sondertilgungen müssen verlustfrei als Rahmenkredit-Rückzahlungen erhalten bleiben');
const migratedOctober=context.revolvingMonth(legacyNamedFrame,legacyNamedFrame.r,2026,9,legacyNamedState.creditMovements);assert.equal(migratedOctober.available,610.46,'Die Oktoberanzeige muss ausschließlich den im Oktober tatsächlich abrufbaren Rahmen ausweisen');assert.equal(migratedOctober.availableAfterPayment,810.46,'Die Tilgung darf den verfügbaren Rahmen erst ab dem 1. November erhöhen');assert.equal(migratedOctober.scheduledPrincipal,200,'Auch der migrierte Altbestand muss die vollen 200 Euro tilgen');assert.ok(migratedOctober.scheduledPayment>200,'Die Zinsen müssen beim migrierten Altbestand zusätzlich zur Tilgung anfallen');
const legacyNamedAgain=context.StateSchema.normalize(legacyNamedState,{defaultYears:()=>[2026]});assert.equal(JSON.stringify(legacyNamedAgain),JSON.stringify(legacyNamedState),'Die Kreditartmigration muss idempotent sein');
const confirmedInstallment=context.StateSchema.normalize({schemaVersion:12,kredite:[{id:'confirmed',type:'installment',loanTypeConfirmed:true,n:'Rahmenkredit',s:1000,r:800,m:100,z:2,balanceYear:2026,balanceMonth:0}]},{defaultYears:()=>[2026]}).kredite[0];
assert.equal(confirmedInstallment.type,'installment','Eine ausdrücklich bestätigte Kreditart darf nicht anhand des Namens überschrieben werden');

let persists=0,id=0;context.S={kredite:[frame,installment],creditMovements:[]};context.persist=()=>persists++;context.uid=()=>`m${++id}`;
vm.runInContext(await read('js/credit-movement-store.js'),context,{filename:'js/credit-movement-store.js'});
context.CreditMovementStore.add({loanId:'frame-1',type:'drawdown',amount:1000,date:'2026-01-16',note:'Abruf'},context.uid);
context.CreditMovementStore.add({loanId:'frame-1',type:'repayment',amount:400,date:'2026-01-21'},context.uid);
context.CreditMovementStore.add({loanId:'loan-1',type:'specialRepayment',amount:200,date:'2026-01-20'},context.uid);
assert.equal(persists,3);assert.equal(context.CreditMovementStore.monthlyTotals(2026,0).netMainAccount,400);
assert.equal(context.CreditMovementStore.displayEntries(2026,0).filter(item=>item.type==='interest').length,0,'Zinsen gehören nicht in die variablen Kreditbewegungen');
assert.equal(context.CreditMovementStore.fixedPaymentEntries(2026,0).length,0);assert.equal(context.CreditMovementStore.fixedPaymentEntries(2026,1).length,1);assert.equal(context.CreditMovementStore.fixedPaymentEntries(2026,1)[0].interest,1.16);assert.equal(context.CreditMovementStore.fixedPaymentEntries(2026,1)[0].date,'2026-02-01');
assert.doesNotThrow(()=>context.CreditMovementStore.validateDataset([frame],[...context.S.creditMovements.filter(item=>item.loanId==='frame-1'),{id:'full-available',loanId:'frame-1',type:'drawdown',amount:24400,date:'2026-01-22',year:2026,month:0}]),'Der vollständig als abrufbar angezeigte Betrag muss sich im ausgewählten Monat buchen lassen');
assert.throws(()=>context.CreditMovementStore.add({loanId:'frame-1',type:'drawdown',amount:25000,date:'2026-01-22'},context.uid),/Kreditrahmen/);
assert.throws(()=>context.CreditMovementStore.add({loanId:'frame-1',type:'repayment',amount:1000,date:'2026-01-22'},context.uid),/Restschuld/);
assert.throws(()=>context.CreditMovementStore.add({loanId:'loan-1',type:'specialRepayment',amount:2000,date:'2026-01-22'},context.uid),/Restschuld/);
const snapshot=context.CreditMovementStore.all();snapshot[0].amount=1;assert.equal(context.S.creditMovements[0].amount,1000);

context.S.cats=[];context.S.data={};context.S.buchungen=[];context.S.recurringRules=[];context.S.annualAdjustments=[];context.S.percentageAdjustments=[];context.S.amountAdjustments=[];context.S.oneTimeEntries=[];context.BookingStore={monthlyTotals:()=>({expenses:0,inflows:0})};context.PlanningEvents={fromLegacy:()=>[],valueForMonth:()=>0};context.dkey=()=>'';context.AppExtensionRegistry={registerCalculation(){}};
vm.runInContext(await read('js/data-consistency.js'),context,{filename:'js/data-consistency.js'});
const month=context.consistentMonthCalculation(2026,0);assert.equal(month.v,-400,'Nur einzelne Kreditbewegungen gehören in die variablen Kosten');assert.equal(month.k,0,'Im ausgewählten Monat aufgelaufene Zinsen dürfen erst am 1. des Folgemonats als Fixkosten erscheinen');assert.equal(month.saldo,400,'Kreditabrufe und -zahlungen müssen im Buchungsmonat spiegelbildlich auf das Hauptkonto wirken');
context.S.kredite[0]={...frame,m:200};const principalMonth=context.consistentMonthCalculation(2026,0),principalFollowingMonth=context.consistentMonthCalculation(2026,1);assert.equal(principalMonth.k,0);assert.equal(principalFollowingMonth.k,201.16,'200 Euro Tilgung und 1,16 Euro Zinsen müssen das Hauptkonto am 1. des Folgemonats mit 201,16 Euro belasten');assert.equal(context.creditBalanceAt(context.S.kredite[0],2026,1,context.S.creditMovements),400,'Die Folgerestschuld muss trotz zusätzlicher Zinszahlung um volle 200 Euro sinken');context.S.kredite[0]=frame;

vm.runInContext(await read('js/forecast-engine.js'),context,{filename:'js/forecast-engine.js'});vm.runInContext(await read('js/financial-events.js'),context,{filename:'js/financial-events.js'});context.S.year=2026;context.S.month=0;context.S.financialEvents=[];context.gv=()=>0;
vm.runInContext(await read('js/forecast-adapter.js'),context,{filename:'js/forecast-adapter.js'});
const schedule=context.forecastCreditSchedule(2026,0,2026,1),forecastMonth=schedule.get('2026-0'),forecastFollowingMonth=schedule.get('2026-1');assert.equal(forecastMonth.creditDrawdowns,1000);assert.equal(forecastMonth.creditPayments,500);assert.equal(forecastMonth.specialRepayment,200);assert.equal(forecastMonth.debt,1500);assert.equal(forecastFollowingMonth.creditPayments,101.16,'Januarzinsen müssen erst im Februar zusätzlich zur Ratenkreditzahlung die Liquidität belasten');
context.S.kredite[0]=frameWithRate;const rateSchedule=context.forecastCreditSchedule(2026,0,2026,1),rateForecast=rateSchedule.get('2026-0'),rateFollowingForecast=rateSchedule.get('2026-1');assert.equal(rateForecast.creditPayments,500);assert.equal(rateForecast.debt,1500);assert.equal(rateFollowingForecast.creditPayments,151.16);context.S.kredite[0]=frame;

context.MF=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];context.AppUiState={year:()=>2026,month:()=>0,years:()=>[2026]};context.LoanStore={all:()=>JSON.parse(JSON.stringify(context.S.kredite)),find:id=>context.S.kredite.find(item=>item.id===id)||null};context.AppExtensionRegistry.registerView=()=>{};context.esc=value=>String(value);context.fmt=value=>`${Number(value).toFixed(2)} €`;context.fmtS=context.fmt;
vm.runInContext(await read('js/credit-ui.js'),context,{filename:'js/credit-ui.js'});
const markup=context.CreditUi.view();assert.match(markup,/Rahmenkredit/);assert.match(markup,/ACT\/365/);assert.match(markup,/Im Januar abrufbar/);assert.match(markup,/Zahlung am 01\.02\.2026/);assert.match(markup,/Tilgung/);assert.match(markup,/Zinsen/);assert.match(markup,/Verfügbar ab 01\.02\.2026/);assert.match(markup,/Sondertilgung erfassen/);assert.match(markup,/Bewegung erfassen/);
let creditSheet='';context.openGenSheet=value=>{creditSheet=value;};context.CreditUi.openEdit('frame-1');assert.match(creditSheet,/Monatliche Tilgung/);assert.match(creditSheet,/1\. des Folgemonats/);assert.match(creditSheet,/id="kframepayment"/);
const formValues={ktype:{value:'revolving'},kn:{value:'Rahmenkredit'},kr:{value:'600'},kz:{value:'3.65'},krm:{value:'0'},kry:{value:'2026'},klimit:{value:'25000'},kframepayment:{value:'50'},kdaycount:{value:'act365'}};context.document={getElementById:id=>formValues[id]||null};context.toast=()=>{};assert.equal(context.CreditUi.readForm().m,50);

context.RC={K:'r'};context.TL={K:'Kredit'};context.INTERVALS=[];context.findRecurringRule=()=>null;context.gv=(_year,_month,cat)=>Number(cat.d||0);vm.runInContext(await read('js/compact-manager.js'),context,{filename:'js/compact-manager.js'});const fixedCreditItems=context.recurringCreditFixedItems(2026,1,{fixedSearch:'',fixedType:'K',fixedGroup:'Kredite'}),loanCategories=[{id:'k1',t:'K',g:'Kredite',p:'Autokredit',d:100},{id:'k2',t:'K',g:'Kredite',p:'Bankkredit',d:200},{id:'k3',t:'K',g:'Kredite',p:'Ratenkredit',d:300}],unifiedCreditGroup=context.fixedManagerGroups(loanCategories,fixedCreditItems.items);assert.equal(fixedCreditItems.count,1);assert.equal((unifiedCreditGroup.match(/manager-group-title">Kredite/g)||[]).length,1,'Alle Kredite müssen in genau einem Accordion erscheinen');assert.match(unifiedCreditGroup,/Kredit · 4/);assert.match(unifiedCreditGroup,/Rahmenkredit/);assert.match(unifiedCreditGroup,/Tilgung/);assert.match(unifiedCreditGroup,/Zinsen/);

assert.throws(()=>context.CreditMovementStore.validateDataset([{...frame,r:26000}],[]),/Kreditrahmen/);

const backupMeta=new Map();context.localStorage={getItem:key=>backupMeta.get(key)||null,setItem:(key,value)=>backupMeta.set(key,String(value))};context.defaultYears=()=>[2026];Object.assign(context.S,{data:{},cats:[],years:[2026],buchungen:[],budgets:{},recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],accountBalances:{},savingsAccounts:[],savingsTransfers:[],forecastAssets:{},forecastAssumptions:{},forecastAccounts:[],financialEvents:[],forecastScenarios:[],forecastGoals:[]});
vm.runInContext(await read('js/backup-store.js'),context,{filename:'js/backup-store.js'});assert.equal(context.BackupStore.snapshot().appData.creditMovements.length,3);assert.equal(context.BackupStore.valid({appData:{cats:[],kredite:[{...frame,r:26000}],creditMovements:[],years:[2026]}}),false,'Ungültige Kreditrahmen dürfen nicht als Backup akzeptiert werden');
const beforeRejectedMerge=JSON.stringify(context.S),conflictingMerge={appData:{cats:[],kredite:[frame],creditMovements:[{id:'import-drawdown',loanId:'frame-1',type:'drawdown',amount:24500,date:'2026-01-25',year:2026,month:0}],years:[2026]}};
assert.throws(()=>context.BackupStore.apply(conflictingMerge,'merge'),/Kreditrahmen/,'Erst der kombinierte Verlauf kann den Kreditrahmen überschreiten');assert.equal(JSON.stringify(context.S),beforeRejectedMerge,'Ein abgewiesener Merge darf den aktiven Zustand nicht teilweise verändern');

console.log('Kreditbewegungs- und Rahmenkredittests erfolgreich.');
