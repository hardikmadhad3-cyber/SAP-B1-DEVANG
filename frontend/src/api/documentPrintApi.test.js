import apiClient from './client';
import { fetchDocumentReportMetadata, printDocumentLayout, downloadDocumentLayoutPdf } from './documentPrintApi';
jest.mock('./client', () => ({ get: jest.fn(), post: jest.fn() }));
test('metadata, preview and download carry the page profile separately from the SAP document type', () => {
  const input = { documentType: 'salesOrder', layoutProfile: 'dcSalesOrder', docEntry: 3225, docNum: 168 };
  fetchDocumentReportMetadata(input);
  expect(apiClient.get).toHaveBeenCalledWith('/sap/reports/salesOrder/3225/metadata', expect.objectContaining({
    params: expect.objectContaining({ layoutProfile: 'dcSalesOrder', docNum: 168 }),
  }));
  printDocumentLayout(input);
  downloadDocumentLayoutPdf(input);
  expect(apiClient.post).toHaveBeenCalledWith('/document-print/salesOrder/print', expect.objectContaining({ layoutProfile: 'dcSalesOrder', docEntry: 3225 }));
  expect(apiClient.post).toHaveBeenCalledWith('/document-print/salesOrder/download-pdf', expect.objectContaining({ layoutProfile: 'dcSalesOrder', docEntry: 3225 }));
});
