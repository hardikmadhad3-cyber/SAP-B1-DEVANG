import { buildDocumentHeaderUdfPayload, buildDocumentRowUdfPayload } from './rowUdfPayload';

test('saved, copied and auto-filled UDFs survive hidden and inactive controls', () => {
  const fields = [{ key: 'U_Seller_Address', visible: false, active: false, readOnly: true }];
  const values = { U_Seller_Address: 'Factory\nLong street address\nAhmedabad, Gujarat' };
  const settings = { rowUdfs: { U_Seller_Address: { visible: false, active: false } }, matrixColumns: {
    U_Seller_Address: { valueKey: 'U_Seller_Address', visible: false, active: false },
  } };
  expect(buildDocumentRowUdfPayload(fields, values, settings, { preserveUnmappedUdfs: false })).toEqual(values);
  expect(buildDocumentHeaderUdfPayload(fields, values)).toEqual(values);
});

test('header UDFs use only current-company definitions and preserve explicit clears and zero', () => {
  const fields = ['U_Seller_Name', 'U_Seller_Address', 'U_Price', 'U_Flag'].map(key => ({ key }));
  expect(buildDocumentHeaderUdfPayload(fields, {
    U_Seller_Name: 'Seller', U_Seller_Address: '', U_Price: 0, U_Flag: false,
    U_OtherCompany: 'stale', localNote: 'local',
  })).toEqual({ U_Seller_Name: 'Seller', U_Seller_Address: '', U_Price: 0, U_Flag: false });
  expect(buildDocumentHeaderUdfPayload(fields, {})).toEqual({});
});

test('row UDFs keep zero and false, omit unentered defaults and non-SAP state', () => {
  expect(buildDocumentRowUdfPayload([], {
    U_Zero: 0, U_Flag: false, U_Empty: '', U_Null: null, U_Unset: undefined, localNote: 'local',
  })).toEqual({ U_Zero: 0, U_Flag: false });
});

test('strict live-schema mode excludes previous-company fields', () => {
  expect(buildDocumentRowUdfPayload([{ key: 'U_CurrentCompany' }], {
    U_CurrentCompany: 'live', U_PreviousCompany: 'stale',
  }, {}, { preserveUnmappedUdfs: false })).toEqual({ U_CurrentCompany: 'live' });
});

test('repeated display columns never duplicate or discard their physical UDF', () => {
  const fields = [{ key: 'U_S_BrokPerQty' }];
  const values = { U_S_BrokPerQty: '12.50' };
  const settings = { matrixColumns: {
    U_S_BrokPerQty: { valueKey: 'U_S_BrokPerQty', visible: false },
    U_S_BrokPerQty__layout_24: { valueKey: 'U_S_BrokPerQty', visible: false },
  } };
  expect(buildDocumentRowUdfPayload(fields, values, settings, { preserveUnmappedUdfs: false })).toEqual(values);
});
