const isCalendarDate = (year, month, day) => {
  if (year < 1900 || year > 2199 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
};

const removeLayoutDateSuffix = name => name.replace(/[_ -](\d{8})$/, (suffix, digits) => {
  const dmy = isCalendarDate(Number(digits.slice(4)), Number(digits.slice(2, 4)), Number(digits.slice(0, 2)));
  const ymd = isCalendarDate(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)), Number(digits.slice(6)));
  return dmy || ymd ? '' : suffix;
});

const safeFilePart = value => String(value ?? '').trim()
  .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_')
  .replace(/\s+/g, '_').replace(/^[. ]+|[. ]+$/g, '');

const buildDocumentPrintFileName = ({ layoutName, layoutCode, documentType, docNum, docEntry } = {}) => {
  const rawName = String(layoutName || layoutCode || documentType || 'document').trim().replace(/\.(rpt|pdf)$/i, '');
  const name = safeFilePart(removeLayoutDateSuffix(rawName)) || 'document';
  const number = safeFilePart(docNum ?? '') || safeFilePart(docEntry ?? '') || 'document';
  return name.slice(0, 160) + '_' + number.slice(0, 60) + '.pdf';
};

export { buildDocumentPrintFileName };
