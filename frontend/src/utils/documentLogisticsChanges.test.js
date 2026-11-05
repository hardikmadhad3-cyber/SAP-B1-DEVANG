import { getDocumentAddressEditChanges } from './documentLogisticsChanges';
test('manual shipping/billing edits replace both text aliases and invalidate stale components', () => {
  expect(getDocumentAddressEditChanges('shipToAddress', 'New shipping address')).toEqual({ shipToAddress: 'New shipping address', shipTo: 'New shipping address', shipToAddressComponents: null });
  expect(getDocumentAddressEditChanges('billToAddress', '')).toEqual({ billToAddress: '', payTo: '', billToAddressComponents: null });
});
test('choosing another address invalidates only that side of the saved address extension', () => {
  expect(getDocumentAddressEditChanges('shipToCode', 'NEW')).toEqual({ shipToAddressComponents: null });
  expect(getDocumentAddressEditChanges('billToCode', 'NEW')).toEqual({ billToAddressComponents: null });
  expect(getDocumentAddressEditChanges('shippingType', '1')).toEqual({});
});

test('purchase pay-to edits cannot overwrite the warehouse billing address', () => {
  expect(getDocumentAddressEditChanges('payTo', 'Vendor billing address', { mode: 'purchase' })).toEqual({ payTo: 'Vendor billing address', payToAddress: 'Vendor billing address', billToAddressComponents: null });
  expect(getDocumentAddressEditChanges('billTo', 'Warehouse address', { mode: 'purchase' })).toEqual({ billTo: 'Warehouse address', billToAddress: 'Warehouse address' });
});
