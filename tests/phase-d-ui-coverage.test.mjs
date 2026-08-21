import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const run=(source,context,name)=>{context.globalThis=context;context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:name});return context;};
const plain=value=>JSON.parse(JSON.stringify(value));

const [importServiceSource,importStoreSource,loanControllerSource,dialogRuntimeSource]=await Promise.all([
  read('js/import-service.js'),read('js/import-state-store.js'),read('js/loan-actions-controller.js'),read('js/app-dialog-runtime.js')
]);

// ImportService: Parser, Delimiter, Normalisierung und Warn-/Fehlerpfade.
{
  const c=run(importServiceSource,{Object,Array,Set,String,Number,Math},'js/import-service.js');
  assert.equal(c.ImportService.normalizeType('einnahmen'),'E');
  assert.equal(c.ImportService.normalizeType('unbekannt'),null);
  assert.deepEqual(plain(c.ImportService.resolveYears('2028-2026',[2025])),[2026,2027,2028]);
  assert.deepEqual(plain(c.ImportService.resolveYears('alle',[2025,2026])),[2025,2026]);
  assert.deepEqual(plain(c.ImportService.resolveMonths('Jan März 12')),[0,2,11]);
  assert.equal(c.ImportService.resolveMonths('unbekannt').length,12);

  const template=c.ImportService.createTemplate([2026,2027]);
  const templateResult=c.ImportService.parse(template,[2026,2027]);
  assert.equal(templateResult.errors.length,0);
  assert.equal(templateResult.parsed.length,5);
  assert.deepEqual(plain(templateResult.parsed.map(row=>row.typ)),['E','F','V','K','S']);
  assert.equal(templateResult.parsed.every(row=>row._status==='ok'),true);
  assert.equal(templateResult.parsed[2].jahre[0],2026);
  assert.match(template,/nicht verknüpft/,'Kredit- und Sparbeispiele müssen ihre CSV-Grenze benennen');

  const parsed=c.ImportService.parse('Position;Gruppe;Typ;Betrag;Jahr;Monat\nMiete;Wohnen;F;1200,50;2026;Jan\nBonus;Einnahmen;X;1600;2026;12',[2026]);
  assert.equal(parsed.errors.length,0);assert.equal(parsed.parsed.length,2);
  assert.equal(parsed.parsed[0].betrag,1200.5);assert.equal(parsed.parsed[0].typ,'F');assert.deepEqual(plain(parsed.parsed[0].monate),[0]);
  assert.equal(parsed.parsed[1]._status,'warn');assert.equal(parsed.parsed[1].typ,'F');

  const invalid=c.ImportService.parse('Position,Betrag\n,abc',[2026]);
  assert.equal(invalid.parsed[0]._status,'err');assert.equal(invalid.parsed[0].betrag,null);
  assert.deepEqual(plain(c.ImportService.parse('nur eine Zeile',[2026]).errors),['Weniger als 2 Zeilen']);
}

// ImportStateStore: Anwenden, neue Kategorien, Datenwerte, Orphans und Entfernen.
{
  let persists=0,sorts=0;
  const S={years:[2026,2027],cats:[{id:'c1',g:'Wohnen',p:'Miete',d:0,t:'F'},{id:'old',g:'Alt',p:'Altbestand',d:0,t:'F'}],data:{'2026_0_old':10}};
  const c=run(importStoreSource,{S,JSON,Object,Array,Set,String,Number,Math,persist:()=>persists++,DataManagementStore:{sortCategoriesInPlace:()=>sorts++}},'js/import-state-store.js');
  assert.deepEqual(plain(c.ImportStateStore.years()),[2026,2027]);
  const empty=c.ImportStateStore.apply([{pos:'Fehler',betrag:null,_status:'err'}]);assert.equal(empty.ok,false);assert.equal(empty.reason,'empty');
  const result=c.ImportStateStore.apply([
    {pos:'Miete',gruppe:'Wohnen',typ:'F',betrag:1000,jahre:[2026],monate:[0,1],_status:'ok'},
    {pos:'Strom',gruppe:'Wohnen',typ:'F',betrag:80,jahre:[2026],monate:[0],_status:'ok'}
  ]);
  assert.equal(result.ok,true);assert.equal(result.importedCount,2);assert.equal(result.newCategories,1);assert.equal(result.updatedValues,3);
  assert.equal(sorts,1);assert.equal(persists,1);assert.equal(S.data['2026_0_c1'],1000);assert.equal(S.data['2026_1_c1'],1000);assert.equal(S.data['2026_2_c1'],0);
  assert.equal(result.orphans.some(x=>x.id==='old'),true);
  const strom=S.cats.find(cat=>cat.p==='Strom');assert.ok(strom);assert.equal(c.ImportStateStore.dataCount(strom.id),12);
  const removed=c.ImportStateStore.removeCategories([strom.id,'old']);assert.equal(removed.deletedCategories,2);assert.equal(removed.deletedValues,13);assert.equal(persists,2);
}

