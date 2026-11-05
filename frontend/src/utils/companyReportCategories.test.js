import { getCompanyReportCategory, groupCompanyReports } from './companyReportCategories';

test.each([
  ['AP Debit Note-Document wise', 'purchasing'],
  ['A/P Credit Note-Item wise', 'purchasing'],
  ['A/R Invoice Item wise', 'sales'],
  ['2023-Brokrage_Calc_Report (Buyer-Seller Wise)(16)_UTL_15112019', 'sales'],
  ['2023-SODA-SALES (Buyer-Product-Month Summary)_UTL', 'sales'],
  ['Purchase Order Item List', 'purchasing'],
  ['GRPO Register', 'purchasing'],
  ['Goods Receipt PO', 'purchasing'],
  ['Goods Receipt', 'inventory'],
  ['Receipt from Production', 'production'],
  ['Issue for Production', 'production'],
  ['Incoming Payments', 'banking'],
  ['Customer Receivables Aging', 'sales'],
  ['Vendor Liabilities Aging', 'purchasing'],
  ['Customer Ledger', 'financials'],
  ['GSTR-1', 'financials'],
  ['Inventory Audit Report', 'inventory'],
  ['Bill of Materials', 'production'],
  ['MRP Recommendations', 'mrp'],
  ['Service Calls', 'service'],
  ['Employee List', 'hr'],
  ['Approval Status', 'administration'],
  ['Business Partner Contacts', 'business-partners'],
  ['Custom Analysis 2026', 'other'],
])('%s belongs to %s', (name, category) => {
  expect(getCompanyReportCategory({ name })).toBe(category);
});

test('codes do not carry category meaning across companies', () => {
  expect(getCompanyReportCategory({ code: 'RCRI0108', name: 'Stock Statement' })).toBe('inventory');
  expect(getCompanyReportCategory({ code: 'RCRI0108', name: 'Sales Register' })).toBe('sales');
});

test('grouping keeps every report once, preserves names and codes, and sorts within modules', () => {
  const catalog = [
    { code: 'RCRI3', name: 'Sales Z' }, { code: 'RCRI2', name: 'Unfamiliar Custom Report' },
    { code: 'RCRI1', name: 'Sales A' }, { code: 'RCRI4', name: 'AP Invoice' },
  ];
  const groups = groupCompanyReports(catalog);
  expect(groups.map((g) => g.id)).toEqual(['sales', 'purchasing', 'other']);
  expect(groups[0].reports.map((r) => r.code)).toEqual(['RCRI1', 'RCRI3']);
  expect(groups.flatMap((g) => g.reports)).toHaveLength(catalog.length);
  expect(catalog[0].name).toBe('Sales Z');
});

test('search supports report code and module name while retaining total counts', () => {
  const catalog = [{ code: 'RCRI0108', name: 'Soda Sales' }, { code: 'RCRI0200', name: 'AP Invoice' }];
  expect(groupCompanyReports(catalog, 'rcri0108')[0].reports).toEqual([catalog[0]]);
  const groups = groupCompanyReports(catalog, 'Purchasing');
  expect(groups[0]).toMatchObject({ total: 1, reports: [] });
  expect(groups[1].reports).toEqual([catalog[1]]);
  expect(groupCompanyReports([], '')).toEqual([]);
});
