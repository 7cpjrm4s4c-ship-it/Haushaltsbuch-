/* Datenverwaltung v2: echte Leerzustände, reduzierte Werkseinstellungen und alphabetische Kategorien. */
'use strict';

const PREDEFINED_VARIABLE_CATEGORIES = [
  'Apotheke','Auto','Drogerie','Freizeit','Kinder','Kleidung','Lebensmittel','Online','Sonstiges','Urlaub'
];

function deSort(a,b){
  return String(a||'').localeCompare(String(b||''),'de',{sensitivity:'base'});
}

function sortCategoriesInPlace(){
  S.cats.sort((a,b)=>{
    if(a.t==='V'&&b.t!=='V')return 1;
    if(a.t!=='V'&&b.t==='V')return -1;
    const group=deSort(a.g,b.g);
    return group||deSort(a.p,b.p);
  });
}

normalizeVariableCategories=function(){
  const variables=S.cats.filter(c=>c.t==='V');
  const fixed=S.cats.filter(c=>c.t!=='V');
  const byName=new Map(variables.map(c=>[String(c.p||'').trim().toLocaleLowerCase('de'),c]));
  const canonical=[];
  for(const name of PREDEFINED_VARIABLE_CATEGORIES){
    const key=name.toLocaleLowerCase('de');
    let cat=byName.get(key);
    if(!cat){
      cat={id:uid(),g:'Variable Ausgaben',p:name,d:0,t:'V'};
    }else{
      cat.g='Variable Ausgaben';cat.p=name;cat.d=0;cat.t='V';
      byName.delete(key);
    }
    canonical.push(cat);
  }
  const custom=[...byName.values()].map(cat=>({...cat,g:'Variable Ausgaben',d:0,t:'V'}));
  S.cats=[...fixed,...canonical,...custom];
  sortCategoriesInPlace();
};

variableCategories=function(){
  return S.cats.filter(cat=>cat.t==='V').slice().sort((a,b)=>deSort(a.p,b.p));
};
fixedCostCategories=function(){
  return S.cats.filter(cat=>['E','F','K','S'].includes(cat.t)).slice().sort((a,b)=>deSort(a.g,b.g)||deSort(a.p,b.p));
};
fixedCategories=function(){
  return [...new Set(fixedCostCategories().map(cat=>cat.g))].sort(deSort);
};

function factoryVariableCategories(){
  return PREDEFINED_VARIABLE_CATEGORIES.map((name,i)=>({id:`v_factory_${i+1}`,g:'Variable Ausgaben',p:name,d:0,t:'V'}));
}

function factoryFixedPositions(){
  return [
    {id:'f_factory_1',g:'Wohnen',p:'Miete / Wohnkosten',d:0,t:'F'},
    {id:'f_factory_2',g:'Wohnen',p:'Strom',d:0,t:'F'},
    {id:'f_factory_3',g:'Kommunikation',p:'Internet',d:0,t:'F'}
  ];
}

function factoryBookings(){
  const y=now.getFullYear(),m=now.getMonth(),ts=Date.now();
  return [
    {id:'b_factory_1',catId:'v_factory_6',bezeichnung:'Beispiel Kleidung',betrag:0,month:m,year:y,ts},
    {id:'b_factory_2',catId:'v_factory_4',bezeichnung:'Beispiel Freizeit',betrag:0,month:m,year:y,ts:ts+1},
    {id:'b_factory_3',catId:'v_factory_7',bezeichnung:'Beispiel Lebensmittel',betrag:0,month:m,year:y,ts:ts+2}
  ];
}

function factoryCredit(){
  const y=now.getFullYear(),m=now.getMonth();
  return [{id:'k_factory_1',n:'Beispiel Kredit',s:0,r:0,m:0,z:0,g:0,b:'',balanceMonth:m,balanceYear:y}];
}

