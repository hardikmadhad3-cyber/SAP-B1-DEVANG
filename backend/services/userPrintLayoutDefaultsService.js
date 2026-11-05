'use strict';
const authDbService = require('./authDbService');
const PRINT_LAYOUT_PROFILES = Object.freeze([
  {
    "key": "salesOrder",
    "documentType": "salesOrder",
    "settingKey": "salesPrintLayout",
    "label": "Sales Order"
  },
  {
    "key": "dcSalesOrder",
    "documentType": "salesOrder",
    "settingKey": "dcSalesPrintLayout",
    "label": "DC Sales Order"
  },
  {
    "key": "ncSalesOrder",
    "documentType": "salesOrder",
    "settingKey": "ncSalesPrintLayout",
    "label": "NC Sales Order"
  },
  {
    "key": "sodaSalesOrder",
    "documentType": "salesOrder",
    "settingKey": "sodaSalesPrintLayout",
    "label": "SODA Sales Order"
  },
  {
    "key": "salesQuotation",
    "documentType": "salesQuotation",
    "settingKey": "salesQuotationPrintLayout",
    "label": "Sales Quotation"
  },
  {
    "key": "delivery",
    "documentType": "delivery",
    "settingKey": "deliveryPrintLayout",
    "label": "Delivery"
  },
  {
    "key": "dcDelivery",
    "documentType": "delivery",
    "settingKey": "dcDeliveryPrintLayout",
    "label": "DC Delivery"
  },
  {
    "key": "ncDelivery",
    "documentType": "delivery",
    "settingKey": "ncDeliveryPrintLayout",
    "label": "NC Delivery"
  },
  {
    "key": "sodaDelivery",
    "documentType": "delivery",
    "settingKey": "sodaDeliveryPrintLayout",
    "label": "SODA Delivery"
  },
  {
    "key": "arInvoice",
    "documentType": "arInvoice",
    "settingKey": "arInvoicePrintLayout",
    "label": "A/R Invoice"
  },
  {
    "key": "arCreditMemo",
    "documentType": "arCreditMemo",
    "settingKey": "arCreditMemoPrintLayout",
    "label": "A/R Credit Memo"
  },
  {
    "key": "purchaseQuotation",
    "documentType": "purchaseQuotation",
    "settingKey": "purchaseQuotationPrintLayout",
    "label": "Purchase Quotation"
  },
  {
    "key": "purchaseOrder",
    "documentType": "purchaseOrder",
    "settingKey": "purchaseOrderPrintLayout",
    "label": "Purchase Order"
  },
  {
    "key": "goodsReceiptPo",
    "documentType": "goodsReceiptPo",
    "settingKey": "grpoPrintLayout",
    "label": "Goods Receipt PO"
  },
  {
    "key": "goodsReturn",
    "documentType": "goodsReturn",
    "settingKey": "goodsReturnPrintLayout",
    "label": "Goods Return"
  },
  {
    "key": "apInvoice",
    "documentType": "apInvoice",
    "settingKey": "apInvoicePrintLayout",
    "label": "A/P Invoice"
  },
  {
    "key": "apCreditMemo",
    "documentType": "apCreditMemo",
    "settingKey": "apCreditMemoPrintLayout",
    "label": "A/P Credit Memo"
  },
  {
    "key": "serviceArInvoice",
    "documentType": "serviceArInvoice",
    "settingKey": "serviceArInvoicePrintLayout",
    "label": "Service A/R Invoice"
  },
  {
    "key": "serviceArCreditMemo",
    "documentType": "serviceArCreditMemo",
    "settingKey": "serviceArCreditMemoPrintLayout",
    "label": "Service A/R Credit Memo"
  },
  {
    "key": "serviceApInvoice",
    "documentType": "serviceApInvoice",
    "settingKey": "serviceApInvoicePrintLayout",
    "label": "Service A/P Invoice"
  },
  {
    "key": "serviceApCreditMemo",
    "documentType": "serviceApCreditMemo",
    "settingKey": "serviceApCreditMemoPrintLayout",
    "label": "Service A/P Credit Memo"
  },
  {
    "key": "goodsReceipt",
    "documentType": "goodsReceipt",
    "settingKey": "goodsReceiptPrintLayout",
    "label": "Goods Receipt"
  },
  {
    "key": "goodsIssue",
    "documentType": "goodsIssue",
    "settingKey": "goodsIssuePrintLayout",
    "label": "Goods Issue"
  },
  {
    "key": "inventoryTransferRequest",
    "documentType": "inventoryTransferRequest",
    "settingKey": "inventoryTransferRequestPrintLayout",
    "label": "Inventory Transfer Request"
  },
  {
    "key": "inventoryTransfer",
    "documentType": "inventoryTransfer",
    "settingKey": "inventoryTransferPrintLayout",
    "label": "Inventory Transfer"
  }
].map(Object.freeze));
const PRINT_LAYOUT_SETTING_KEYS = Object.freeze(PRINT_LAYOUT_PROFILES.map(profile => profile.settingKey));
const getPrintLayoutProfile = (documentType, layoutProfile = '') => {
  const profile = PRINT_LAYOUT_PROFILES.find(entry => entry.key === (layoutProfile || documentType));
  if (!profile || profile.documentType !== documentType) {
    const error = new Error('The print-layout profile does not belong to this document type.');
    error.statusCode = 400;
    throw error;
  }
  return profile;
};
const getUserPrintLayoutDefault = async (auth, documentType, layoutProfile = '') => {
  const profile = getPrintLayoutProfile(documentType, layoutProfile);
  if (!auth?.userId || !auth?.companyId) return { docCode: '', profile: profile.key };
  const row = await authDbService.queryOne(
    'SELECT SettingsJson FROM dbo.UserGeneralSettings WHERE UserId = @userId AND CompanyId = @companyId',
    { userId: auth.userId, companyId: auth.companyId },
  );
  let settings = {};
  try { settings = JSON.parse(row?.SettingsJson || '{}'); } catch (_) { /* Older invalid settings have no default. */ }
  return { docCode: String(settings?.[profile.settingKey] || '').trim(), profile: profile.key };
};
module.exports = { PRINT_LAYOUT_PROFILES, PRINT_LAYOUT_SETTING_KEYS, getPrintLayoutProfile, getUserPrintLayoutDefault };
