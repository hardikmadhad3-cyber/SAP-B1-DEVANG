const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDocumentAdditionalExpenses: build } = require('../services/freightPayloadUtils');

test('unused freight lookup rows do not become invoice expenses', () => {
 assert.deepEqual(build([
  { ExpnsCode: 1, LineTotal: 0, TaxCode: '' },
  { expnsCode: 2, netAmount: '0', taxCode: '' },
  { ExpnsCode: 3, DefaultAmount: 100 },
  { ExpnsCode: 4, LineTotal: 0, TaxCode: 'GST' },
 ]), []);
});
test('actual freight retains company tax code and unused sibling rows are omitted', () => {
 assert.deepEqual(build([
  { expnsCode: 1, netAmount: '100', taxCode: ' 12-GST ' },
  { expnsCode: 2, netAmount: 0, taxCode: '' },
 ]), [{ ExpenseCode: 1, LineTotal: 100, TaxCode: '12-GST' }]);
});
test('an explicitly cleared amount never falls back to freight master defaults', () => {
 assert.deepEqual(build([{ ExpnsCode: 1, netAmount: 0, LineTotal: 100, DefaultAmount: 100, TaxCode: 'GST' }]), []);
});
test('positive and negative amount-only charges defer tax code determination to SAP', () => {
 for (const amount of [100, -100]) {
  assert.deepEqual(build([{ ExpnsCode: 1, ExpnsName: 'Transport', LineTotal: amount, TaxCode: ' ' }]), [{ ExpenseCode: 1, LineTotal: amount }]);
 }
});

test('cleared UI tax code never falls back to a stale copied TaxCode', () => {
 assert.deepEqual(build([{ expnsCode: 1, netAmount: 250, taxCode: '', TaxCode: 'OLD-GST' }]), [{ ExpenseCode: 1, LineTotal: 250 }]);
});

test('Service Layer expense rows and negative charges preserve explicit tax codes', () => {
 assert.deepEqual(build([{ ExpenseCode: 7, LineTotal: -20, TaxCode: 'EXEMPT' }]), [{ ExpenseCode: 7, LineTotal: -20, TaxCode: 'EXEMPT' }]);
});
test('absent freight is safe', () => {
 for (const rows of [undefined, null, {}]) assert.deepEqual(build(rows), []);
});
