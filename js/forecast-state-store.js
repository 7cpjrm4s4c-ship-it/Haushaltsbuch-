/* State-Zugriff für Prognose-Features. Keine DOM- oder Render-Abhängigkeiten. */
(function(root){
  'use strict';

  function clone(value){
    if(value===undefined)return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function array(value){return Array.isArray(value)?value:[];}
  function year(){return Number(S.year);}
  function month(){return Number(S.month);}

  function loans(){return clone(array(S.kredite));}

  function financialEvents(){return clone(array(S.financialEvents));}
  function setFinancialEvents(value){S.financialEvents=clone(array(value));return financialEvents();}

  function scenarios(){return clone(array(S.forecastScenarios));}
  function setScenarios(value){S.forecastScenarios=clone(array(value));return scenarios();}

  function goals(){return clone(array(S.forecastGoals));}
  function setGoals(value){S.forecastGoals=clone(array(value));return goals();}

  function forecastUi(){return clone(S.ui?.forecast||{});}
  function setForecastUi(value){S.ui=S.ui||{};S.ui.forecast=clone(value||{});return forecastUi();}

  function assumptions(){return clone(S.forecastAssumptions||{});}
  function setAssumptions(value){S.forecastAssumptions=clone(value||{});return assumptions();}

  function assets(){return clone(S.forecastAssets||{});}

  function save(){
    if(typeof persist!=='function')throw new Error('Persistenzschnittstelle ist nicht verfügbar');
    persist();
  }

  root.ForecastStateStore=Object.freeze({
    year,month,loans,
    financialEvents,setFinancialEvents,
    scenarios,setScenarios,
    goals,setGoals,
    forecastUi,setForecastUi,
    assumptions,setAssumptions,
    assets,save,
  });
})(typeof globalThis!=='undefined'?globalThis:window);
