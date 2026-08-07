/* Zentrales Schema für den persistierten App-Zustand. Keine DOM-Abhängigkeiten. */
'use strict';

(function(root){
  const CURRENT_VERSION = 1;

  function isRecord(value){
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function objectOrEmpty(value){
    return isRecord(value) ? value : {};
  }

  function arrayOrEmpty(value){
    return Array.isArray(value) ? value : [];
  }

  function normalizeYears(value, fallbackYears){
    const years = arrayOrEmpty(value)
      .map(Number)
      .filter(year => Number.isInteger(year) && year >= 2000 && year <= 2200);
    const unique = [...new Set(years)].sort((a,b)=>a-b);
    if(unique.length) return unique;
    const fallback = typeof fallbackYears === 'function' ? fallbackYears() : fallbackYears;
    return arrayOrEmpty(fallback).map(Number).filter(Number.isInteger).sort((a,b)=>a-b);
  }

  function normalize(raw, options={}){
    const source = isRecord(raw) ? raw : {};
    return {
      schemaVersion: CURRENT_VERSION,
      data: objectOrEmpty(source.data),
      cats: arrayOrEmpty(source.cats),
      kredite: arrayOrEmpty(source.kredite),
      years: normalizeYears(source.years, options.defaultYears),
      buchungen: arrayOrEmpty(source.buchungen),
      budgets: objectOrEmpty(source.budgets),
      recurringRules: arrayOrEmpty(source.recurringRules),
      annualAdjustments: arrayOrEmpty(source.annualAdjustments),
      percentageAdjustments: arrayOrEmpty(source.percentageAdjustments),
    };
  }

  root.StateSchema = Object.freeze({
    CURRENT_VERSION,
    normalize,
    isRecord,
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
