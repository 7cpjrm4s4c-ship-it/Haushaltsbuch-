/* State-Grenze fuer die Jahresverwaltung. Keine DOM-Abhaengigkeiten. */
'use strict';
(function(root){
  function state(){if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');return S;}
  function save(){if(typeof root.persist==='function')root.persist();}
  function years(){return Array.isArray(state().years)?[...state().years]:[];}
  function current(){return Number(state().year);}
  function add(year){const value=Number(year);if(!Number.isInteger(value))return false;if(!state().years.includes(value)){state().years=[...state().years,value].sort((a,b)=>a-b);save();return true;}return false;}
  function remove(year){const value=Number(year);if((state().years||[]).length<=1)return{ok:false,reason:'minimum'};state().years=(state().years||[]).filter(item=>item!==value);if(state().year===value)state().year=state().years[0];save();return{ok:true};}
  root.YearStore=Object.freeze({years,current,add,remove});
})(typeof globalThis!=='undefined'?globalThis:window);
