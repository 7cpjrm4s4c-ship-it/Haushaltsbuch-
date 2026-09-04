import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function makeContext(extra={}){const value={console,Date,Math,Number,String,Array,Object,Set,Map,JSON,Error,TypeError,RangeError,...extra};value.globalThis=value;value.window=value;vm.createContext(value);return value;}
async function run(target,path){vm.runInContext(await read(path),target,{filename:path});}

// BookingStore muss vor allen Verbrauchern geladen werden.
{
  const index=await read('index.html'),store=index.indexOf('js/booking-store.js');assert.ok(store>=0);
  for(const consumer of ['js/ui-polish.js','js/compact-manager.js','js/data-consistency.js','js/forecast-adapter.js'])assert.ok(store<index.indexOf(consumer),`BookingStore muss vor ${consumer} geladen werden`);
}

// Schema 11 migriert bestehende Buchungen als Ausgaben und normalisiert Zahlungseingänge.
{
  const context=makeContext();await run(context,'js/state-schema.js');
  const normalized=context.StateSchema.normalize({schemaVersion:10,years:[2026],buchungen:[
    {id:'legacy',catId:'food',bezeichnung:'Lebensmittel',betrag:'80',year:2026,month:0,ts:1},
    {id:'income',catId:'food',direction:'income',bezeichnung:'Person X',betrag:'250',year:2026,month:1,ts:2,futureField:'preserve'}
  ]},{defaultYears:()=>[2026]});
  assert.equal(normalized.schemaVersion,11);
  assert.equal(normalized.buchungen[0].direction,'expense','Alte Buchungen müssen Ausgaben bleiben');
  assert.equal(normalized.buchungen[1].direction,'income');
  assert.equal(normalized.buchungen[1].catId,'','Zahlungseingänge dürfen keine Ausgabenkategorie vortäuschen');
  assert.equal(normalized.buchungen[1].betrag,250);
  assert.equal(normalized.buchungen[1].futureField,'preserve','Unbekannte Buchungsfelder müssen für Vorwärtskompatibilität erhalten bleiben');
  const huge=context.StateSchema.normalizeBookings([{id:'huge',direction:'income',betrag:Number.MAX_VALUE,year:2026,month:0}])[0];
  assert.ok(Number.isSafeInteger(huge.betrag*100),'Auch sehr große importierte Beträge müssen als sicherer Centbetrag normalisiert werden');
}

// BookingStore kapselt Vorzeichenlogik, Validierung und exakte Monatszuordnung.
{
  let persists=0;const S={buchungen:[]},context=makeContext({S,persist:()=>persists++});await run(context,'js/booking-store.js');
  context.BookingStore.add({id:'expense',direction:'expense',catId:'food',bezeichnung:'Einkauf',betrag:80,year:2026,month:0,ts:1});
  context.BookingStore.add({id:'income',direction:'income',bezeichnung:'Person X',betrag:250,year:2026,month:0,ts:2});
  assert.deepEqual(plain(context.BookingStore.monthlyTotals(2026,0)),{expenses:80,inflows:250});
  assert.deepEqual(plain(context.BookingStore.monthlyTotals(2026,1)),{expenses:0,inflows:0},'Der Zahlungseingang darf im Folgemonat nicht erneut erscheinen');
  assert.equal(context.BookingStore.inflowsByMonth().get('2026_0'),250);
  assert.equal(context.BookingStore.find('income').catId,'');
  assert.throws(()=>context.BookingStore.add({id:'invalid',direction:'expense',betrag:1,year:2026,month:0}),/Kategorie/);
  assert.throws(()=>context.BookingStore.add({id:'invalid',direction:'income',betrag:0,year:2026,month:0}),/größer als null/);
  assert.throws(()=>context.BookingStore.add({id:'invalid-large',direction:'income',betrag:Number.MAX_VALUE,year:2026,month:0}),/sicher berechenbar/);
  assert.equal(persists,2);
}

