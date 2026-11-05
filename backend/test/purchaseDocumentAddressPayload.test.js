'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const { buildPurchaseDocumentAddressPayload: build } = require('../services/purchaseDocumentAddressPayloadUtils');
test('purchase warehouse address and vendor billing address use separate SAP fields', () => {
 assert.deepEqual(build({billToAddress:'Warehouse',payToAddress:'Vendor',shipToCode:'W1',payToCode:'B1'}),{Address:'Warehouse',Address2:'Vendor',ShipToCode:'W1',PayToCode:'B1'});
});
test('purchase address clearing preserves intentional empty values over stale aliases', () => {
 assert.deepEqual(build({billToAddress:'',billTo:'Old',payToAddress:'',payTo:'Old'}),{Address:'',Address2:''}); assert.deepEqual(build({}),{});
});
