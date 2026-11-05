import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GeneralSettings from './GeneralSettings';
import { fetchAdminGeneralSettingsBootstrap, fetchAdminGeneralSettings, fetchAdminGeneralSettingsOptions, saveAdminGeneralSettings } from '../../api/generalSettingsApi';
jest.mock('../../api/generalSettingsApi', () => ({
  fetchAdminGeneralSettingsBootstrap: jest.fn(), fetchAdminGeneralSettings: jest.fn(),
  fetchAdminGeneralSettingsOptions: jest.fn(), saveAdminGeneralSettings: jest.fn(),
}));
const profiles = [
  { key: 'salesOrder', documentType: 'salesOrder', settingKey: 'salesPrintLayout', label: 'Sales Order' },
  { key: 'dcSalesOrder', documentType: 'salesOrder', settingKey: 'dcSalesPrintLayout', label: 'DC Sales Order' },
  { key: 'serviceArInvoice', documentType: 'serviceArInvoice', settingKey: 'serviceArInvoicePrintLayout', label: 'Service A/R Invoice' },
];
beforeEach(() => {
  jest.clearAllMocks();
  fetchAdminGeneralSettingsBootstrap.mockResolvedValue({ companies: [{ CompanyId: 10, CompanyName: 'Company A' }, { CompanyId: 20, CompanyName: 'Company B' }],
    users: [{ UserId: 1, Username: 'alice' }, { UserId: 2, Username: 'bob' }],
    assignments: [{ UserId: 1, CompanyId: 10 }, { UserId: 2, CompanyId: 10 }, { UserId: 1, CompanyId: 20 }], printLayoutDocuments: profiles });
  fetchAdminGeneralSettings.mockImplementation(async (companyId, userId) => ({ settings: {
    salesWarehouse: 'W1', salesPrintLayout: String(companyId) === '10' && String(userId) === '1' ? 'RDR_A' : '',
    dcSalesPrintLayout: '', serviceArInvoicePrintLayout: '',
  } }));
  fetchAdminGeneralSettingsOptions.mockImplementation(async companyId => ({ warehouses: [{ WhsCode: 'W1', WhsName: 'Main' }], seriesByGroup: {},
    printLayoutsByGroup: { salesOrder: [{ DocCode: String(companyId) === '10' ? 'RDR_A' : 'RDR_B', DocName: 'Company order' }],
      serviceArInvoice: [{ DocCode: 'SERVICE_A', DocName: 'Service invoice' }] } }));
  saveAdminGeneralSettings.mockImplementation(async (companyId, userId, settings) => ({ settings }));
});
test('admin saves a per-user layout without losing warehouse defaults', async () => {
  render(<GeneralSettings />);
  await waitFor(() => expect(screen.getByLabelText('Sales Order')).toHaveValue('RDR_A'));
  fireEvent.change(screen.getByLabelText('DC Sales Order'), { target: { value: 'RDR_A' } });
  fireEvent.change(screen.getByLabelText('Service A/R Invoice'), { target: { value: 'SERVICE_A' } });
  fireEvent.click(screen.getByText('Save Defaults'));
  await waitFor(() => expect(saveAdminGeneralSettings).toHaveBeenCalledWith('10', '1', expect.objectContaining({
    salesWarehouse: 'W1', salesPrintLayout: 'RDR_A', dcSalesPrintLayout: 'RDR_A', serviceArInvoicePrintLayout: 'SERVICE_A',
  })));
});
test('switching user and company replaces the saved choice and company layout list', async () => {
  render(<GeneralSettings />);
  await waitFor(() => expect(screen.getByLabelText('Sales Order')).toHaveValue('RDR_A'));
  fireEvent.change(screen.getByLabelText('User'), { target: { value: '2' } });
  await waitFor(() => expect(screen.getByLabelText('Sales Order')).toHaveValue(''));
  fireEvent.change(screen.getByLabelText('Company'), { target: { value: '20' } });
  await waitFor(() => expect(screen.getByLabelText('Sales Order').querySelector('option[value="RDR_B"]')).toBeTruthy());
  expect(screen.getByLabelText('Sales Order').querySelector('option[value="RDR_A"]')).toBeNull();
});
test('Clear Values sends explicit empty print defaults so SAP defaults are restored', async () => {
  render(<GeneralSettings />);
  await waitFor(() => expect(screen.getByLabelText('Sales Order')).toHaveValue('RDR_A'));
  fireEvent.click(screen.getByText('Clear Values'));
  fireEvent.click(screen.getByText('Save Defaults'));
  await waitFor(() => expect(saveAdminGeneralSettings).toHaveBeenCalledWith('10', '1', expect.objectContaining({ salesPrintLayout: '', dcSalesPrintLayout: '' })));
});

test('a failed settings/options load cannot be saved as empty defaults', async () => {
  fetchAdminGeneralSettingsOptions.mockRejectedValue(new Error('Company metadata unavailable'));
  render(<GeneralSettings />);
  await screen.findByText('Company metadata unavailable');
  expect(screen.getByText('Save Defaults')).toBeDisabled();
  expect(screen.getByText('Clear Values')).toBeDisabled();
  expect(saveAdminGeneralSettings).not.toHaveBeenCalled();
});
