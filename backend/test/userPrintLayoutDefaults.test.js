'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../services/authDbService');
const printService = require('../services/documentPrintLayoutService');
const { getRequestContext, runWithRequestContext, setCompanyContextOverride } = require('../services/requestContextService');
const { PRINT_LAYOUT_PROFILES, getPrintLayoutProfile, getUserPrintLayoutDefault } = require('../services/userPrintLayoutDefaultsService');
const general = require('../services/generalSettingsService');
const original = { queryOne: auth.queryOne, query: auth.query, ensureSchema: auth.ensureSchema,
  getAssignedCompanyForUser: auth.getAssignedCompanyForUser, getLayouts: printService.getLayouts };
const rows = new Map();
const assigned = (userId, companyId) => [1, 2].includes(Number(userId)) && [10, 20].includes(Number(companyId));
test.before(() => {
  auth.ensureSchema = async () => {};
  auth.queryOne = async (statement, params) => {
    if (statement.includes('UserCompanies')) return assigned(params.userId, params.companyId) ? { Id: 1 } : null;
    if (statement.includes('UserGeneralSettings')) return rows.get(params.userId + ':' + params.companyId) || null;
    throw new Error('Unexpected read');
  };
  auth.query = async (statement, params) => {
    assert.match(statement, /INSERT INTO UserGeneralSettings/);
    rows.set(params.userId + ':' + params.companyId, { SettingsJson: params.settingsJson });
  };
  auth.getAssignedCompanyForUser = async (userId, companyId) => assigned(userId, companyId)
    ? { CompanyId: Number(companyId), DbName: 'COMPANY_' + companyId } : null;
  printService.getLayouts = async documentType => {
    const company = getRequestContext().companyOverride.CompanyId;
    return { layouts: [
      { DocCode: (company === 10 ? 'A-' : 'B-') + documentType, Category: 'C', Status: 'A' },
      { DocCode: 'PLD-' + documentType, Category: 'P', Status: 'A' },
    ] };
  };
});
test.after(() => {
  Object.assign(auth, { queryOne: original.queryOne, query: original.query, ensureSchema: original.ensureSchema,
    getAssignedCompanyForUser: original.getAssignedCompanyForUser });
  printService.getLayouts = original.getLayouts;
});
test.beforeEach(() => rows.clear());
test('settings round-trip without a migration and remain isolated by user and company', async () => {
  await general.saveAdminSettings(1, 10, { salesWarehouse: 'W1', salesSeries: '7', salesPrintLayout: 'A-salesOrder' });
  await general.saveAdminSettings(2, 10, { salesPrintLayout: '' });
  await general.saveAdminSettings(1, 20, { salesPrintLayout: 'B-salesOrder' });
  assert.equal((await general.getSettings(1, 10)).salesWarehouse, 'W1');
  assert.equal((await general.getSettings(1, 10)).salesSeries, '7');
  assert.equal((await getUserPrintLayoutDefault({ userId: 1, companyId: 10 }, 'salesOrder')).docCode, 'A-salesOrder');
  assert.equal((await getUserPrintLayoutDefault({ userId: 2, companyId: 10 }, 'salesOrder')).docCode, '');
  assert.equal((await getUserPrintLayoutDefault({ userId: 1, companyId: 20 }, 'salesOrder')).docCode, 'B-salesOrder');
});
test('validation reads the target company even when the admin request has another cached company', async () => {
  await runWithRequestContext({ auth: { userId: 2, companyId: 20 } }, async () => {
    setCompanyContextOverride({ CompanyId: 20, DbName: 'COMPANY_20' });
    await general.saveAdminSettings(1, 10, { salesPrintLayout: 'A-salesOrder' });
    assert.equal(getRequestContext().companyOverride.CompanyId, 20);
  });
});
test('another company layout, wrong document layout and PLD layout cannot be assigned', async () => {
  for (const code of ['B-salesOrder', 'A-delivery', 'PLD-salesOrder']) {
    await assert.rejects(() => general.saveAdminSettings(1, 10, { salesPrintLayout: code }), { statusCode: 400 });
  }
  assert.equal(rows.size, 0);
});
test('unassigned users cannot save and clearing a default restores SAP selection', async () => {
  await assert.rejects(() => general.saveAdminSettings(99, 10, { salesPrintLayout: 'A-salesOrder' }), { statusCode: 400 });
  await general.saveAdminSettings(1, 10, { salesPrintLayout: 'A-salesOrder' });
  await general.saveAdminSettings(1, 10, { salesPrintLayout: '' });
  assert.equal((await getUserPrintLayoutDefault({ userId: 1, companyId: 10 }, 'salesOrder')).docCode, '');
});
test('variants and item/service documents have independent defaults and reject profile spoofing', async () => {
  await general.saveAdminSettings(1, 10, { salesPrintLayout: 'A-salesOrder', dcSalesPrintLayout: 'A-salesOrder', serviceArInvoicePrintLayout: 'A-serviceArInvoice' });
  assert.equal((await getUserPrintLayoutDefault({ userId: 1, companyId: 10 }, 'salesOrder', 'dcSalesOrder')).docCode, 'A-salesOrder');
  assert.equal((await getUserPrintLayoutDefault({ userId: 1, companyId: 10 }, 'serviceArInvoice')).docCode, 'A-serviceArInvoice');
  assert.throws(() => getPrintLayoutProfile('delivery', 'dcSalesOrder'), { statusCode: 400 });
  assert.equal(new Set(PRINT_LAYOUT_PROFILES.map(p => p.settingKey)).size, PRINT_LAYOUT_PROFILES.length);
});
