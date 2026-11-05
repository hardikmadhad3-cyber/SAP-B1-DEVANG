'use strict';
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const integer = (value, field) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    const error = new Error('Invalid ' + field + ' selection.');
    error.statusCode = 400;
    throw error;
  }
  return number;
};
// SAP Documents uses TransportationCode; ShippingMethod belongs to document lines.
function buildDocumentLogisticsPayload(header = {}) {
  const payload = {};
  if (own(header, 'shippingType')) payload.TransportationCode = header.shippingType === '' || header.shippingType == null ? -1 : integer(header.shippingType, 'shipping type');
  const language = header.languageCode ?? header.language;
  if (language !== '' && language != null) payload.LanguageCode = integer(language, 'language');
  if (own(header, 'bpChannelCode')) payload.BPChannelCode = String(header.bpChannelCode ?? '').trim();
  if (own(header, 'bpChannelContact')) payload.BPChannelContact = header.bpChannelContact === '' || header.bpChannelContact == null ? null : integer(header.bpChannelContact, 'channel contact');
  return payload;
}
module.exports = { buildDocumentLogisticsPayload };
