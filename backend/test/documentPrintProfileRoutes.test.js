'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const printService = require('../services/documentPrintLayoutService');
const controller = require('../controllers/documentPrintController');
const legacyController = require('../controllers/printController');
test('the public SAP metadata route forwards the selected page profile', async () => {
  const source = fs.readFileSync(require.resolve('../routes/sapRoutes'), 'utf8');
  const start = source.indexOf("router.get('/sap/reports/:documentType/:docEntry/metadata'");
  const end = source.indexOf("router.post('/items'", start);
  let handler, received;
  vm.runInNewContext(source.slice(start, end), {
    router: { get: (_path, callback) => { handler = callback; } },
    documentPrintLayoutService: { getDocumentReportMetadata: async input => { received = input; return {}; } },
    getSapErrorDetail: error => error.message, console,
  });
  await handler({ params: { documentType: 'salesOrder', docEntry: '3225' }, query: { layoutProfile: 'dcSalesOrder' }, auth: { userId: 1, companyId: 10 } }, { json() {} });
  assert.equal(received.layoutProfile, 'dcSalesOrder');
  assert.equal(received.auth.companyId, 10);
});
test('document metadata and print adapters preserve the same profile and authenticated user', async () => {
  const originals = { metadata: printService.getDocumentReportMetadata, print: printService.printDocument };
  const inputs = [];
  printService.getDocumentReportMetadata = async input => { inputs.push(input); return {}; };
  printService.printDocument = async input => { inputs.push(input); return {}; };
  try {
    const auth = { userId: 1, companyId: 10 };
    const response = { json() {}, status() { return this; } };
    await controller.getReportMetadata({ params: { documentType: 'salesOrder', docEntry: '3225' }, query: { layoutProfile: 'dcSalesOrder' }, auth }, response);
    await controller.printDocument({ params: { documentType: 'salesOrder' }, body: { docEntry: '3225', layoutProfile: 'dcSalesOrder' }, auth }, response);
    await legacyController.printSalesOrder({ body: { docEntry: '3225', layoutProfile: 'dcSalesOrder' }, auth }, response);
    assert.equal(inputs.length, 3);
    for (const input of inputs) { assert.equal(input.layoutProfile, 'dcSalesOrder'); assert.equal(input.auth, auth); }
  } finally { printService.getDocumentReportMetadata = originals.metadata; printService.printDocument = originals.print; }
});
