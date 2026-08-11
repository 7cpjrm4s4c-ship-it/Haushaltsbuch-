import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const run=(source,context,name)=>{context.globalThis=context;context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:name});return context;};
const plain=value=>JSON.parse(JSON.stringify(value));

const [bookingSource,categorySource,positionSource,yearSource,managerSource,loanCategorySource]=await Promise.all([
  read('js/booking-store.js'),read('js/category-store.js'),read('js/position-store.js'),read('js/year-store.js'),read('js/manager-ui-state.js'),read('js/loan-category-store.js')
]);

// BookingStore: CRUD, Monatsfilter, defensive Kopien und ID-Fehler.
{
  let persists=0;const S={buchungen:[{id:'b1',catId:'v1',betrag:10,year:2026,month:0}]};
  const c=run(bookingSource,{S,JSON,Object,Array,Number,TypeError,Error,persist:()=>persists++},'js/booking-store.js');
  const all=c.BookingStore.all();all[0].betrag=99;assert.equal(S.buchungen[0].betrag,10);
  assert.equal(c.BookingStore.find('b1').id,'b1');assert.equal(c.BookingStore.find('x'),null);
  assert.equal(c.BookingStore.forMonth(2026,0).length,1);assert.equal(c.BookingStore.forMonth(2026,1).length,0);
  assert.throws(()=>c.BookingStore.add({betrag:5}),/Buchungs-ID/);
  c.BookingStore.add({id:'b2',catId:'v1',betrag:20,year:2026,month:1});assert.equal(persists,1);
  assert.equal(c.BookingStore.update('b2',{betrag:25}).betrag,25);assert.equal(persists,2);assert.equal(c.BookingStore.update('missing',{}),null);
  assert.equal(c.BookingStore.remove('missing'),false);assert.equal(persists,2);
  assert.equal(c.BookingStore.remove('b1'),true);assert.equal(persists,3);
  c.BookingStore.clear();assert.deepEqual(plain(S.buchungen),[]);assert.equal(persists,4);
}

// CategoryStore: Filter, Duplikate, Buchungsschutz und Gruppenverwaltung.
{
  let persists=0,sorts=0,id=0;
  const S={cats:[{id:'v1',g:'Variable Ausgaben',p:'Lebensmittel',d:0,t:'V'},{id:'f1',g:'Wohnen',p:'Miete',d:1000,t:'F'},{id:'f2',g:'Wohnen',p:'Strom',d:80,t:'F'}],buchungen:[{id:'b1',catId:'v1'}],ui:{}};
  const c=run(categorySource,{S,JSON,Object,Array,Set,String,TypeError,Error,persist:()=>persists++,DataManagementStore:{sortCategoriesInPlace:()=>sorts++}},'js/category-store.js');
  assert.equal(c.CategoryStore.variable().length,1);assert.equal(c.CategoryStore.fixedPositions().length,2);assert.deepEqual(plain(c.CategoryStore.fixedGroups()),['Wohnen']);
  assert.equal(c.CategoryStore.bookingCount('v1'),1);assert.equal(c.CategoryStore.fixedGroupCount('Wohnen'),2);
  assert.throws(()=>c.CategoryStore.saveVariable(null,'',()=>`v${++id}`),/Bezeichnung/);
  assert.deepEqual(plain(c.CategoryStore.saveVariable(null,'lebensmittel',()=>`v${++id}`)),{ok:false,reason:'duplicate'});
  assert.equal(c.CategoryStore.saveVariable(null,'Freizeit',()=>`v${++id}`).ok,true);assert.equal(S.cats.some(x=>x.p==='Freizeit'),true);assert.equal(persists,1);assert.equal(sorts,1);
  const blocked=c.CategoryStore.removeVariable('v1');assert.equal(blocked.ok,false);assert.equal(blocked.reason,'bookings');assert.equal(blocked.count,1);
  S.buchungen=[];assert.equal(c.CategoryStore.removeVariable('v1').ok,true);assert.equal(persists,2);
  assert.equal(c.CategoryStore.removeVariable('missing').reason,'missing');
  assert.throws(()=>c.CategoryStore.renameFixedGroup('Wohnen',''),/Bezeichnung/);
  S.cats.push({id:'f3',g:'Auto',p:'Versicherung',d:0,t:'F'});assert.equal(c.CategoryStore.renameFixedGroup('Wohnen','Auto').reason,'duplicate');
  assert.equal(c.CategoryStore.renameFixedGroup('Wohnen','Haushalt').ok,true);assert.equal(S.cats.filter(x=>x.id==='f1'||x.id==='f2').every(x=>x.g==='Haushalt'),true);
  assert.equal(c.CategoryStore.renameFixedGroup('', 'Neu').ok,true);assert.equal(S.ui.pendingFixedCategory,'Neu');
}

