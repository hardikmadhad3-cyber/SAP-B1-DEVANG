const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../services/companyConfigService');
const db = require('../services/dbService');
const native = require('../services/nativeCrystalExcelService');
const active = { companyId: 2, sql: { dialect: 'sqlserver', database: 'COMPANY_A' }, reportService: { companyDb: 'COMPANY_A' } };

test('native export refuses mismatched company connections before reading any template', async () => {
  const configMock = mock.method(config, 'getActiveCompanyConfig', async () => ({ ...active, reportService: { companyDb: 'COMPANY_B' } }));
  const queryMock = mock.method(db, 'query', async () => { throw new Error('must not query'); });
  try {
    await assert.rejects(native.exportReportExcel({ docCode: 'RCRI0093' }), { statusCode: 422 });
    assert.equal(queryMock.mock.callCount(), 0);
  } finally { configMock.mock.restore(); queryMock.mock.restore(); }
});

test('native export checks optional template metadata before referencing the column', async () => {
  const configMock = mock.method(config, 'getActiveCompanyConfig', async () => active);
  const queryMock = mock.method(db, 'query', async (sql) => {
    assert.match(sql, /INFORMATION_SCHEMA.COLUMNS/);
    return { recordset: [] };
  });
  try {
    await assert.rejects(native.exportReportExcel({ docCode: 'RCRI0093' }), { statusCode: 422 });
    assert.equal(queryMock.mock.callCount(), 1);
  } finally { configMock.mock.restore(); queryMock.mock.restore(); }
});

test('a missing or inactive template is never replaced with another company or report', async () => {
  const configMock = mock.method(config, 'getActiveCompanyConfig', async () => active);
  const queryMock = mock.method(db, 'query', async (sql, params) => {
    if (/INFORMATION_SCHEMA/.test(sql)) return { recordset: [{ COLUMN_NAME: 'Template' }] };
    assert.equal(params.code, 'RCRI0093');
    assert.match(sql, /Status = 'A'/);
    return { recordset: [] };
  });
  try {
    await assert.rejects(native.exportReportExcel({ docCode: 'RCRI0093' }), { statusCode: 422 });
    assert.equal(queryMock.mock.callCount(), 2);
  } finally { configMock.mock.restore(); queryMock.mock.restore(); }
});

test('native export requires an assigned company and rejects non-report codes', async () => {
  const configMock = mock.method(config, 'getActiveCompanyConfig', async () => ({ ...active, companyId: null }));
  try {
    await assert.rejects(native.exportReportExcel({ docCode: 'RCRI0093' }), { statusCode: 422 });
    await assert.rejects(native.exportReportExcel({ docCode: '../RDR20010' }), { statusCode: 400 });
    await assert.rejects(native.exportReportExcel({ docCode: 'RCRI0093', format: 'pdf' }), { statusCode: 400 });
  } finally { configMock.mock.restore(); }
});
