'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { buildDocumentLogisticsPayload } = require('../services/documentLogisticsPayloadUtils');
const { buildMarketingDocumentAddressPayload } = require('../services/documentAddressPayloadUtils');
const json = value => JSON.parse(JSON.stringify(value));
test('Delivery create and update send selected logistics and edited addresses through actual save handlers', async () => {
  const source = fs.readFileSync(require.resolve('../services/deliveryService'), 'utf8');
  for (const method of ['submitDelivery', 'updateDelivery']) {
    const calls = [];
    const start = source.indexOf('const ' + method + ' = async');
    const next = method === 'submitDelivery' ? 'const updateDelivery = async' : 'const getFreightCharges =';
    const code = source.slice(start, source.indexOf(next, start));
    const save = vm.runInNewContext(code + '\n' + method, {
      buildDocumentLogisticsPayload, buildMarketingDocumentAddressPayload,
      updateDocumentConfirmationOnly: async () => null,
      getDocumentBpSelectionPolicy: async () => null, assertDocumentBpSelection() {},
      resolveHeaderCustomerCode: header => header.customerCode,
      validateDeliveryDocument: async () => ({ isValid: true }), normalizeHeaderBranch: value => value,
      buildDocumentAdditionalExpenses: () => [], buildDocumentLinesPayload: async () => [],
      getUdfDefinitionsByKey: async () => new Map(),
      deliveryDb: { getDeliveryHeaderFieldMetadata: async () => ({}), getSalesEmployees: async () => [], getSavedDeliveryQuantities: async () => [] },
      resolveSalesEmployeeCode: () => undefined, formatDateForSAP: value => value,
      buildDocumentSeriesPayload: () => ({}), loadDocumentCurrencyReferenceData: async () => ({}), applySapDocumentCurrency() {},
      toOptionalNumber: () => undefined, buildDocumentConfirmationPayload: () => ({}), buildDocumentRoundingPayload: () => ({}),
      assignElectronicDocumentPayload() {}, buildEWayBillDetailsPayload: async () => null, applyUdfs() {},
      sapService: { request: async config => { calls.push(json(config)); return { data: { DocEntry: 7, DocNum: 8 } }; } },
      console: { log() {}, error() {}, warn() {} },
    });
    const payload = { header: { customerCode: 'C001', shippingType: '1', languageCode: '8', bpChannelCode: 'C002', bpChannelContact: '25', shipToAddress: 'Custom ship', billToAddress: 'Custom bill', shipToAddressComponents: null }, lines: [] };
    if (method === 'submitDelivery') await save(payload); else await save(7, payload);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, method === 'submitDelivery' ? 'POST' : 'PATCH');
    for (const [field, value] of Object.entries({ TransportationCode: 1, LanguageCode: 8, BPChannelCode: 'C002', BPChannelContact: 25, Address2: 'Custom ship', Address: 'Custom bill' })) assert.equal(calls[0].data[field], value);
    assert.equal(calls[0].data.ShippingMethod, undefined);
    if (method === 'updateDelivery') assert.equal(calls[0].data.DocumentLines, undefined);
  }
});
test('Delivery and A/R Invoice reference caches distinguish ordinary users in the same company', async () => {
  for (const file of ['deliveryDbService','arInvoiceDbService']) {
    const source = fs.readFileSync(require.resolve('../services/' + file), 'utf8');
    const start = source.indexOf('const getReferenceDataCacheKey = async');
    const code = source.slice(start, source.indexOf('\n};',start) + 4);
    let auth = { userId: 1, username: 'admin' };
    let company = 'company-a';
    const key = vm.runInNewContext(code + '\ngetReferenceDataCacheKey', { db: {}, resolveDatabaseScope: async () => ({ cacheKey: company }), getRequestContext: () => ({ req: { auth } }) });
    const admin = await key(); auth = { userId: 2, username: 'ordinary' }; const ordinary = await key();
    assert.notEqual(admin, ordinary); assert.equal(ordinary, await key());
    company = 'company-b'; assert.notEqual(ordinary, await key());
  }
});
