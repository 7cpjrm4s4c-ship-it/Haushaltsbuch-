/* Neutrale Registry für explizite View- und Berechnungsimplementierungen. */
'use strict';

(function(root){
  const views=new Map();
  const calculations=new Map();

  function register(map,key,implementation,priority=100){
    const name=String(key||'').trim();
    if(!name)throw new TypeError('Registry-Schlüssel ist erforderlich');
    if(typeof implementation!=='function')throw new TypeError('Registry-Implementierung muss eine Funktion sein');
    const score=Number.isFinite(Number(priority))?Number(priority):100;
    const current=map.get(name);
    if(!current||score>=current.priority)map.set(name,{implementation,priority:score});
    return name;
  }

  function resolve(map,key){return map.get(String(key||''))?.implementation||null;}
  function list(map){return [...map.entries()].map(([key,value])=>({key,priority:value.priority})).sort((a,b)=>a.key.localeCompare(b.key));}

  root.AppExtensionRegistry=Object.freeze({
    registerView:(key,implementation,priority)=>register(views,key,implementation,priority),
    resolveView:key=>resolve(views,key),
    listViews:()=>list(views),
    registerCalculation:(key,implementation,priority)=>register(calculations,key,implementation,priority),
    resolveCalculation:key=>resolve(calculations,key),
    listCalculations:()=>list(calculations),
  });
})(typeof globalThis!=='undefined'?globalThis:window);
