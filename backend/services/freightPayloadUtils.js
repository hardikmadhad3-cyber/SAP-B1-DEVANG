const toNumberOrUndefined = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildDocumentAdditionalExpenses = (freightCharges = []) =>
  (Array.isArray(freightCharges) ? freightCharges : [])
    .map((charge) => {
      const expenseCode = toNumberOrUndefined(charge?.expnsCode ?? charge?.ExpnsCode ?? charge?.ExpenseCode);
      const lineTotal = toNumberOrUndefined(
        charge?.netAmount ??
        charge?.LineTotal ??
        charge?.NetAmount
      );
      const taxCode = String(charge?.taxCode ?? charge?.TaxCode ?? '').trim();

      if (expenseCode === undefined) {
        return undefined;
      }

      if (lineTotal === undefined || lineTotal === 0) {
        return undefined;
      }

      // Leave an unspecified tax code to SAP company defaults and validation.
      return {
        ExpenseCode: expenseCode,
        LineTotal: lineTotal,
        ...(taxCode ? { TaxCode: taxCode } : {}),
      };
    })
    .filter(Boolean);

module.exports = {
  buildDocumentAdditionalExpenses,
};
