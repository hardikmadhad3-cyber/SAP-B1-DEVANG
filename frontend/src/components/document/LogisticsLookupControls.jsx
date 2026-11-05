import React, { useState } from 'react';
import BusinessPartnerModal from '../../modules/sales-order/components/BusinessPartnerModal';
import { fetchDocumentChannels } from '../../api/documentLogisticsApi';
export function LogisticsSelect({ name, value = '', options = [], onChange, className, disabled = false, loading = false, error = '', onRetry }) {
  const entries = Array.isArray(options) ? options : [];
  const selected = String(value ?? '');
  return <><select aria-label={name === 'shippingType' ? 'Shipping Type' : name === 'bpChannelContact' ? 'BP Channel Contact' : 'Language'}
    className={className} name={name} value={selected} onChange={onChange} disabled={disabled}>
    <option value="">{loading ? 'Loading...' : 'Select'}</option>
    {entries.map(option => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
    {selected && !entries.some(option => String(option.value) === selected) ? <option value={selected}>{selected}</option> : null}
  </select>{error ? <small role="status">Could not load these values. <button type="button" onClick={onRetry} disabled={disabled}>Retry</button></small> : null}</>;
}
export function LogisticsChannel({ logistics, header, className, disabled = false }) {
  const [open, setOpen] = useState(false);
  return <><div className="sap-input-group"><input className={className} aria-label="BP Channel Name" readOnly
    value={logistics.channel.channel?.CardName || header.bpChannelName || header.bpChannelCode || ''} disabled={disabled} />
    <button type="button" onClick={() => setOpen(true)} disabled={disabled} aria-label="Choose BP Channel">...</button>
    <button type="button" onClick={() => logistics.selectChannel(null)} disabled={disabled} aria-label="Clear BP Channel">Clear</button></div>
    <BusinessPartnerModal isOpen={open} onClose={() => setOpen(false)} onSelect={logistics.selectChannel}
      fetchPartners={fetchDocumentChannels} title="BP Channel" />
  </>;
}
export function DocumentAddressOptions({ addresses = [], value }) {
  const seen = new Set();
  const entries = (addresses || []).filter(address => { const key = String(address.Address || address.AddressName || ''); if (!key || seen.has(key)) return false; seen.add(key); return true; });
  return <><option value="">Select</option>{entries.map(address => { const code = String(address.Address || address.AddressName); return <option key={code} value={code}>{code}</option>; })}
    {value && !seen.has(String(value)) ? <option value={value}>{value}</option> : null}</>;
}
