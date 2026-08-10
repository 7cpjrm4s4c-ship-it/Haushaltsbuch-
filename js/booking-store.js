/* State-Grenze fuer variable Buchungen. Keine DOM- oder UI-Abhaengigkeiten. */
'use strict';

(function(root){
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
  function save(){if(typeof root.persist==='function')root.persist();}
  function all(){return clone(Array.isArray(state().buchungen)?state().buchungen:[]);}
  function find(id){return clone((state().buchungen||[]).find(item=>item.id===id)||null);}
  function forMonth(year,month){return all().filter(item=>Number(item.year)===Number(year)&&Number(item.month)===Number(month));}
  function add(input){
    const item={...clone(input)};
    if(!item.id)throw new TypeError('Buchungs-ID fehlt');
    state().buchungen=Array.isArray(state().buchungen)?state().buchungen:[];
    state().buchungen.push(item);save();return clone(item);
  }
  function update(id,changes){
    const item=(state().buchungen||[]).find(entry=>entry.id===id);if(!item)return null;
    Object.assign(item,clone(changes));save();return clone(item);
  }
  function remove(id){
    const before=(state().buchungen||[]).length;
    state().buchungen=(state().buchungen||[]).filter(item=>item.id!==id);
    const removed=state().buchungen.length!==before;if(removed)save();return removed;
  }
  function clear(){state().buchungen=[];save();}

  root.BookingStore=Object.freeze({all,find,forMonth,add,update,remove,clear});
})(typeof globalThis!=='undefined'?globalThis:window);
