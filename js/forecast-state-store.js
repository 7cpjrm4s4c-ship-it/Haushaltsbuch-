/**
 * State- und Persistenzgrenze für alle Prognose-Features.
 * @module ForecastStateStore
 */
(function(root){
  'use strict';
  function clone(value){if(value===undefined)return undefined;return JSON.parse(JSON.stringify(value));}
  function array(value){return Array.isArray(value)?value:[];}
  /** @returns {number} Aktives Jahr. */
  function year(){return Number(S.year);}
  /** @returns {number} Aktiver Monat (0–11). */
  function month(){return Number(S.month);}
  /** @returns {Array<Object>} Defensive Kopie der Kredite. */
  function loans(){return clone(array(S.kredite));}
  /** @returns {Array<Object>} Defensive Kopie der Finanzereignisse. */
  function financialEvents(){return clone(array(S.financialEvents));}
  /** @param {Array<Object>} value Neue Finanzereignisse. @returns {Array<Object>} Persistierter Wert als Kopie. */
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
  function setAssets(value){S.forecastAssets=clone(value||{});return assets();}
  /** Persistiert den aktuellen App-Zustand über die zentrale Persistenzschnittstelle. @returns {void} */
  function save(){if(typeof persist!=='function')throw new Error('Persistenzschnittstelle ist nicht verfügbar');persist();}
  root.ForecastStateStore=Object.freeze({year,month,loans,financialEvents,setFinancialEvents,scenarios,setScenarios,goals,setGoals,forecastUi,setForecastUi,assumptions,setAssumptions,assets,setAssets,save});
})(typeof globalThis!=='undefined'?globalThis:window);
