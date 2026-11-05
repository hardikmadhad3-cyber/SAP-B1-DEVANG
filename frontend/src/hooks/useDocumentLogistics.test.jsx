import { act, renderHook, waitFor } from '@testing-library/react';
import useDocumentLogistics from './useDocumentLogistics';
import { fetchDocumentLogisticsOptions, fetchDocumentChannel } from '../api/documentLogisticsApi';
let mockIdentity = { company: { companyId: 1, dbName: 'A' }, user: { userId: 1 } };
jest.mock('../auth/AuthContext', () => ({ useAuth: () => mockIdentity }));
jest.mock('../api/documentLogisticsApi', () => ({ fetchDocumentLogisticsOptions: jest.fn(), fetchDocumentChannel: jest.fn() }));
beforeEach(() => {
  mockIdentity = { company: { companyId: 1, dbName: 'A' }, user: { userId: 1 } };
  jest.clearAllMocks();
  fetchDocumentLogisticsOptions.mockResolvedValue({ shippingTypes: [{ value: '1', label: 'By Road' }], languages: [{ value: '8', label: 'English (UK)' }] });
  fetchDocumentChannel.mockImplementation(async code => ({ channel: { CardCode: code }, contacts: [{ value: code + '-contact', label: code + ' contact' }] }));
});
test('live lookup values are available to ordinary users without changing the document', async () => {
  const change = jest.fn();
  const { result } = renderHook(() => useDocumentLogistics({ header: {}, onHeaderChange: change }));
  await waitFor(() => expect(result.current.shippingOptions).toHaveLength(1));
  expect(result.current.languageOptions[0].label).toBe('English (UK)');
  expect(change).not.toHaveBeenCalled();
});
test('changing user/company reloads values and discards an older response', async () => {
  let oldResponse;
  fetchDocumentLogisticsOptions.mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; }));
  const { result, rerender } = renderHook(() => useDocumentLogistics({ header: {}, onHeaderChange: jest.fn() }));
  mockIdentity = { company: { companyId: 2, dbName: 'B' }, user: { userId: 2 } };
  rerender();
  await waitFor(() => expect(result.current.shippingOptions).toHaveLength(1));
  await act(async () => oldResponse({ shippingTypes: [{ value: 'OLD', label: 'Wrong company' }] }));
  expect(result.current.shippingOptions[0].value).toBe('1');
});
test('contact values belong only to the selected channel and clear on selection', async () => {
  const change = jest.fn();
  const { result, rerender } = renderHook(({ header }) => useDocumentLogistics({ header, onHeaderChange: change }), { initialProps: { header: { bpChannelCode: 'A' } } });
  await waitFor(() => expect(result.current.channel.contacts?.[0].value).toBe('A-contact'));
  rerender({ header: { bpChannelCode: 'B' } });
  await waitFor(() => expect(result.current.channel.contacts?.[0].value).toBe('B-contact'));
  act(() => result.current.selectChannel({ CardCode: 'C', CardName: 'Channel C' }));
  expect(change).toHaveBeenCalledWith({ target: { name: 'bpChannelContact', value: '', type: 'text' } });
});
test('an edited address keeps its exact text and clears stale structured components', async () => {
  const change = jest.fn();
  const { result } = renderHook(() => useDocumentLogistics({ header: {}, onHeaderChange: change }));
  act(() => result.current.handleChange({ target: { name: 'shipToAddress', value: 'Custom shipping address', type: 'textarea' } }));
  expect(change).toHaveBeenCalledWith({ target: { name: 'shipTo', value: 'Custom shipping address', type: 'text' } });
  expect(change).toHaveBeenCalledWith({ target: { name: 'shipToAddressComponents', value: null, type: 'text' } });
  await waitFor(() => expect(result.current.loading).toBe(false));
});
