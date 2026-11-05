import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import CompanyReportsPage from './CompanyReportsPage';
import { useAuth } from '../auth/AuthContext';
import { fetchCompanyReports, fetchCompanyReport, runCompanyReport, exportCompanyReportExcel } from '../api/companyReportsApi';
import PdfViewer from '../components/reports-studio/PdfViewer';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../api/companyReportsApi', () => ({
  fetchCompanyReports: jest.fn(), fetchCompanyReport: jest.fn(), runCompanyReport: jest.fn(), exportCompanyReportExcel: jest.fn(),
}));
jest.mock('../components/reports-studio/PdfViewer', () => jest.fn(() => null));
jest.mock('../components/reports-studio/ReportPopupModal', () => ({ isOpen, onRun }) =>
  isOpen ? <button onClick={onRun}>Run test report</button> : null);

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ company: { companyId: 1, companyName: 'Company One' } });
  fetchCompanyReports.mockResolvedValue({ items: [
    { code: 'RCRI0108', name: 'Soda Sales' },
    { code: 'RCRI0087', name: 'AP Debit Note-Document wise' },
    { code: 'RCRI0200', name: 'Custom Analysis' },
  ] });
  fetchCompanyReport.mockResolvedValue({ report: { code: 'RCRI0108', name: 'Soda Sales' }, parameters: [] });
});

test('categories filter reports, search remains available, and clicking a report loads its original code', async () => {
  render(<CompanyReportsPage />);
  const salesReport = await screen.findByRole('button', { name: /Soda Sales/ });
  fireEvent.click(salesReport);
  await waitFor(() => expect(fetchCompanyReport).toHaveBeenCalledWith('RCRI0108'));
  const nav = screen.getByRole('navigation', { name: 'Report categories' });
  fireEvent.click(within(nav).getByRole('button', { name: /Purchasing/ }));
  expect(screen.queryByRole('button', { name: /Soda Sales/ })).toBeNull();
  expect(screen.getByRole('button', { name: /AP Debit Note/ })).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'RCRI0108' } });
  expect(screen.getByText('No reports match your current search and category.')).toBeTruthy();
  fireEvent.click(within(nav).getByRole('button', { name: /All Reports/ }));
  expect(screen.getByRole('button', { name: /Soda Sales/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /AP Debit Note/ })).toBeNull();
});

test('changing company clears filters and replaces the catalog', async () => {
  const { rerender } = render(<CompanyReportsPage />);
  await screen.findByRole('button', { name: /Soda Sales/ });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'soda' } });
  useAuth.mockReturnValue({ company: { companyId: 2, companyName: 'Company Two' } });
  fetchCompanyReports.mockResolvedValue({ items: [{ code: 'RCRI0108', name: 'Stock Statement' }] });
  rerender(<CompanyReportsPage />);
  expect(await screen.findByRole('button', { name: /Stock Statement/ })).toBeTruthy();
  expect(screen.getByRole('searchbox').value).toBe('');
  expect(screen.queryByRole('button', { name: /Soda Sales/ })).toBeNull();
  expect(screen.getByRole('button', { name: /Inventory/ })).toBeTruthy();
});

test('native Excel uses the preview report criteria and rejects a stale company preview', async () => {
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
  fetchCompanyReport.mockResolvedValue({ report: { code: 'RCRI0108', name: 'Soda Sales' },
    parameters: [{ paramName: 'Buyer', defaultValue: 'BUY01', paramType: 'string' }] });
  runCompanyReport.mockResolvedValue({ pdfBase64: 'JVBERi0x', fileName: 'RCRI0108.pdf' });
  exportCompanyReportExcel.mockResolvedValue({ workbookBase64: 'UEsDBA==' });
  const { rerender } = render(<CompanyReportsPage />);
  fireEvent.click(await screen.findByRole('button', { name: /Soda Sales/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Run test report' }));
  await waitFor(() => expect(PdfViewer.mock.calls.some(([props]) => props.isOpen)).toBe(true));
  const props = PdfViewer.mock.calls.filter(([p]) => p.isOpen).slice(-1)[0][0];
  await expect(props.onExportExcel()).resolves.toBeInstanceOf(Blob);
  expect(exportCompanyReportExcel).toHaveBeenCalledWith('RCRI0108', { Buyer: 'BUY01' }, 'data-only');
  await expect(props.onExportExcel('report-layout')).resolves.toBeInstanceOf(Blob);
  expect(exportCompanyReportExcel).toHaveBeenLastCalledWith('RCRI0108', { Buyer: 'BUY01' }, 'report-layout');
  useAuth.mockReturnValue({ company: { companyId: 2, companyName: 'Company Two' } });
  rerender(<CompanyReportsPage />);
  await screen.findByRole('button', { name: /Soda Sales/ });
  await expect(props.onExportExcel()).rejects.toMatchObject({ name: 'AbortError' });
  expect(exportCompanyReportExcel).toHaveBeenCalledTimes(2);
});
