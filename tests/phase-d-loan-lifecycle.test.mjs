import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [lifecycleSource,integrationSource,loanStoreSource,eventUiSource,index]=await Promise.all([
  'js/loan-lifecycle.js','js/financial-events-loan-integration.js','js/loan-store.js','js/financial-events-ui.js','index.html'
].map(read));

// Lifecycle-Infrastruktur bleibt neutral.
for(const forbidden of [/(^|[^\w$])S\s*\./m,/\bdocument\s*\./,/\blocalStorage\b/,/\bsessionStorage\b/,/\bpersist\s*\(/,/\brender\s*\(/,/\btoast\s*\(/]){
  assert.ok(!forbidden.test(lifecycleSource),'LoanLifecycle darf keine App- oder DOM-Abhängigkeit enthalten');
}

// Integration nutzt ausschließlich die definierte Forecast-State-Grenze.
assert.ok(integrationSource.includes('ForecastStateStore.financialEvents()'));
assert.ok(integrationSource.includes('ForecastStateStore.setFinancialEvents(events)'));
assert.ok(!/(^|[^\w$])S\s*\./m.test(integrationSource),'Kredit-/Forecast-Integration darf App-State nicht direkt lesen');

// Finanzereignis-UI darf Kreditfunktionen nicht mehr überschreiben.
assert.ok(!/removeLoanCategory\s*=/.test(eventUiSource),'Financial-Events-UI darf removeLoanCategory nicht überschreiben');
assert.ok(!eventUiSource.includes('removeLoanCategoryBase'),'Monkey-Patch-Rest darf nicht bestehen bleiben');
assert.ok(loanStoreSource.includes("LoanLifecycle.emitDeleted({loanId:id,loan:clone(loan)})"),'LoanStore muss Löschung explizit melden');
assert.ok(integrationSource.includes('LoanLifecycle.onDeleted'),'Integration muss Lifecycle abonnieren');

// Verhalten: nur Sondertilgungen des gelöschten Kredits werden entfernt.
const events=[
  {id:'a',type:'specialRepayment',metadata:{loanId:'loan-1'}},
  {id:'b',type:'specialRepayment',metadata:{loanId:'loan-2'}},
  {id:'c',type:'oneTimeExpense',metadata:{loanId:'loan-1'}},
];
const context={Object,Array,Set,Map,String,Number,TypeError};
context.globalThis=context;
context.ForecastStateStore={
  financialEvents:()=>JSON.parse(JSON.stringify(events)),
  setFinancialEvents:value=>{events.splice(0,events.length,...JSON.parse(JSON.stringify(value)));},
};
vm.createContext(context);
vm.runInContext(lifecycleSource,context,{filename:'js/loan-lifecycle.js'});
vm.runInContext(integrationSource,context,{filename:'js/financial-events-loan-integration.js'});
assert.equal(context.LoanLifecycle.listenerCount(),1);
context.LoanLifecycle.emitDeleted({loanId:'loan-1'});
assert.deepEqual(events.map(item=>item.id),['b','c']);

// Registrierung kann sauber entfernt werden.
let calls=0;
const unsubscribe=context.LoanLifecycle.onDeleted(()=>calls++);
assert.equal(context.LoanLifecycle.listenerCount(),2);
unsubscribe();
context.LoanLifecycle.emitDeleted({loanId:'loan-2'});
assert.equal(calls,0);

// Lade-Reihenfolge muss Lifecycle und State-Store vor der Integration laden.
const lifecyclePos=index.indexOf('js/loan-lifecycle.js');
const loanStorePos=index.indexOf('js/loan-store.js');
const storePos=index.indexOf('js/forecast-state-store.js');
const integrationPos=index.indexOf('js/financial-events-loan-integration.js');
assert.ok(lifecyclePos>=0&&lifecyclePos<loanStorePos,'LoanLifecycle muss vor dem LoanStore geladen werden');
assert.ok(lifecyclePos<integrationPos,'LoanLifecycle muss vor der Integration geladen werden');
assert.ok(storePos>=0&&storePos<integrationPos,'ForecastStateStore muss vor der Kredit-/Forecast-Integration geladen werden');

console.log('Phase-D-Kredit-Lifecycle erfolgreich geprüft.');
