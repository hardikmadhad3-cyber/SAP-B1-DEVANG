import { matchesSapSearchText, normalizeSapSearchText } from './sapSearch';

// Use names, never RCRI numbers: SAP assigns report codes independently per company.
// Specific document/module phrases take precedence over generic item/customer words.
export const COMPANY_REPORT_CATEGORIES = [
  { id: 'financials', label: 'Financials', description: 'Accounts, financial statements and tax' },
  { id: 'sales', label: 'Sales - A/R', description: 'Sales, deliveries, receivables and brokerage' },
  { id: 'purchasing', label: 'Purchasing - A/P', description: 'Purchases, goods receipts and payables' },
  { id: 'business-partners', label: 'Business Partners', description: 'Customer, vendor and contact information' },
  { id: 'banking', label: 'Banking', description: 'Payments, deposits and bank reconciliation' },
  { id: 'inventory', label: 'Inventory', description: 'Items, stock, warehouses and valuation' },
  { id: 'production', label: 'Production', description: 'Production orders and bills of materials' },
  { id: 'mrp', label: 'MRP', description: 'Material requirements and planning' },
  { id: 'service', label: 'Service', description: 'Service calls, contracts and equipment' },
  { id: 'hr', label: 'Human Resources', description: 'Employees, attendance and payroll' },
  { id: 'administration', label: 'Administration', description: 'Approvals, users and system information' },
  { id: 'other', label: 'Other Reports', description: 'Custom reports without a clear module name' },
];

const RULES = [
  ['purchasing', /\b(a p|ap|purchase|purchases|purchasing|procurement|grpo|goods receipt po|goods return|payable|payables|creditor|creditors|vendor liabilities)\b/],
  ['sales', /\b(a r|ar|sale|sales|selling|delivery|deliveries|quotation|receivable|receivables|debtor|debtors|brokerage|brokrage|brokage|commission)\b/],
  ['banking', /\b(bank|banking|payment|payments|receipt|receipts|deposit|deposits|cheque|cheques|check register|reconciliation)\b/],
  ['mrp', /\b(mrp|material requirements?|order recommendation|forecast)\b/],
  ['production', /\b(production|bom|bill of materials|bills of materials|issue for production|receipt from production)\b/],
  ['service', /\b(service call|service calls|service contract|service contracts|equipment card|equipment cards|warranty)\b/],
  ['hr', /\b(employee|employees|payroll|attendance|salary|salaries|human resources)\b/],
  ['administration', /\b(approval|approvals|authorization|authorizations|user|users|audit trail|system log|license)\b/],
  ['financials', /\b(financial|financials|balance sheet|trial balance|profit|loss|cash flow|fund flow|general ledger|ledger|journal|account|accounts|accounting|gst|gstr\d*|tax|taxation|tds|tcs|vat|budget|fixed asset|fixed assets)\b/],
  ['inventory', /\b(inventory|stock|warehouse|warehouses|item|items|valuation|batch|serial|goods issue|goods receipt|bin location|price list)\b/],
  ['business-partners', /\b(business partner|business partners|customer|customers|vendor|vendors|supplier|suppliers|buyer|buyers|seller|sellers|contact|contacts)\b/],
];

export function getCompanyReportCategory(report) {
  const name = normalizeSapSearchText(report?.name);
  // Production receipts must be resolved before generic banking receipts.
  if (/\b(issue for production|receipt from production)\b/.test(name)) return 'production';
  if (/\bgoods (receipt|issue)\b/.test(name) && !/\b(po|purchase)\b/.test(name)) return 'inventory';
  return RULES.find(([, pattern]) => pattern.test(name))?.[0] || 'other';
}

export function groupCompanyReports(catalog, query = '') {
  const groups = COMPANY_REPORT_CATEGORIES.map((category) => ({ ...category, reports: [], total: 0 }));
  const byId = new Map(groups.map((group) => [group.id, group]));
  catalog.forEach((report) => {
    const group = byId.get(getCompanyReportCategory(report));
    group.total += 1;
    if (matchesSapSearchText(`${report.name} ${report.code} ${group.label}`, query)) {
      group.reports.push(report);
    }
  });
  groups.forEach((group) => group.reports.sort((a, b) =>
    String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' })
      || String(a.code).localeCompare(String(b.code))));
  return groups.filter((group) => group.total > 0);
}
