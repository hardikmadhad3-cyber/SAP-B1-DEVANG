const hasEnteredUdfValue = (value) => {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== '';
};
const isSapUdfKey = (key) => String(key || '').startsWith('U_');

// Display preferences must not discard saved, copied or automatically filled data.
export const buildDocumentHeaderUdfPayload = (definitions = [], values = {}) => (
  definitions.reduce((payload, field) => {
    if (isSapUdfKey(field?.key) && Object.prototype.hasOwnProperty.call(values, field.key)
      && values[field.key] !== undefined) {
      payload[field.key] = values[field.key];
    }
    return payload;
  }, {})
);

export const buildDocumentRowUdfPayload = (
  definitions = [], values = {}, _formSettings = {},
  { preserveUnmappedUdfs = true } = {},
) => {
  const definedKeys = new Set(definitions.map((field) => field?.key).filter(isSapUdfKey));
  return Object.entries(values || {}).reduce((payload, [key, value]) => {
    if (isSapUdfKey(key) && (definedKeys.has(key) || preserveUnmappedUdfs) && hasEnteredUdfValue(value)) {
      payload[key] = value;
    }
    return payload;
  }, {});
};
// Compatibility for callers outside the marketing-document pages.
export const buildVisibleEnteredRowUdfPayload = buildDocumentRowUdfPayload;
