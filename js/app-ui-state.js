/* UI-State-Grenze fuer Navigation und Zeitraumwahl. Keine DOM-Abhaengigkeiten. */
'use strict';

(function(root){
  function state(){
    if(typeof S==='undefined'||!S)throw new Error('App-State fehlt');
    return S;
  }
  function view(){return state().view;}
  function year(){return state().year;}
  function month(){return state().month;}
  function years(){return Array.isArray(state().years)?[...state().years]:[];}
  function setView(value){state().view=String(value||'dashboard');return state().view;}
  function setYear(value){const parsed=parseInt(value,10);if(Number.isFinite(parsed))state().year=parsed;return state().year;}
  function setMonth(value){const parsed=parseInt(value,10);if(Number.isFinite(parsed))state().month=Math.max(0,Math.min(11,parsed));return state().month;}

  root.AppUiState=Object.freeze({view,year,month,years,setView,setYear,setMonth});
})(typeof globalThis!=='undefined'?globalThis:window);