// Monatsberechnung führt externe Zahlungseingänge als Einnahmen, nicht als negative Ausgabe.
{
  const S={data:{},cats:[{id:'salary',t:'E',d:3000},{id:'food',t:'V',d:0}],recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],buchungen:[
    {id:'expense',direction:'expense',catId:'food',betrag:80,year:2026,month:0},
    {id:'income',direction:'income',catId:'',betrag:250,year:2026,month:0}
  ]};
  const context=makeContext({S,dkey:(year,month,id)=>`${year}_${month}_${id}`,SavingsStore:{monthlyTotals:()=>({regularDeposits:0,individualDeposits:0,deposits:0,withdrawals:0})},CreditMovementStore:{monthlyTotals:()=>({inflows:0,variableOutflows:0,scheduledPayments:0})}});
  await run(context,'js/app-extension-registry.js');await run(context,'js/booking-store.js');await run(context,'js/planning-events.js');await run(context,'js/data-consistency.js');
  const january=context.consistentMonthCalculation(2026,0),february=context.consistentMonthCalculation(2026,1);
  assert.deepEqual(plain(january),{e:3250,f:0,v:80,k:0,s:0,aus:80,saldo:3170});
  assert.deepEqual(plain(february),{e:3000,f:0,v:0,k:0,s:0,aus:0,saldo:3000});
}

// Einmalige Zahlungseingänge verändern weder die historische Ausgabenbasis noch Folgemonate der Prognose.
{
  const context=makeContext();await run(context,'js/forecast-engine.js');
  const average=context.ForecastEngine.historicalVariableAverage({bookings:[
    {direction:'expense',catId:'food',betrag:60,year:2026,month:0},
    {direction:'income',catId:'food',betrag:900,year:2026,month:0}
  ],variableCategoryIds:['food'],baseYear:2026,baseMonth:1,lookbackMonths:1});
  assert.equal(average,60,'Zahlungseingänge dürfen variable Ausgabenprognosen nicht absenken oder erhöhen');

  context.S={year:2026,month:0,cats:[],kredite:[],creditMovements:[],financialEvents:[],buchungen:[{id:'income',direction:'income',catId:'',betrag:250,year:2026,month:0}]};
  context.gv=()=>0;await run(context,'js/booking-store.js');await run(context,'js/forecast-adapter.js');
  const rows=context.forecastBaseMonths(2026,0,2026,1);
  assert.equal(rows[0].income,250);
  assert.equal(rows[1].income,0,'Der Zahlungseingang darf nicht in den Folgemonat fortgeschrieben werden');
}

// Die Hauptkonto-Fortschreibung übernimmt den Eingang einmalig und trägt nur den neuen Bestand weiter.
{
  const S={accountBalances:{'2026_0':1000}},context=makeContext({S,persist(){}});await run(context,'js/account-balance-store.js');
  const monthlyNet=(year,month)=>year===2026&&month===0?250:0;
  assert.equal(context.AccountBalanceStore.projected(2026,0,monthlyNet),1250);
  assert.equal(context.AccountBalanceStore.projected(2026,1,monthlyNet),1250,'Im Folgemonat darf nur der erhöhte Bestand, nicht die Zahlung selbst erneut gebucht werden');
}

// Backup 12 erhält Zahlungseingänge; Merge normalisiert auch ältere Ausgaben.
{
  const values=new Map(),localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value))};let persists=0;
  const S={data:{},cats:[],kredite:[],creditMovements:[],years:[2026],buchungen:[{id:'income',direction:'income',catId:'',bezeichnung:'Person X',betrag:250,year:2026,month:0,ts:1}],budgets:{},recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],accountBalances:{},savingsAccounts:[],savingsTransfers:[],forecastAssets:{},forecastAssumptions:{},forecastAccounts:[],financialEvents:[],forecastScenarios:[],forecastGoals:[]};
  const context=makeContext({S,localStorage,defaultYears:()=>[2026],persist:()=>persists++,LoanCategoryStore:{syncAll(){}},DataManagementStore:{sortCategoriesInPlace(){}}});
  await run(context,'js/state-schema.js');await run(context,'js/backup-store.js');
  const snapshot=context.BackupStore.snapshot();assert.equal(snapshot.version,12);assert.equal(snapshot.schemaVersion,11);
  S.buchungen=[];context.BackupStore.apply(snapshot,'replace');assert.equal(S.buchungen[0].direction,'income');assert.equal(S.buchungen[0].betrag,250);
  context.BackupStore.apply({appData:{data:{},cats:[],kredite:[],years:[2026],buchungen:[{id:'legacy',catId:'food',bezeichnung:'Alt',betrag:40,year:2026,month:0}]}},'merge');
  assert.equal(S.buchungen.find(item=>item.id==='legacy').direction,'expense');assert.equal(persists,2);
}

