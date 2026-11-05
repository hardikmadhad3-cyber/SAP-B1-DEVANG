'use strict';
const first = (...values) => values.find(value => value !== undefined && value !== null);
function buildPurchaseDocumentAddressPayload(header = {}) {
  const payload = {};
  for (const [field, value] of Object.entries({
    ShipToCode: first(header.shipToCode, header.billToCode), PayToCode: header.payToCode,
    Address: first(header.billToAddress, header.billTo, header.shipToAddress, header.shipTo),
    Address2: first(header.payToAddress, header.payTo),
  })) if (value !== undefined && value !== null) payload[field] = String(value);
  return payload;
}
module.exports = { buildPurchaseDocumentAddressPayload };
