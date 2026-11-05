import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import HeaderUdfSidebar from './HeaderUdfSidebar';
import { getBP } from '../../api/businessPartnerApi';

jest.mock('../../api/businessPartnerApi', () => ({
  getBP: jest.fn(),
  searchBP: jest.fn(),
}));
jest.mock('../../api/predefinedTextApi', () => ({
  createPredefinedText: jest.fn(),
  fetchPredefinedTexts: jest.fn(),
}));
jest.mock('../../modules/sales-order/components/BusinessPartnerModal', () => ({ isOpen, onSelect }) => isOpen ? (
  <div>{['A', 'B'].map(code => <button key={code} onClick={() => onSelect({ CardCode: code, CardName: 'Seller ' + code })}>Select {code}</button>)}</div>
) : null);
jest.mock('../common/SapLookupModal', () => () => null);
jest.mock('../sales-document/LineValueLookupModal', () => () => null);

const fields = [
  { key: 'U_Seller_Code', label: 'Seller Code', type: 'text' },
  { key: 'U_Seller_AddressId', label: 'Seller Address Id (Ship From)', type: 'text' },
  { key: 'U_Seller_Address', label: 'Seller Address', type: 'textarea' },
];

test('renders saved header UDF order without forcing seller contact beside the address', () => {
  render(<HeaderUdfSidebar isOpen fields={[
    { key: 'U_Seller_Address', label: 'Seller Address', type: 'textarea' },
    { key: 'U_SellerContact', label: 'Seller Contact Person', type: 'text' },
    { key: 'U_Reference', label: 'Reference', type: 'text' },
  ]} values={{}} formSettings={{ headerUdfs: {
    U_SellerContact: { order: 1 }, U_Reference: { order: 2 }, U_Seller_Address: { order: 3 },
  } }} onFieldChange={jest.fn()} />);
  const labels = screen.getAllByText(/^(Seller Address|Seller Contact Person|Reference)$/);
  expect(labels.map((node) => node.textContent)).toEqual(['Seller Contact Person', 'Reference', 'Seller Address']);
});

const renderSidebar = (values, onFieldChange) => render(
  <HeaderUdfSidebar
    isOpen
    fields={fields}
    formSettings={{ headerUdfs: {} }}
    values={values}
    onFieldChange={onFieldChange}
  />
);

beforeEach(() => {
  getBP.mockReset();
  getBP.mockResolvedValue({
    BPAddresses: [
      { AddressName: 'FACTORY', Street: 'P.O. Kathwada', City: 'Ahmedabad', State: 'GJ', ZipCode: '382430', Country: 'IN' },
      { AddressName: 'OFFICE', Street: 'Other address' },
    ],
  });
});

test('loads the saved seller address text from its address ID', async () => {
  const onFieldChange = jest.fn();
  renderSidebar({ U_Seller_Code: 'VEN00485', U_Seller_AddressId: 'FACTORY', U_Seller_Address: '' }, onFieldChange);

  await waitFor(() => expect(onFieldChange).toHaveBeenCalledWith(
    'U_Seller_Address', 'P.O. Kathwada\nAhmedabad, GJ, 382430\nIN'
  ));
  expect(getBP).toHaveBeenCalledWith('VEN00485');
});

test('keeps a saved seller address text instead of replacing it with current master data', () => {
  const onFieldChange = jest.fn();
  renderSidebar({ U_Seller_Code: 'VEN00485', U_Seller_AddressId: 'FACTORY', U_Seller_Address: 'Saved address' }, onFieldChange);

  expect(getBP).not.toHaveBeenCalled();
  expect(onFieldChange).not.toHaveBeenCalled();
});

test('fills a missing seller name while retaining the saved address snapshot', async () => {
  getBP.mockResolvedValue({ CardName: 'Saved seller name', BPAddresses: [] });
  const onFieldChange = jest.fn();
  renderSidebar({ U_Seller_Code: 'VEN1', U_Seller_Name: '', U_Seller_AddressId: 'FACTORY', U_Seller_Address: 'Saved address' }, onFieldChange);
  await waitFor(() => expect(onFieldChange).toHaveBeenCalledWith('U_Seller_Name', 'Saved seller name'));
  expect(onFieldChange).not.toHaveBeenCalledWith('U_Seller_Address', expect.anything());
});

test('an older seller lookup cannot overwrite a newer seller selection', async () => {
  let resolveA, resolveB;
  getBP.mockImplementation(code => new Promise(resolve => {
    if (code === 'A') resolveA = resolve; else resolveB = resolve;
  }));
  const onFieldChange = jest.fn();
  renderSidebar({}, onFieldChange);
  fireEvent.click(screen.getAllByTitle('List of Business Partners')[0]);
  fireEvent.click(screen.getByText('Select A'));
  fireEvent.click(screen.getByText('Select B'));
  await act(async () => resolveB({ BPAddresses: [{ AddressName: 'B-FACTORY', Street: 'B address' }] }));
  onFieldChange.mockClear();
  await act(async () => resolveA({ BPAddresses: [{ AddressName: 'A-FACTORY', Street: 'A address' }] }));
  expect(onFieldChange).not.toHaveBeenCalled();
});
