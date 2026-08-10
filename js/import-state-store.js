/* State-Grenze fuer den CSV-/TSV-Import. Keine DOM- oder UI-Abhaengigkeiten. */
'use strict';

(function(root){
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function save(){if(typeof root.persist==='function')root.persist();}
  function years(){return Array.isArray(state().years)?[...state().years]:[];}
  function makeId(){return 'x'+Math.random().toString(36).slice(2,9);}
  function apply(parsed){
    const rows=(parsed||[]).filter(row=>row._status!=='err'&&row.betrag!=null);
    if(!rows.length)return{ok:false,reason:'empty'};
    const csvNames=new Set(rows.map(row=>String(row.pos||'').toLowerCase().trim()));
    let newCategories=0,updatedValues=0;
    state().cats=Array.isArray(state().cats)?state().cats:[];state().data=state().data&&typeof state().data==='object'?state().data:{};
    for(const row of rows){
      let category=state().cats.find(cat=>String(cat.p||'').toLowerCase().trim()===String(row.pos||'').toLowerCase().trim());
      if(!category){category={id:makeId(),g:row.gruppe||'Import',p:row.pos,d:0,t:row.typ};state().cats.push(category);newCategories++;}
      const monthSet=new Set(row.monate||[]);
      for(const year of row.jahre||[]){for(let month=0;month<12;month++){const key=`${year}_${month}_${category.id}`;state().data[key]=monthSet.has(month)?Number(row.betrag)||0:0;if(monthSet.has(month))updatedValues++;}}
    }
    if(typeof root.sortCategoriesInPlace==='function')root.sortCategoriesInPlace();save();
    const orphans=state().cats.filter(cat=>!csvNames.has(String(cat.p||'').toLowerCase().trim())).map(clone);
    return{ok:true,importedCount:rows.length,newCategories,updatedValues,orphans};
  }
  function dataCount(categoryId){return Object.keys(state().data||{}).filter(key=>key.endsWith('_'+categoryId)).length;}
  function removeCategories(ids){
    const selected=new Set(ids||[]);let deletedCategories=0,deletedValues=0;
    for(const id of selected){for(const key of Object.keys(state().data||{})){if(key.endsWith('_'+id)){delete state().data[key];deletedValues++;}}}
    const before=(state().cats||[]).length;state().cats=(state().cats||[]).filter(cat=>!selected.has(cat.id));deletedCategories=before-state().cats.length;
    save();return{deletedCategories,deletedValues};
  }
  root.ImportStateStore=Object.freeze({years,apply,dataCount,removeCategories});
})(typeof globalThis!=='undefined'?globalThis:window);
