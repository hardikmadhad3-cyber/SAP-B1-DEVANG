import { getDocumentPartnerLookupScope, resolveDocumentPartnerReferenceRows } from './documentPartnerLookups';

const companyA = { companyId: 1, dbName: 'A' };
const companyB = { companyId: 2, dbName: 'B' };
const fields = ['contacts', 'pay_to_addresses', 'ship_to_addresses', 'bill_to_addresses'];

test('late general reference data cannot erase BP-specific address alternatives or contacts', () => {
  const previous = { documentPartnerLookupScope: getDocumentPartnerLookupScope(companyA) };
  fields.forEach(field => { previous[field] = [{ CardCode: 'C001', Address: 'Factory' }, { CardCode: 'C001', Address: 'Warehouse' }]; });
  fields.forEach(field => {
    expect(resolveDocumentPartnerReferenceRows(previous, [], companyA, field)).toBe(previous[field]);
    expect(resolveDocumentPartnerReferenceRows(previous, [{ CardCode: 'OTHER' }], companyA, field)).toBe(previous[field]);
  });
});

test('an authoritative empty BP result never restores unrelated preloaded addresses', () => {
  const previous = { documentPartnerLookupScope: getDocumentPartnerLookupScope(companyA), ship_to_addresses: [] };
  expect(resolveDocumentPartnerReferenceRows(previous, [{ Address: 'Old BP' }], companyA, 'ship_to_addresses')).toEqual([]);
});

test('changing companies uses the new company rows even when CardCode is identical', () => {
  const previous = { documentPartnerLookupScope: getDocumentPartnerLookupScope(companyA), ship_to_addresses: [{ CardCode: 'C001', Address: 'A only' }] };
  const incoming = [{ CardCode: 'C001', Address: 'B only' }];
  expect(resolveDocumentPartnerReferenceRows(previous, incoming, companyB, 'ship_to_addresses')).toBe(incoming);
});

test('reference data remains available before a BP-specific request has completed', () => {
  const rows = [{ Address: 'Initial' }];
  expect(resolveDocumentPartnerReferenceRows({}, rows, companyA, 'bill_to_addresses')).toBe(rows);
  expect(resolveDocumentPartnerReferenceRows({}, null, companyA, 'bill_to_addresses')).toEqual([]);
});
