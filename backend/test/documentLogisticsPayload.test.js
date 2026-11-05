'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDocumentLogisticsPayload: build } = require('../services/documentLogisticsPayloadUtils');
const { buildMarketingDocumentAddressPayload: address } = require('../services/documentAddressPayloadUtils');
test('maps company codes exactly to header Service Layer properties', () => {
  assert.deepEqual(build({ shippingType: '1', languageCode: '8', bpChannelCode: 'C001', bpChannelName: 'Customer Name', bpChannelContact: '25' }), {
    TransportationCode: 1, LanguageCode: 8, BPChannelCode: 'C001', BPChannelContact: 25,
  });
  assert.deepEqual(build({ language: '3', shippingType: 0, bpChannelContact: 0 }), { TransportationCode: 0, LanguageCode: 3, BPChannelContact: 0 });
});
test('leaves absent selections untouched and supports explicitly clearing transport/channel/contact', () => {
  assert.deepEqual(build({ bpChannelName: 'A display name' }), {});
  assert.deepEqual(build({ shippingType: '', language: '', bpChannelCode: '', bpChannelContact: '' }), { TransportationCode: -1, BPChannelCode: '', BPChannelContact: null });
});
test('rejects malformed codes instead of converting labels or fractions to identifiers', () => {
  for (const header of [{ shippingType: 'By Road' }, { language: 'English' }, { bpChannelContact: '1.2' }]) {
    assert.throws(() => build(header), error => error.statusCode === 400);
  }
});
test('Delivery saves custom address snapshots without stale address components', () => {
  assert.deepEqual(address({ shipToCode: 'FACTORY', shipToAddress: 'Edited ship address', billToAddress: '', shipToAddressComponents: null, billToAddressComponents: null }, { shipAddressField: 'Address2', billAddressField: 'Address' }), {
    ShipToCode: 'FACTORY', Address2: 'Edited ship address', Address: '',
  });
});
test('Delivery structured address edits retain matching SAP AddressExtension sides', () => {
  const payload = address({ shipToAddressComponents: { city: 'Surat', countryRegion: 'IN' }, billToAddressComponents: { city: 'Erode' } }, { shipAddressField: 'Address2', billAddressField: 'Address' });
  assert.deepEqual(payload.AddressExtension, { ShipToCity: 'Surat', ShipToCountry: 'IN', BillToCity: 'Erode' });
});