function applyFactoryState(){
  S.data={};
  S.cats=[...factoryFixedPositions(),...factoryVariableCategories()];
  S.kredite=factoryCredit();
  S.buchungen=factoryBookings();
  S.budgets={};
  S.recurringRules=[];
  S.annualAdjustments=[];
  S.percentageAdjustments=[];
  S.years=defaultYears();
  S.year=now.getFullYear();
  S.month=now.getMonth();
  sortCategoriesInPlace();
}

const _loadDataManagement=load;
load=function(){
  let persisted=null;
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(raw)persisted=JSON.parse(raw);
  }catch(e){}

  _loadDataManagement();

  if(!persisted){
    applyFactoryState();
    persist();
  }else{
    S.data=persisted.data&&typeof persisted.data==='object'?persisted.data:{};
    if(Array.isArray(persisted.cats))S.cats=persisted.cats;
    if(Array.isArray(persisted.kredite))S.kredite=persisted.kredite;
    S.years=Array.isArray(persisted.years)&&persisted.years.length?persisted.years:defaultYears();
    S.buchungen=Array.isArray(persisted.buchungen)?persisted.buchungen:[];
    S.budgets=persisted.budgets&&typeof persisted.budgets==='object'?persisted.budgets:{};
    S.recurringRules=Array.isArray(persisted.recurringRules)?persisted.recurringRules:[];
    S.annualAdjustments=Array.isArray(persisted.annualAdjustments)?persisted.annualAdjustments:[];
    S.percentageAdjustments=Array.isArray(persisted.percentageAdjustments)?persisted.percentageAdjustments:[];
    normalizeVariableCategories();
  }
  if(!S.years.includes(S.year))S.year=S.years[0]||now.getFullYear();
  sortCategoriesInPlace();
};

function destructiveConfirm(){
  return confirm('Beim Bestätigen werden alle Einträge gelöscht!');
}

resetBuchungen=function(){
  if(!destructiveConfirm())return;
  S.buchungen=[];
  S.budgets={};
  persist();
  closeGenSheet();
  render();
  toast('Alle Buchungen gelöscht');
};

function deleteAllEntries(){
  if(!destructiveConfirm())return;
  S.data={};
  S.buchungen=[];
  S.budgets={};
  S.kredite=[];
  S.recurringRules=[];
  S.annualAdjustments=[];
  S.percentageAdjustments=[];
  S.cats=factoryVariableCategories();
  sortCategoriesInPlace();
  persist();
  closeGenSheet();
  render();
  toast('Alle Einträge entfernt');
}

resetAll=function(){
  if(!confirm('Werkseinstellungen wiederherstellen?\n\nBeim Bestätigen werden alle Einträge gelöscht!'))return;
  applyFactoryState();
  persist();
  closeGenSheet();
  render();
  toast('Werkseinstellungen wiederhergestellt');
};

openFixedDataActions=function(){
  openGenSheet(`<div class="sheet-title">Daten verwalten</div>
    <div class="field-hint" style="margin-bottom:14px">Diese Funktionen betreffen gespeicherte Positionen und Buchungen.</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-ghost btn-full" onclick="resetBuchungen()">Buchungen löschen</button>
      <button class="btn btn-red btn-full" onclick="deleteAllEntries()">Alle Einträge löschen</button>
      <div class="sheet-divider"></div>
      <button class="btn btn-ghost btn-full" onclick="resetAll()">App auf Werkseinstellungen zurücksetzen</button>
    </div>`);
};

const _saveVariableCategorySorted=saveVariableCategory;
saveVariableCategory=function(id){
  _saveVariableCategorySorted(id);
  sortCategoriesInPlace();
  persist();
};

const _saveFixedCategorySorted=saveFixedCategory;
saveFixedCategory=function(oldName){
  _saveFixedCategorySorted(oldName);
  sortCategoriesInPlace();
  persist();
};

const _savePositionSorted=savePositionDialog;
savePositionDialog=function(catId){
  _savePositionSorted(catId);
  sortCategoriesInPlace();
  persist();
};