// Die Monatsansicht bietet die Buchungsart an und zeigt Eingänge positiv nur im gewählten Monat.
{
  const S={buchungen:[{id:"income');alert(1);//",direction:'income',catId:'',bezeichnung:'Person <X>',betrag:250,year:2026,month:0,ts:1}]};let selectedMonth=0;
  const esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const context=makeContext({S,MF:['Januar','Februar'],TL:{},RC:{},esc,fmt:value=>`${Number(value).toFixed(2)} €`,fmtS:value=>`${Number(value).toFixed(2)} €`,CategoryStore:{variable:()=>[{id:'food',p:'Lebensmittel'}]},AppUiState:{year:()=>2026,month:()=>selectedMonth,years:()=>[2026]},ManagerUiState:{snapshot:()=>({expenseCategoryId:'',fixedType:'all',fixedGroup:'all',fixedSearch:''}),setExpenseCategory(){},resetExpense(){}},AppExtensionRegistry:{registerView(){}},LoanStore:{all:()=>[]}});
  await run(context,'js/booking-store.js');await run(context,'js/compact-manager.js');
  const january=context.compactExpensesView();
  assert.match(january,/desktop-page-title">Buchungen/);assert.match(january,/Variable Buchung erfassen/);assert.match(january,/id="quick-direction"/);assert.match(january,/aria-describedby="quick-direction-hint"/);assert.match(january,/Zahlungseingang/);assert.match(january,/Zahlungseingänge/);assert.match(january,/\+250\.00 €/);assert.match(january,/Person &lt;X&gt;/);assert.ok(!january.includes('Person <X>'));
  assert.match(january,/openBookingDialog\(&quot;income&#39;\);alert\(1\);\/\/&quot;\)/,'Importierte IDs müssen als einzelnes JavaScript-Stringargument serialisiert werden');
  selectedMonth=1;assert.ok(!context.compactExpensesView().includes('Person &lt;X&gt;'),'Die Buchung darf im Folgemonat nicht sichtbar sein');
}

// Die Erfassungsaktion schreibt einen unabhängigen Zahlungseingang in den ausgewählten Monat.
{
  const elements={
    'quick-direction':{value:'income'},'quick-amount':{value:'275.50'},'quick-cat':{value:'food'},'quick-name':{value:'Person X'}
  },S={buchungen:[]};let renders=0,notice='';
  const context=makeContext({S,document:{getElementById:id=>elements[id]||null},uid:()=> 'income-ui',persist(){},render:()=>renders++,toast:message=>{notice=message;},AppUiState:{year:()=>2027,month:()=>4},ManagerUiState:{setExpenseCategory(){throw new Error('Zahlungseingang darf keine Ausgabenkategorie setzen');}},AppExtensionRegistry:{registerView(){}},CategoryStore:{variable:()=>[]}});
  await run(context,'js/booking-store.js');await run(context,'js/compact-manager.js');context.saveStructuredBooking();
  assert.deepEqual(plain(S.buchungen[0]),{id:'income-ui',direction:'income',catId:'',bezeichnung:'Person X',betrag:275.5,month:4,year:2027,ts:S.buchungen[0].ts});assert.equal(renders,1);assert.equal(notice,'Zahlungseingang gespeichert');
  elements['quick-amount'].value=String(Number.MAX_VALUE);context.saveStructuredBooking();assert.equal(S.buchungen.length,1);assert.equal(renders,1);assert.match(notice,/sicher berechenbar/);
}

console.log('Einmalige Zahlungseingänge erfolgreich geprüft.');
