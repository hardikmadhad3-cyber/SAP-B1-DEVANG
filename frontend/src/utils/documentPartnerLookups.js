import { buildCompanyStorageScope } from './companyStorageScope';

export const getDocumentPartnerLookupScope = company => buildCompanyStorageScope(company);

// A BP-specific request is authoritative, including an empty result. General
// reference data can finish later during Copy To and must not erase those rows.
export const resolveDocumentPartnerReferenceRows = (previous, incoming, company, field) => {
  if (previous.documentPartnerLookupScope === getDocumentPartnerLookupScope(company)) {
    return Array.isArray(previous[field]) ? previous[field] : [];
  }
  return Array.isArray(incoming) ? incoming : [];
};
