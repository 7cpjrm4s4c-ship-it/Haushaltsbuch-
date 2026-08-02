import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../js/recurrence-engine.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(source, context);
const engine = context.globalThis.RecurrenceEngine;

assert.ok(engine, 'RecurrenceEngine wurde nicht geladen');

const quarterly = { catId: 'strom', amount: 120, startYear: 2026, startMonth: 2, intervalMonths: 3 };
assert.equal(engine.isDue(quarterly, 2026, 2), true);
assert.equal(engine.isDue(quarterly, 2026, 3), false);
assert.equal(engine.isDue(quarterly, 2026, 5), true);
assert.equal(engine.isDue(quarterly, 2026, 8), true);
assert.equal(engine.isDue(quarterly, 2026, 11), true);

const annual = { catId: 'versicherung', amount: 600, startYear: 2026, startMonth: 10, intervalMonths: 12 };
assert.equal(engine.isDue(annual, 2026, 10), true);
assert.equal(engine.isDue(annual, 2027, 10), true);
assert.equal(engine.isDue(annual, 2027, 9), false);

const category = { id: 'gehalt', d: 3000 };
const adjustments = [
  { catId: 'gehalt', amount: 3200, year: 2026, month: 3 },
  { catId: 'gehalt', amount: 3400, year: 2027, month: 0 },
];
assert.equal(engine.resolveValue({ category, adjustments, rules: [], year: 2026, month: 2 }), 3000);
assert.equal(engine.resolveValue({ category, adjustments, rules: [], year: 2026, month: 3 }), 3200);
assert.equal(engine.resolveValue({ category, adjustments, rules: [], year: 2027, month: 0 }), 3400);
assert.equal(engine.resolveValue({ category, adjustments, rules: [], year: 2027, month: 0, manualValue: 3500 }), 3500);

console.log('Alle Intervalltests erfolgreich.');
