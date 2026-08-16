/* State-Grenze fuer Werkseinstellungen, Reset und Kategorie-Normalisierung. Keine DOM-Abhaengigkeiten. */
'use strict';

(function(root){
  const PREDEFINED_VARIABLE_CATEGORIES=['Apotheke','Auto','Drogerie','Freizeit','Kinder','Kleidung','Lebensmittel','Online','Sonstiges','Urlaub'];
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function save(){if(typeof root.persist==='function')root.persist();}
  function deSort(a,b){return String(a||'').localeCompare(String(b||''),'de',{sensitivity:'base'});}
  function makeId(){return typeof root.uid==='function'?root.uid():'x'+Math.random().toString(36).slice(2,9);}
  function years(){return typeof root.defaultYears==='function'?root.defaultYears():[];}
  function currentDate(){return typeof root.now!=='undefined'&&root.now instanceof Date?root.now:new Date();}
  function sortCategoriesInPlace(){const s=state();s.cats=(s.cats||[]).sort((a,b)=>{if(a.t==='V'&&b.t!=='V')return 1;if(a.t!=='V'&&b.t==='V')return -1;const group=deSort(a.g,b.g);return group||deSort(a.p,b.p);});return s.cats;}
  function normalizeVariableCategories(){
    const s=state(),variables=(s.cats||[]).filter(c=>c.t==='V'),fixed=(s.cats||[]).filter(c=>c.t!=='V'),byName=new Map(variables.map(c=>[String(c.p||'').trim().toLocaleLowerCase('de'),c])),canonical=[];
    for(const name of PREDEFINED_VARIABLE_CATEGORIES){const key=name.toLocaleLowerCase('de');let cat=byName.get(key);if(!cat)cat={id:makeId(),g:'Variable Ausgaben',p:name,d:0,t:'V'};else{cat.g='Variable Ausgaben';cat.p=name;cat.d=0;cat.t='V';byName.delete(key);}canonical.push(cat);}
    const custom=[...byName.values()].map(cat=>({...cat,g:'Variable Ausgaben',d:0,t:'V'}));s.cats=[...fixed,...canonical,...custom];sortCategoriesInPlace();return s.cats;
  }
  function variableCategories(){return (state().cats||[]).filter(cat=>cat.t==='V').slice().sort((a,b)=>deSort(a.p,b.p));}
  function fixedCostCategories(){return (state().cats||[]).filter(cat=>['E','F','K','S'].includes(cat.t)).slice().sort((a,b)=>deSort(a.g,b.g)||deSort(a.p,b.p));}
  function fixedCategories(){return [...new Set(fixedCostCategories().map(cat=>cat.g))].sort(deSort);}
  function factoryVariableCategories(){return PREDEFINED_VARIABLE_CATEGORIES.map((name,i)=>({id:`v_factory_${i+1}`,g:'Variable Ausgaben',p:name,d:0,t:'V'}));}
  function factoryFixedPositions(){return [{id:'f_factory_1',g:'Wohnen',p:'Miete / Wohnkosten',d:0,t:'F'},{id:'f_factory_2',g:'Wohnen',p:'Strom',d:0,t:'F'},{id:'f_factory_3',g:'Kommunikation',p:'Internet',d:0,t:'F'}];}
  function factoryBookings(){const date=currentDate(),y=date.getFullYear(),m=date.getMonth(),ts=Date.now();return [{id:'b_factory_1',catId:'v_factory_6',bezeichnung:'Beispiel Kleidung',betrag:0,month:m,year:y,ts},{id:'b_factory_2',catId:'v_factory_4',bezeichnung:'Beispiel Freizeit',betrag:0,month:m,year:y,ts:ts+1},{id:'b_factory_3',catId:'v_factory_7',bezeichnung:'Beispiel Lebensmittel',betrag:0,month:m,year:y,ts:ts+2}];}
  function factoryCredit(){const date=currentDate(),y=date.getFullYear(),m=date.getMonth();return [{id:'k_factory_1',n:'Beispiel Kredit',s:0,r:0,m:0,z:0,g:0,b:'',balanceMonth:m,balanceYear:y}];}
  function emptyForecastAssets(){return {cash:0,callMoney:0,fixedDeposit:0,etf:0,depot:0,other:0};}
  function defaultForecastAssumptions(){return {annualReturns:{cash:0,callMoney:0,fixedDeposit:0,etf:0,depot:0,other:0},purchasingPowerInflation:2,savingsTarget:'etf'};}
  function applyFactoryState(){const s=state(),date=currentDate();s.data={};s.cats=[...factoryFixedPositions(),...factoryVariableCategories()];s.kredite=factoryCredit();s.buchungen=factoryBookings();s.budgets={};s.recurringRules=[];s.annualAdjustments=[];s.percentageAdjustments=[];s.amountAdjustments=[];s.oneTimeEntries=[];s.accountBalances={};s.forecastAssets=emptyForecastAssets();s.forecastAssumptions=defaultForecastAssumptions();s.financialEvents=[];s.forecastScenarios=[];s.forecastGoals=[];s.years=years();s.year=date.getFullYear();s.month=date.getMonth();sortCategoriesInPlace();}
  function clearBookings(){const s=state();s.buchungen=[];s.budgets={};save();}
  function deleteAllEntries(){const s=state();s.data={};s.buchungen=[];s.budgets={};s.kredite=[];s.recurringRules=[];s.annualAdjustments=[];s.percentageAdjustments=[];s.amountAdjustments=[];s.oneTimeEntries=[];s.accountBalances={};s.financialEvents=[];s.forecastScenarios=[];s.forecastGoals=[];s.forecastAssets=emptyForecastAssets();s.forecastAssumptions=defaultForecastAssumptions();s.cats=factoryVariableCategories();sortCategoriesInPlace();save();}
  function resetToFactory(){applyFactoryState();root.LoanCategoryStore?.syncAll?.();save();}
  root.DataManagementStore=Object.freeze({PREDEFINED_VARIABLE_CATEGORIES,deSort,sortCategoriesInPlace,normalizeVariableCategories,variableCategories,fixedCostCategories,fixedCategories,factoryVariableCategories,factoryFixedPositions,factoryBookings,factoryCredit,emptyForecastAssets,defaultForecastAssumptions,applyFactoryState,clearBookings,deleteAllEntries,resetToFactory});
})(typeof globalThis!=='undefined'?globalThis:window);