// PositionStore: Planungsregeln schreiben/ersetzen und Position vollständig löschen.
{
  let persists=0,sorts=0,id=0;
  const S={cats:[],years:[2026,2027],year:2026,month:5,data:{},budgets:{},recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[],ui:{pendingFixedCategory:'Wohnen'}};
  const c=run(positionSource,{S,JSON,Object,Array,String,Number,Math,Error,uid:()=>`id${++id}`,persist:()=>persists++,DataManagementStore:{sortCategoriesInPlace:()=>sorts++}},'js/position-store.js');
  assert.deepEqual(plain(c.PositionStore.years()),[2026,2027]);assert.deepEqual(plain(c.PositionStore.currentPeriod()),{year:2026,month:5});assert.equal(c.PositionStore.pendingCategory(),'Wohnen');
  const saved=c.PositionStore.savePosition({catId:null,category:'Wohnen',name:'Miete',amount:1000,type:'F',intervalMonths:1,startMonth:0,startYear:2026,endMonth:null,endYear:null,percentage:{percent:2,year:2027,month:0},amountAdjustment:{amount:20,year:2027,month:8},oneTime:{amount:100,year:2026,month:11,label:'Bonus'}});
  assert.equal(saved.ok,true);assert.ok(saved.catId);assert.equal(S.cats.length,1);assert.equal(S.recurringRules.length,1);assert.equal(S.percentageAdjustments.length,1);assert.equal(S.amountAdjustments.length,1);assert.equal(S.oneTimeEntries.length,1);assert.equal(S.ui.pendingFixedCategory,'');assert.equal(persists,1);assert.equal(sorts,1);
  S.data[`2026_0_${saved.catId}`]=1000;S.budgets[saved.catId]=500;S.annualAdjustments.push({id:'a1',catId:saved.catId});
  const removed=c.PositionStore.removePosition(saved.catId);assert.equal(removed.p,'Miete');assert.equal(S.cats.length,0);assert.equal(Object.keys(S.data).length,0);assert.equal(S.budgets[saved.catId],undefined);
  for(const name of ['recurringRules','annualAdjustments','percentageAdjustments','amountAdjustments','oneTimeEntries'])assert.equal(S[name].length,0);
  assert.equal(persists,2);assert.equal(c.PositionStore.removePosition('missing'),null);
}

// YearStore: Sortierung, Duplikate, Mindestjahr und aktuelle Jahresumschaltung.
{
  let persists=0;const S={years:[2026,2028],year:2028};
  const c=run(yearSource,{S,Object,Array,Number,Error,persist:()=>persists++},'js/year-store.js');
  const years=c.YearStore.years();years.push(2030);assert.deepEqual(S.years,[2026,2028]);assert.equal(c.YearStore.current(),2028);
  assert.equal(c.YearStore.add('x'),false);assert.equal(c.YearStore.add(2027),true);assert.deepEqual(plain(S.years),[2026,2027,2028]);assert.equal(persists,1);assert.equal(c.YearStore.add(2027),false);
  assert.equal(c.YearStore.remove(2028).ok,true);assert.equal(S.year,2026);assert.equal(persists,2);
  c.YearStore.remove(2027);assert.equal(c.YearStore.remove(2026).reason,'minimum');
}

// ManagerUiState: lokale Filterwerte und defensive Snapshots.
{
  const c=run(managerSource,{Object,String},'js/manager-ui-state.js');
  assert.deepEqual(plain(c.ManagerUiState.snapshot()),{fixedType:'all',fixedGroup:'all',fixedSearch:'',expenseCategoryId:''});
  assert.equal(c.ManagerUiState.setFixedType('F'),'F');assert.equal(c.ManagerUiState.setFixedGroup('Wohnen'),'Wohnen');assert.equal(c.ManagerUiState.setFixedSearch('miete'),'miete');assert.equal(c.ManagerUiState.setExpenseCategory('v1'),'v1');
  const snapshot=c.ManagerUiState.snapshot();snapshot.fixedType='X';assert.equal(c.ManagerUiState.snapshot().fixedType,'F');
  c.ManagerUiState.resetExpense();assert.equal(c.ManagerUiState.snapshot().expenseCategoryId,'');
}

// LoanCategoryStore: Anlegen/Aktualisieren, SyncAll-Bereinigung und abhängige Regeln löschen.
{
  let id=0;
  const S={kredite:[{id:'k1',n:'Autokredit',m:250}],cats:[],recurringRules:[],annualAdjustments:[],percentageAdjustments:[],amountAdjustments:[],oneTimeEntries:[]};
  const c=run(loanCategorySource,{S,Object,Array,Set,String,Number,Math,Error,uid:()=>`c${++id}`},'js/loan-category-store.js');
  const cat=c.LoanCategoryStore.sync(S.kredite[0]);assert.equal(cat.loanId,'k1');assert.equal(cat.d,250);assert.equal(S.cats.length,1);
  S.kredite[0].n='Auto neu';S.kredite[0].m=300;const updated=c.LoanCategoryStore.sync(S.kredite[0]);assert.equal(updated.id,cat.id);assert.equal(updated.p,'Auto neu');assert.equal(updated.d,300);
  S.cats.push({id:'orphan',g:'Kredite',p:'Alt',d:10,t:'K',loanId:'gone',source:'loan'});c.LoanCategoryStore.syncAll();assert.equal(S.cats.some(x=>x.id==='orphan'),false);
  for(const name of ['recurringRules','annualAdjustments','percentageAdjustments','amountAdjustments','oneTimeEntries'])S[name]=[{id:name,catId:cat.id},{id:`keep-${name}`,catId:'other'}];
  c.LoanCategoryStore.remove('k1');assert.equal(S.cats.some(x=>x.loanId==='k1'),false);for(const name of ['recurringRules','annualAdjustments','percentageAdjustments','amountAdjustments','oneTimeEntries'])assert.deepEqual(plain(S[name].map(x=>x.catId)),['other']);
}

console.log('Phase-D-Domänen-Stores vollständig direkt geprüft.');
