// Document address edits are snapshots. A stale AddressExtension would make SAP
// replace a user's edited text with a formatted master-data address on save.
export const getDocumentAddressEditChanges = (name, value, { mode = 'sales' } = {}) => {
  if (mode === 'purchase') {
    if (['billTo', 'billToAddress'].includes(name)) return { billTo: value, billToAddress: value };
    if (['payTo', 'payToAddress'].includes(name)) return { payTo: value, payToAddress: value, billToAddressComponents: null };
    if (name === 'payToCode') return { billToAddressComponents: null };
    return {};
  }
  if (['shipToAddress', 'shipTo'].includes(name)) return { shipToAddress: value, shipTo: value, shipToAddressComponents: null };
  if (['billToAddress', 'payTo'].includes(name)) return { billToAddress: value, payTo: value, billToAddressComponents: null };
  if (name === 'payToAddress') return { payToAddress: value, payTo: value, billToAddressComponents: null };
  if (name === 'shipToCode') return { shipToAddressComponents: null };
  if (['billToCode', 'payToCode'].includes(name)) return { billToAddressComponents: null };
  return {};
};
