/* State-Grenze fuer Kategorien und Gruppen. Keine DOM- oder UI-Abhaengigkeiten. */
'use strict';

(function(root){
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function save(){if(typeof root.persist==='function')root.persist();}
  function sort(){if(typeof root.sortCategoriesInPlace==='function')root.sortCategoriesInPlace();}
  function all(){return clone(Array.isArray(state().cats)?state().cats:[]);}
  function find(id){return clone((state().cats||[]).find(cat=>cat.id===id)||null);}
  function variable(){return all().filter(cat=>cat.t==='V').sort((a,b)=>String(a.p||'').localeCompare(String(b.p||''),'de',{sensitivity:'base'}));}
  function fixedPositions(){return all().filter(cat=>cat.t!=='V');}
  function fixedGroups(){return [...new Set(fixedPositions().map(cat=>cat.g).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'de',{sensitivity:'base'}));}
  function bookingCount(id){return (state().buchungen||[]).filter(item=>item.catId===id).length;}
  function fixedGroupCount(name){return (state().cats||[]).filter(cat=>cat.t!=='V'&&cat.g===name).length;}
  function saveVariable(id,name,makeId){
    const clean=String(name||'').trim();if(!clean)throw new TypeError('Bezeichnung fehlt');
    const duplicate=(state().cats||[]).find(cat=>cat.t==='V'&&String(cat.p||'').toLowerCase()===clean.toLowerCase()&&cat.id!==id);
    if(duplicate)return {ok:false,reason:'duplicate'};
    const cat=(state().cats||[]).find(item=>item.id===id);
    if(cat)cat.p=clean;else state().cats.push({id:makeId(),g:'Variable Ausgaben',p:clean,d:0,t:'V'});
    sort();save();return {ok:true};
  }
  function removeVariable(id){
    const cat=(state().cats||[]).find(item=>item.id===id&&item.t==='V');if(!cat)return {ok:false,reason:'missing'};
    const count=bookingCount(id);if(count)return {ok:false,reason:'bookings',count,cat:clone(cat)};
    state().cats=(state().cats||[]).filter(item=>item.id!==id);sort();save();return {ok:true,cat:clone(cat)};
  }
  function renameFixedGroup(oldName,newName){
    const clean=String(newName||'').trim();if(!clean)throw new TypeError('Bezeichnung fehlt');
    const duplicate=fixedGroups().some(name=>name.toLowerCase()===clean.toLowerCase()&&name!==oldName);if(duplicate)return {ok:false,reason:'duplicate'};
    if(oldName){(state().cats||[]).filter(cat=>cat.t!=='V'&&cat.g===oldName).forEach(cat=>{cat.g=clean;});}
    else{state().ui=state().ui||{};state().ui.pendingFixedCategory=clean;}
    sort();save();return {ok:true};
  }
  root.CategoryStore=Object.freeze({all,find,variable,fixedPositions,fixedGroups,bookingCount,fixedGroupCount,saveVariable,removeVariable,renameFixedGroup});
})(typeof globalThis!=='undefined'?globalThis:window);
