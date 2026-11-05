'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../services/documentPrintLayoutService'), 'utf8');
const start = source.indexOf('const selectSapAssignedLayout =');
const end = source.indexOf('\nconst ', start + 1);
assert.ok(start > 0 && end > start);
const helperStart = source.indexOf('const isActiveLayout =');
const helperEnd = source.indexOf('const SAP_DEFAULT_LAYOUT_FLAG_COLUMNS =', helperStart);
const filterHelpers = source.slice(helperStart, helperEnd);
const select = vm.runInNewContext(filterHelpers + source.slice(start, end) + '\nselectSapAssignedLayout;', {
  createHttpError: (statusCode, message) => Object.assign(new Error(message), { statusCode }),
  isTruthySapFlag: value => value === 'Y',
});
const config = { label: 'Sales Order', typeCode: 'RDR2' };
const layout = (code, extra = {}) => ({ DocCode: code, TypeCode: 'RDR2', Category: 'C', Status: 'A', ...extra });
test('multiple layouts without a matching SAP default require an explicit choice', () => {
  const result = select({ config, layouts: [layout('OLD'), layout('CURRENT')], defaultFlagColumns: [] });
  assert.equal(result.layout, null);
  assert.equal(result.requiresLayoutSelection, true);
  assert.equal(result.layoutCandidates.length, 2);
});
test('matching SAP user and business-partner default remains authoritative', () => {
  const result = select({ config, layouts: [layout('OLD'), layout('CURRENT')], defaultFlagColumns: [], assignedDefault: { docCode: 'CURRENT' } });
  assert.equal(result.layout.DocCode, 'CURRENT');
  assert.equal(result.requiresLayoutSelection, false);
});
test('explicit selection and a single active company layout remain supported', () => {
  for (const input of [
    { layouts: [layout('CURRENT')] },
    { layouts: [layout('OLD'), layout('CURRENT')], docCode: 'CURRENT' },
  ]) {
    const result = select({ config, defaultFlagColumns: [], ...input });
    assert.equal(result.layout.DocCode, 'CURRENT');
    assert.equal(result.requiresLayoutSelection, false);
  }
});
test('ambiguous legacy defaults require a choice instead of printing the first', () => {
  const result = select({ config, layouts: [layout('OLD', { Dflt: 'Y' }), layout('CURRENT', { Dflt: 'Y' })], defaultFlagColumns: ['Dflt'] });
  assert.equal(result.layout, null);
  assert.equal(result.requiresLayoutSelection, true);
});


test('admin user default wins over the SAP default, while an explicit print choice wins over both', () => {
  const input = { config, layouts: [layout('SAP'), layout('USER'), layout('CHOICE')], defaultFlagColumns: [],
    assignedDefault: { docCode: 'SAP' }, userDefault: { docCode: 'USER' } };
  const automatic = select(input);
  assert.equal(automatic.layout.DocCode, 'USER');
  assert.equal(automatic.selectionSource, 'Admin General Settings user default');
  assert.equal(select({ ...input, docCode: 'CHOICE' }).layout.DocCode, 'CHOICE');
});
test('stale, inactive or wrong-document user defaults never escape the live company layout filter', () => {
  for (const rejected of [layout('OLD', { Status: 'N' }), layout('OLD', { TypeCode: 'POR2' }), layout('OLD', { Category: 'P' })]) {
    const result = select({ config, layouts: [rejected, layout('SAP')], defaultFlagColumns: [],
      assignedDefault: { docCode: 'SAP' }, userDefault: { docCode: 'OLD' } });
    assert.equal(result.layout.DocCode, 'SAP');
  }
});

const configStart = source.indexOf('const DOCUMENT_PRINT_CONFIG =');
const configEnd = source.indexOf('const DOCUMENT_TYPE_BY_ALIAS =', configStart);
const documentConfigs = vm.runInNewContext(source.slice(configStart, configEnd) + '\nDOCUMENT_PRINT_CONFIG;');
for (const [documentType, documentConfig] of Object.entries(documentConfigs)) {
  test(documentType + ': chooser excludes nonexportable system/PLD layouts in every selection branch', () => {
    const current = { DocCode: 'CURRENT', DocName: 'Company Layout', TypeCode: documentConfig.typeCode, Category: 'C', Status: 'A' };
    const second = { ...current, DocCode: 'SECOND' };
    const system = { ...current, DocCode: 'SYSTEM', DocName: 'Sales Order (System)', Category: 'P' };
    const inactive = { ...current, DocCode: 'INACTIVE', Status: 'N' };
    const input = { config: { key: documentType, ...documentConfig }, layouts: [system, inactive, current, second], defaultFlagColumns: [] };
    for (const overrides of [{}, { docCode: 'CURRENT' }, { userDefault: { docCode: 'CURRENT' } }, { assignedDefault: { docCode: 'CURRENT' } },
      { defaultFlagColumns: ['Dflt'], layouts: [system, { ...current, Dflt: 'Y' }, second] }]) {
      const result = select({ ...input, ...overrides });
      assert.deepEqual(Array.from(result.layoutCandidates, layout => layout.DocCode), ['CURRENT', 'SECOND']);
    }
    const empty = select({ ...input, layouts: [system] });
    assert.equal(empty.layoutCandidates.length, 0);
    assert.equal(empty.layout, null);
    assert.throws(() => select({ ...input, docCode: 'SYSTEM' }), { statusCode: 404 });
  });
}
test('layout-list API returns the same exportable-only choices used by the print chooser', async () => {
  const begin = source.indexOf('const getLayouts =');
  const finish = source.indexOf('const getLayoutParameters =', begin);
  const rows = [layout('SYSTEM', { Category: 'P' }), layout('CRYSTAL_SYSTEM', { DocName: 'Working Layout (System)' }), layout('INACTIVE', { Status: 'N' })];
  const getLayouts = vm.runInNewContext(filterHelpers + source.slice(begin, finish) + '\ngetLayouts;', {
    getDocumentPrintConfig: () => ({ key: 'salesOrder', ...config }), resolvePrintSchema: async () => 'COMPANY_A',
    getSapLayoutRows: async () => ({ layouts: rows, typeCode: 'RDR2' }),
  });
  const result = await getLayouts('salesOrder');
  assert.deepEqual(Array.from(result.layouts, layout => layout.DocCode), ['CRYSTAL_SYSTEM']);
});
