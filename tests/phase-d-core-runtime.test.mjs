import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [core,uiState,runtime,bindings,index]=await Promise.all([
  read('js/app-core-state.js'),read('js/app-ui-state.js'),read('js/app-view-runtime.js'),read('js/app-extension-bindings.js'),read('index.html')
]);

assert.ok(!index.includes('js/app.js'),'Legacy app.js darf nicht mehr geladen werden');
assert.match(core,/let S=/,'App-Core-State muss den Grundzustand bereitstellen');
assert.match(uiState,/(^|[^\w$])S\b/m,'AppUiState muss die UI-Grenze zum App-State sein');
for(const forbidden of [/\bdocument\s*\./,/\bwindow\s*\./,/\brender\s*\(/,/\bpersist\s*\(/])assert.ok(!forbidden.test(uiState),'AppUiState darf keine DOM-, Render- oder Persistenzabhaengigkeit enthalten');
assert.ok(!/(^|[^\w$])S\s*\./m.test(runtime),'AppViewRuntime darf nicht direkt auf S zugreifen');
assert.match(runtime,/AppUiState/);assert.match(runtime,/function render\s*\(/);assert.match(runtime,/function nav\s*\(/);assert.match(runtime,/function selectYear\s*\(/);assert.match(runtime,/function selectMonth\s*\(/);
for(const binding of ['root.render=runtime.render','root.nav=runtime.nav','root.selYear=runtime.selectYear','root.selMonth=runtime.selectMonth'])assert.ok(bindings.includes(binding),`Composition Root muss ${binding} verdrahten`);

const corePos=index.indexOf('js/app-core-state.js'),statePos=index.indexOf('js/app-ui-state.js'),runtimePos=index.indexOf('js/app-view-runtime.js'),bindingsPos=index.indexOf('js/app-extension-bindings.js'),bootstrapPos=index.indexOf('js/bootstrap.js');
assert.ok(corePos>=0&&statePos>corePos&&runtimePos>statePos&&bindingsPos>runtimePos&&bootstrapPos>bindingsPos,'Ladereihenfolge fuer Core, UI-State, Runtime, Bindings und Bootstrap ist ungueltig');

const S={view:'dashboard',year:2026,month:0,years:[2026,2027]};
const context={S,Object,String,Number,Array,Math,parseInt,Error};context.globalThis=context;vm.createContext(context);vm.runInContext(uiState,context,{filename:'js/app-ui-state.js'});
assert.equal(context.AppUiState.view(),'dashboard');context.AppUiState.setView('ausgaben');context.AppUiState.setYear('2027');context.AppUiState.setMonth('11');
assert.equal(S.view,'ausgaben');assert.equal(S.year,2027);assert.equal(S.month,11);const years=context.AppUiState.years();years.push(2030);assert.deepEqual(S.years,[2026,2027],'AppUiState.years muss eine defensive Kopie liefern');
console.log('Phase-D-Core-Runtime erfolgreich geprueft.');
