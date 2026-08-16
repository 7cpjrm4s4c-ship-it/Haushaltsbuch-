import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [schemaSource,storeSource,uiSource,dashboardSource,storageSource,backupSource,index,sw]=await Promise.all([
  'js/state-schema.js','js/account-balance-store.js','js/account-balance-ui.js','js/dashboard-view.js','js/state-storage.js','js/backup-store.js','index.html','sw.js'
].map(read));

const schemaContext={Object,Array,Set,String,Number,Date,Math,RegExp};schemaContext.globalThis=schemaContext;vm.createContext(schemaContext);vm.runInContext(schemaSource,schemaContext);
const normalized=schemaContext.StateSchema.normalize({years:[2026],accountBalances:{'2026_7':'1234.56','2026_12':99,'x':10,'2025_1':'invalid'}},{defaultYears:()=>[2026]});
assert.deepEqual(JSON.parse(JSON.stringify(normalized.accountBalances)),{'2026_7':1234.56});
assert.equal(normalized.schemaVersion,7);

let persists=0;const S={accountBalances:{'2026_7':100}};
const storeContext={Object,Number,RangeError,TypeError,S,persist:()=>persists++};storeContext.globalThis=storeContext;vm.createContext(storeContext);vm.runInContext(storeSource,storeContext);
assert.equal(storeContext.AccountBalanceStore.get(2026,7),100);
assert.equal(storeContext.AccountBalanceStore.get(2026,6),null);
storeContext.AccountBalanceStore.set(2026,7,-25.5);assert.equal(S.accountBalances['2026_7'],-25.5);assert.equal(persists,1);
assert.equal(storeContext.AccountBalanceStore.remove(2026,7),true);assert.equal(storeContext.AccountBalanceStore.get(2026,7),null);assert.equal(persists,2);
assert.throws(()=>storeContext.AccountBalanceStore.set(2026,12,1),RangeError);

assert.match(uiSource,/HOLD_DURATION=600/);
assert.match(uiSource,/MOVE_TOLERANCE=12/);
assert.match(uiSource,/inputmode="decimal"/);
assert.match(uiSource,/event\.shiftKey&&event\.key==='Enter'/);
assert.ok(!/(^|[^\w$])S\s*\./m.test(uiSource),'Kontostand-UI darf den App-State nicht direkt lesen');
assert.ok(!/\.style\s*\./.test(uiSource),'Kontostand-UI darf keine CSS-Regeln zur Laufzeit erzeugen');
assert.match(dashboardSource,/hero-sub hero-sub-four/);
assert.match(dashboardSource,/>Kontostand</);
assert.match(dashboardSource,/lange drücken/);
for(const source of [storageSource,backupSource])assert.ok(source.includes('accountBalances'),'Kontostände müssen Persistenz und Backup durchlaufen');
assert.ok(index.includes('js/account-balance-store.js')&&index.includes('js/account-balance-ui.js'));
assert.ok(sw.includes("'./js/account-balance-store.js'")&&sw.includes("'./js/account-balance-ui.js'"));

console.log('Monatliche Kontostände erfolgreich geprüft.');
