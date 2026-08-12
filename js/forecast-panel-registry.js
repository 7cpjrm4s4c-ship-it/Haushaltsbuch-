/* Neutrale Registry für Prognose-UI-Erweiterungen. Keine App-State- oder DOM-Abhängigkeiten. */
(function(root){
  'use strict';

  const slots=new Map();

  function entriesFor(slot){
    if(!slots.has(slot))slots.set(slot,new Map());
    return slots.get(slot);
  }

  function register(slot,id,renderer,priority=100){
    const slotName=String(slot||'').trim(),panelId=String(id||'').trim();
    if(!slotName||!panelId)throw new TypeError('Slot und Panel-ID sind erforderlich');
    if(typeof renderer!=='function')throw new TypeError('Panel-Renderer muss eine Funktion sein');
    entriesFor(slotName).set(panelId,{id:panelId,renderer,priority:Number.isFinite(Number(priority))?Number(priority):100});
    return panelId;
  }

  function unregister(slot,id){
    const entries=slots.get(String(slot||''));
    return entries?entries.delete(String(id||'')):false;
  }

  function orderedEntries(slot){
    const entries=slots.get(String(slot||''));
    return entries?[...entries.values()].sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id)):[];
  }

  function render(slot,context,options={}){
    const include=Array.isArray(options.include)?new Set(options.include.map(String)):null;
    const exclude=new Set(Array.isArray(options.exclude)?options.exclude.map(String):[]);
    return orderedEntries(slot)
      .filter(item=>(!include||include.has(item.id))&&!exclude.has(item.id))
      .map(item=>String(item.renderer(context)??''))
      .join('');
  }

  function list(slot){return orderedEntries(slot).map(({id,priority})=>({id,priority}));}

  root.ForecastPanelRegistry=Object.freeze({register,unregister,render,list});
})(typeof globalThis!=='undefined'?globalThis:window);
