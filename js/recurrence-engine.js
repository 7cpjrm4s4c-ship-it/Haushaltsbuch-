/* Reine Berechnungslogik für wiederkehrende Zahlungen. Keine DOM- oder Speicherzugriffe. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RecurrenceEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PERIODS = Object.freeze({
    monthly: 1,
    quarterly: 3,
    fourMonthly: 4,
    semiannual: 6,
    annual: 12,
  });

  function toMonthIndex(year, month) {
    return Number(year) * 12 + Number(month);
  }

  function normalizeRule(rule) {
    const intervalMonths = Number(rule.intervalMonths || PERIODS[rule.period]);
    if (!Number.isInteger(intervalMonths) || intervalMonths < 1) {
      throw new TypeError('Ungültiges Zahlungsintervall');
    }
    return {
      ...rule,
      amount: Number(rule.amount || 0),
      startYear: Number(rule.startYear),
      startMonth: Number(rule.startMonth),
      intervalMonths,
      endYear: rule.endYear === null || rule.endYear === undefined ? null : Number(rule.endYear),
      endMonth: rule.endMonth === null || rule.endMonth === undefined ? null : Number(rule.endMonth),
    };
  }

  function isDue(ruleInput, year, month) {
    const rule = normalizeRule(ruleInput);
    const current = toMonthIndex(year, month);
    const start = toMonthIndex(rule.startYear, rule.startMonth);
    if (current < start) return false;
    if (rule.endYear !== null) {
      const end = toMonthIndex(rule.endYear, rule.endMonth || 0);
      if (current > end) return false;
    }
    return (current - start) % rule.intervalMonths === 0;
  }

  function recurringTotal(rules, categoryId, year, month) {
    const matching = (rules || []).filter(rule => rule.catId === categoryId && isDue(rule, year, month));
    if (!matching.length) return null;
    return matching.reduce((sum, rule) => sum + Number(rule.amount || 0), 0);
  }

  function latestAdjustment(adjustments, categoryId, year, month) {
    const current = toMonthIndex(year, month);
    return (adjustments || [])
      .filter(item => item.catId === categoryId && toMonthIndex(item.year, item.month) <= current)
      .sort((a, b) => toMonthIndex(b.year, b.month) - toMonthIndex(a.year, a.month))[0] || null;
  }

  function resolveValue(options) {
    const {
      manualValue,
      rules,
      adjustments,
      category,
      year,
      month,
    } = options;

    if (manualValue !== undefined) return Number(manualValue);

    const recurring = recurringTotal(rules, category.id, year, month);
    if (recurring !== null) return recurring;

    const adjustment = latestAdjustment(adjustments, category.id, year, month);
    if (adjustment) return Number(adjustment.amount || 0);

    return Number(category.d || 0);
  }

  return Object.freeze({
    PERIODS,
    toMonthIndex,
    normalizeRule,
    isDue,
    recurringTotal,
    latestAdjustment,
    resolveValue,
  });
});