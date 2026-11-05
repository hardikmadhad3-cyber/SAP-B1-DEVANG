import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogisticsTab from './LogisticsTab';
import { fetchDocumentLogisticsOptions, fetchDocumentChannel } from '../../../api/documentLogisticsApi';
jest.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ company: { dbName: 'company-a' }, user: { userId: 42 } }) }));
jest.mock('../../../api/documentLogisticsApi', () => ({ fetchDocumentLogisticsOptions: jest.fn(), fetchDocumentChannel: jest.fn(), fetchDocumentChannels: jest.fn() }));
jest.mock('../../sales-order/components/BusinessPartnerModal', () => () => null);
beforeEach(() => {
  fetchDocumentLogisticsOptions.mockResolvedValue({ shippingTypes: [{ value: '1', label: 'By Road' }], languages: [{ value: '8', label: 'English (UK)' }], errors: {} });
  fetchDocumentChannel.mockResolvedValue({ channel: { CardCode: 'C001', CardName: 'Channel Customer' }, contacts: [{ value: '25', label: 'Channel Contact' }] });
});

const renderTab = (confirmed, onHeaderChange = jest.fn()) => render(
  <LogisticsTab header={{ confirmed }} onHeaderChange={onHeaderChange}
    vendorShipToAddresses={[]} vendorBillToAddresses={[]} shipTypeOpts={[]}
    onOpenAddressModal={jest.fn()} />,
);

test('does not default a new delivery to an explicit unconfirmed choice', async () => {
  const change = jest.fn();
  renderTab(undefined, change);
  const checkbox = screen.getByRole('checkbox', { name: 'Confirmed' });
  expect(checkbox).toBeChecked();
  expect(checkbox).toHaveAttribute('title', 'SAP company default; click to choose explicitly');
  fireEvent.click(checkbox);
  expect(change).toHaveBeenCalled();
  await screen.findByRole('option', { name: 'By Road' });
});

test('keeps the saved unconfirmed state visible and allows confirming it', async () => {
  const change = jest.fn();
  renderTab(false, change);
  const checkbox = screen.getByRole('checkbox', { name: 'Confirmed' });
  expect(checkbox).not.toBeChecked();
  expect(checkbox).toBeEnabled();
  fireEvent.click(checkbox);
  expect(change).toHaveBeenCalled();
  await screen.findByRole('option', { name: 'By Road' });
});

test('loads company shipping, language and selected channel contacts for an ordinary user', async () => {
  render(<LogisticsTab header={{ bpChannelCode: 'C001' }} onHeaderChange={jest.fn()} />);
  expect(await screen.findByRole('option', { name: 'By Road' })).toHaveValue('1');
  expect(await screen.findByRole('option', { name: 'English (UK)' })).toHaveValue('8');
  expect(await screen.findByRole('option', { name: 'Channel Contact' })).toHaveValue('25');
  expect(screen.getByLabelText('BP Channel Name')).toHaveValue('Channel Customer');
});
test('preserves a saved address code and synchronizes a cleared document address', async () => {
  const changes = [];
  const change = event => changes.push([event.target.name, event.target.value]);
  const { container } = render(<LogisticsTab header={{ shipToCode: 'Removed Master Address', shipToAddress: 'Saved snapshot', shipTo: 'Old alias' }} onHeaderChange={change} />);
  expect(container.querySelector('[name="shipToCode"]')).toHaveValue('Removed Master Address');
  fireEvent.change(container.querySelector('[name="shipToAddress"]'), { target: { value: '' } });
  expect(changes).toEqual([['shipToAddress', ''], ['shipTo', ''], ['shipToAddressComponents', null]]);
  await screen.findByRole('option', { name: 'By Road' });
});
test('locks address editing on a document that cannot be edited', async () => {
  const { container } = render(<LogisticsTab header={{}} onHeaderChange={jest.fn()} isEditable={false} />);
  await screen.findByRole('option', { name: 'By Road' });
  ['shipToCode','billToCode','shipToAddress','billToAddress','shippingType','languageCode','bpChannelContact'].forEach(name => {
    expect(container.querySelector('[name="' + name + '"]')).toBeDisabled();
  });
});
