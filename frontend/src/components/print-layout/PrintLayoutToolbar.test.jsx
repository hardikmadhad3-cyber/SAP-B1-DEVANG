import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PrintLayoutToolbar from './PrintLayoutToolbar';
import { fetchDocumentReportMetadata, downloadDocumentLayoutPdf, printDocumentLayout } from '../../api/documentPrintApi';
import { base64ToPdfBlob, choosePdfSaveTarget, savePdfBlobToTarget, downloadPdfBlob } from '../../utils/pdfUtils';
jest.mock('../../utils/pdfUtils', () => ({ base64ToPdfBlob: jest.fn(() => new Blob(['pdf'])), choosePdfSaveTarget: jest.fn(), savePdfBlobToTarget: jest.fn(), downloadPdfBlob: jest.fn() }));
jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ company: { companyId: 10, dbName: 'COMPANY_A' } }) }));
jest.mock('../../api/documentPrintApi', () => ({ fetchDocumentReportMetadata: jest.fn(), printDocumentLayout: jest.fn(), downloadDocumentLayoutPdf: jest.fn() }));
const layouts = [
  { docCode: 'USER', docName: 'User Sales Layout', isExportSupported: true },
  { docCode: 'CHOICE', docName: 'Alternate Layout', isExportSupported: true },
];
beforeEach(() => {
  base64ToPdfBlob.mockImplementation(() => new Blob(['pdf']));
  fetchDocumentReportMetadata.mockReset();
  fetchDocumentReportMetadata.mockImplementation(async input => ({ data: {
    schema: 'COMPANY_A', document: { docEntry: 3225 }, layoutCandidates: layouts,
    layout: layouts.find(layout => layout.docCode === input.docCode) || layouts[0],
    requiresLayoutSelection: false, parameters: [],
  } }));
});
test('the assigned layout displays automatically, carries the page profile, and supports a manual override', async () => {
  render(<PrintLayoutToolbar documentType="salesOrder" layoutProfile="dcSalesOrder" documentLabel="Sales Order" docEntry={3225} docNumber={168} />);
  await screen.findByText('User Sales Layout');
  expect(fetchDocumentReportMetadata).toHaveBeenCalledWith(expect.objectContaining({ documentType: 'salesOrder', layoutProfile: 'dcSalesOrder', docEntry: 3225 }));
  expect(screen.getByRole('button', { name: 'Print Sales Order' })).toBeEnabled();
  fireEvent.click(screen.getByTitle('Choose one of the active SAP B1 Crystal layouts.'));
  fireEvent.doubleClick(screen.getByText('Alternate Layout'));
  await waitFor(() => expect(fetchDocumentReportMetadata).toHaveBeenCalledWith(expect.objectContaining({ layoutProfile: 'dcSalesOrder', docCode: 'CHOICE' })));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Print Sales Order' })).toBeEnabled());
});

test('Choose Layout hides unsupported system/PLD and inactive options even from an older metadata response', async () => {
  fetchDocumentReportMetadata.mockResolvedValue({ data: { schema: 'COMPANY_A', document: { docEntry: 3225 }, layout: layouts[0], requiresLayoutSelection: false,
    layoutCandidates: [...layouts,
      { docCode: 'PLD', docName: 'Sales Order (System)', category: 'P', isExportSupported: false },
      { docCode: 'PICK', docName: 'Pick List (System)', category: 'P', isExportSupported: true },
      { docCode: 'OLD', docName: 'Inactive layout', category: 'C', status: 'N', isExportSupported: true },
    ] } });
  render(<PrintLayoutToolbar documentType="salesOrder" docEntry={3225} docNumber={168} />);
  await screen.findByText('User Sales Layout');
  fireEvent.click(screen.getByTitle('Choose one of the active SAP B1 Crystal layouts.'));
  expect(screen.queryByText('Sales Order (System)')).not.toBeInTheDocument();
  expect(screen.queryByText('Pick List (System)')).not.toBeInTheDocument();
  expect(screen.queryByText('Inactive layout')).not.toBeInTheDocument();
  expect(screen.getByText('Alternate Layout')).toBeInTheDocument();
});
test('a document with only unsupported system layouts shows an empty state and cannot print', async () => {
  fetchDocumentReportMetadata.mockResolvedValue({ data: { schema: 'COMPANY_A', layout: null, requiresLayoutSelection: true,
    layoutCandidates: [{ docCode: 'PLD', docName: 'Order Confirmation (System)', category: 'P', isExportSupported: false }] } });
  render(<PrintLayoutToolbar documentType="salesOrder" documentLabel="Sales Order" docEntry={3225} />);
  await screen.findByText('Choose Layout');
  expect(screen.getByRole('button', { name: 'Print Sales Order' })).toBeDisabled();
  fireEvent.click(screen.getByTitle('Choose one of the active SAP B1 Crystal layouts.'));
  expect(screen.queryByText('Order Confirmation (System)')).not.toBeInTheDocument();
  expect(screen.getByText('No printable Crystal layouts are available for this document.')).toBeInTheDocument();
});

test('Save As suggests the selected layout without its date and the visible document number', async () => {
  fetchDocumentReportMetadata.mockResolvedValue({ data: { schema:'COMPANY_A', document:{docEntry:3225,docNum:11635},layout:{docCode:'BC',docName:'soda_nodh_Sales_BC_19042019',isExportSupported:true},requiresLayoutSelection:false } });
  const target={kind:'browser-download',fileName:'soda_nodh_Sales_BC_11635.pdf'};
  choosePdfSaveTarget.mockResolvedValue(target);
  downloadDocumentLayoutPdf.mockResolvedValue({data:{fileName:'soda_nodh_Sales_BC_11635.pdf',base64Pdf:'JVBERg=='}});
  savePdfBlobToTarget.mockResolvedValue({saved:true,fileName:target.fileName});
  render(<PrintLayoutToolbar documentType="salesOrder" documentLabel="Sales Order" docEntry={3225} docNumber={11635} />);
  await screen.findByDisplayValue('soda_nodh_Sales_BC_19042019');
  fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));
  await waitFor(()=>expect(choosePdfSaveTarget).toHaveBeenCalledWith('soda_nodh_Sales_BC_11635.pdf'));
  await waitFor(()=>expect(savePdfBlobToTarget).toHaveBeenCalledWith(expect.any(Blob),'soda_nodh_Sales_BC_11635.pdf',target));
});

test('preview downloads retain the resolved layout and document filename', async () => {
  const filename='Delivery_77.pdf';
  fetchDocumentReportMetadata.mockResolvedValue({data:{schema:'COMPANY_A',document:{docEntry:900,docNum:77},layout:{docCode:'DLN',docName:'Delivery_19042019',isExportSupported:true},requiresLayoutSelection:false,fileName:filename}});
  printDocumentLayout.mockResolvedValue({data:{fileName:filename,base64Pdf:'JVBERg=='}});
  downloadPdfBlob.mockResolvedValue({saved:true,fileName:filename});
  URL.createObjectURL=jest.fn(()=> 'blob:preview');URL.revokeObjectURL=jest.fn();
  render(<PrintLayoutToolbar documentType="delivery" documentLabel="Delivery" docEntry={900} docNumber={77} />);
  await screen.findByDisplayValue('Delivery_19042019');
  fireEvent.click(screen.getByRole('button',{name:'Print Delivery'}));
  await screen.findByText(filename);
  fireEvent.click(screen.getAllByRole('button',{name:'Download PDF'})[1]);
  await waitFor(()=>expect(downloadPdfBlob).toHaveBeenCalledWith(expect.any(Blob),filename));
});