/* State-Grenze fuer feste Positionen und Planungsanpassungen. Keine DOM-Abhaengigkeiten. */
'use strict';

(function(root){
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function save(){if(typeof root.persist==='function')root.persist();}
  function makeId(){return typeof root.uid==='function'?root.uid():'x'+Math.random().toString(36).slice(2,9);}
  function monthNo(year,month){return Number(year)*12+Number(month);}
  function fixedCategories(){return (state().cats||[]).filter(cat=>cat.t!=='V').map(clone);}
  function findCategory(id){return clone((state().cats||[]).find(cat=>cat.id===id)||null);}
  function years(){return Array.isArray(state().years)?[...state().years]:[];}
  function currentPeriod(){return{year:Number(state().year),month:Number(state().month)};}
  function pendingCategory(){return String(state().ui?.pendingFixedCategory||'');}
  function recurringRule(catId){return clone((state().recurringRules||[]).find(item=>item.catId===catId)||null);}
  function latest(listName,catId){return clone((state()[listName]||[]).filter(item=>item.catId===catId).sort((a,b)=>monthNo(b.year,b.month)-monthNo(a.year,a.month))[0]||null);}
  function percentageAdjustment(catId){return latest('percentageAdjustments',catId);}
  function amountAdjustment(catId){return latest('amountAdjustments',catId);}
  function oneTimeEntry(catId){return latest('oneTimeEntries',catId);}
  function savePosition(input){
    const s=state();let cat=(s.cats||[]).find(item=>item.id===input.catId);let catId=input.catId;
    if(!cat){cat={id:makeId(),g:input.category,p:input.name,d:input.amount,t:input.type};s.cats.push(cat);catId=cat.id;}
    else Object.assign(cat,{g:input.category,p:input.name,d:input.amount,t:input.type});
    for(const key of Object.keys(s.data||{})){if(key.endsWith(`_${catId}`))delete s.data[key];}
    s.recurringRules=(s.recurringRules||[]).filter(item=>item.catId!==catId);
    s.recurringRules.push({id:makeId(),catId,amount:input.amount,intervalMonths:input.intervalMonths,startMonth:input.startMonth,startYear:input.startYear,endMonth:input.endMonth,endYear:input.endYear});
    s.percentageAdjustments=(s.percentageAdjustments||[]).filter(item=>item.catId!==catId);
    if(input.percentage)s.percentageAdjustments.push({id:makeId(),catId,...input.percentage,repeatAnnual:true});
    s.amountAdjustments=(s.amountAdjustments||[]).filter(item=>item.catId!==catId);
    if(input.amountAdjustment)s.amountAdjustments.push({id:makeId(),catId,...input.amountAdjustment});
    s.oneTimeEntries=(s.oneTimeEntries||[]).filter(item=>item.catId!==catId);
    if(input.oneTime)s.oneTimeEntries.push({id:makeId(),catId,...input.oneTime});
    s.ui=s.ui||{};s.ui.pendingFixedCategory='';
    if(typeof root.sortCategoriesInPlace==='function')root.sortCategoriesInPlace();
    save();return{ok:true,catId};
  }
  root.PositionStore=Object.freeze({fixedCategories,findCategory,years,currentPeriod,pendingCategory,recurringRule,percentageAdjustment,amountAdjustment,oneTimeEntry,savePosition});
})(typeof globalThis!=='undefined'?globalThis:window);