// LoanActionsController: Erfolgs-, Abbruch- und Nicht-gefunden-Pfade.
{
  const calls=[];let confirmResult=true;
  const loans=new Map([['k1',{id:'k1',n:'Alt',s:1000}]]);
  const context={
    Object,String,
    uid:()=> 'k2',
    CreditUi:{readForm:current=>current?{n:'Neu',s:900}:{n:'Neu Kredit',s:500}},
    LoanStore:{
      add:(values,makeId)=>{const loan={id:makeId(),...values};loans.set(loan.id,loan);calls.push(['add',loan.id]);return loan;},
      find:id=>loans.get(id)||null,
      update:(id,values)=>{const loan={...loans.get(id),...values};loans.set(id,loan);calls.push(['update',id]);return loan;},
      remove:id=>{const loan=loans.get(id)||null;if(loan)loans.delete(id);calls.push(['remove',id]);return loan;}
    },
    closeGenSheet:()=>calls.push(['close']),render:()=>calls.push(['render']),toast:text=>calls.push(['toast',text]),esc:value=>String(value),
    confirm:()=>confirmResult
  };
  const c=run(loanControllerSource,context,'js/loan-actions-controller.js');
  c.LoanActionsController.create();assert.equal(loans.has('k2'),true);assert.equal(calls.some(x=>x[0]==='toast'&&x[1].includes('hinzugefügt')),true);
  c.LoanActionsController.update('k1');assert.equal(loans.get('k1').n,'Neu');assert.equal(calls.some(x=>x[0]==='update'),true);
  confirmResult=false;const before=calls.filter(x=>x[0]==='remove').length;c.LoanActionsController.remove('k1');assert.equal(calls.filter(x=>x[0]==='remove').length,before);
  confirmResult=true;c.LoanActionsController.remove('k1');assert.equal(loans.has('k1'),false);assert.equal(calls.some(x=>x[0]==='toast'&&x[1].includes('gelöscht')),true);
  const count=calls.length;c.LoanActionsController.update('missing');c.LoanActionsController.remove('missing');assert.equal(calls.length,count);

  const noForm=run(loanControllerSource,{...context,CreditUi:{readForm:()=>null}},'js/loan-actions-controller.js');
  const countBefore=calls.length;noForm.LoanActionsController.create();assert.equal(calls.length,countBefore);
}

// AppDialogRuntime: Öffnen, Fokus, Schließen und fehlende DOM-Ziele.
{
  let focused=0;
  const body={innerHTML:''};
  const classes=new Set();
  const overlay={classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}};
  const field={focus:()=>focused++};
  const document={getElementById:id=>id==='genBody'?body:id==='genOverlay'?overlay:null,querySelector:selector=>selector.includes('#genBody')?field:null};
  const c=run(dialogRuntimeSource,{Object,String,document,setTimeout:fn=>{fn();return 1;}},'js/app-dialog-runtime.js');
  c.AppDialogRuntime.open('<input value="x">');assert.equal(body.innerHTML,'<input value="x">');assert.equal(classes.has('open'),true);assert.equal(focused,1);
  c.AppDialogRuntime.close();assert.equal(classes.has('open'),false);

  const missing=run(dialogRuntimeSource,{Object,String,document:{getElementById:()=>null,querySelector:()=>null},setTimeout:fn=>fn()},'js/app-dialog-runtime.js');
  assert.doesNotThrow(()=>missing.AppDialogRuntime.open('x'));assert.doesNotThrow(()=>missing.AppDialogRuntime.close());
}

console.log('Phase-D-Controller-/Import-/UI-Grenzen erfolgreich direkt geprüft.');
