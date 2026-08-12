/**
 * Reine Berechnungslogik für wiederkehrende Zahlungen.
 * @module RecurrenceEngine
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RecurrenceEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PERIODS = Object.freeze({monthly:1,quarterly:3,fourMonthly:4,semiannual:6,annual:12});

  /** @param {number} year Jahr. @param {number} month Monat (0–11). @returns {number} Linearer Monatsindex. */
  function toMonthIndex(year, month) {return Number(year) * 12 + Number(month);}

  /**
   * Validiert und normalisiert eine Intervallregel.
   * @param {Object} rule Persistierte oder neu erstellte Wiederholungsregel.
   * @returns {Object} Normalisierte Regel mit numerischen Feldern.
   * @throws {TypeError} Bei ungültigem Zahlungsintervall.
   */
  function normalizeRule(rule) {
    const intervalMonths = Number(rule.intervalMonths || PERIODS[rule.period]);
    if (!Number.isInteger(intervalMonths) || intervalMonths < 1) throw new TypeError('Ungültiges Zahlungsintervall');
    return {...rule,amount:Number(rule.amount||0),startYear:Number(rule.startYear),startMonth:Number(rule.startMonth),intervalMonths,endYear:rule.endYear==null?null:Number(rule.endYear),endMonth:rule.endMonth==null?null:Number(rule.endMonth)};
  }

  /**
   * Prüft, ob eine Intervallregel im angegebenen Monat fällig ist.
   * @param {Object} ruleInput Wiederholungsregel.
   * @param {number} year Jahr.
   * @param {number} month Monat (0–11).
   * @returns {boolean} `true`, wenn die Zahlung fällig ist.
   */
  function isDue(ruleInput, year, month) {
    const rule=normalizeRule(ruleInput),current=toMonthIndex(year,month),start=toMonthIndex(rule.startYear,rule.startMonth);
    if(current<start)return false;
    if(rule.endYear!==null&&current>toMonthIndex(rule.endYear,rule.endMonth||0))return false;
    return (current-start)%rule.intervalMonths===0;
  }

  function recurringTotal(rules, categoryId, year, month) {
    const matching=(rules||[]).filter(rule=>rule.catId===categoryId&&isDue(rule,year,month));
    return matching.length?matching.reduce((sum,rule)=>sum+Number(rule.amount||0),0):null;
  }

  function latestAdjustment(adjustments, categoryId, year, month) {
    const current=toMonthIndex(year,month);
    return (adjustments||[]).filter(item=>item.catId===categoryId&&toMonthIndex(item.year,item.month)<=current).sort((a,b)=>toMonthIndex(b.year,b.month)-toMonthIndex(a.year,a.month))[0]||null;
  }

  /**
   * Ermittelt den effektiven Kategorienwert nach Priorität manuell → Intervall → Anpassung → Standardwert.
   * @param {Object} options Berechnungsparameter.
   * @returns {number} Effektiver Betrag für den Zielmonat.
   */
  function resolveValue(options) {
    const {manualValue,rules,adjustments,category,year,month}=options;
    if(manualValue!==undefined)return Number(manualValue);
    const recurring=recurringTotal(rules,category.id,year,month);if(recurring!==null)return recurring;
    const adjustment=latestAdjustment(adjustments,category.id,year,month);if(adjustment)return Number(adjustment.amount||0);
    return Number(category.d||0);
  }

  return Object.freeze({PERIODS,toMonthIndex,normalizeRule,isDue,recurringTotal,latestAdjustment,resolveValue});
});