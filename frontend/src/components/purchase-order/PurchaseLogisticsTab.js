import React from 'react';
import useDocumentLogistics from '../../hooks/useDocumentLogistics';
import { LogisticsSelect, DocumentAddressOptions } from '../../components/document/LogisticsLookupControls';

export const PURCHASE_LOGISTICS_SELECT_OPTION = { value: '', label: 'Select' };

export const formatPurchaseLogisticsAddress = (address) => {
  if (!address) return '';

  return [
    [address.Street, address.StreetNo],
    [address.Block, address.Building, address.Address2, address.Address3],
    [address.City, address.County, address.State, address.ZipCode],
    [address.Country],
  ]
    .map((parts) => parts.filter(Boolean).join(', '))
    .filter(Boolean)
    .join('\n');
};

export default function PurchaseLogisticsTab({
  header = {},
  onHeaderChange: originalHeaderChange,
  vendorPayToAddresses = [],
  vendorBillToAddresses = [],
  onPayToCodeChange,
  onOpenAddressModal,
  isEditable = true,
}) {
  const logistics = useDocumentLogistics({ header, onHeaderChange: originalHeaderChange, addressMode: 'purchase' });
  const onHeaderChange = logistics.handleChange;
  const safePayToAddresses = Array.isArray(vendorPayToAddresses) ? vendorPayToAddresses : [];
  const safeBillToAddresses = Array.isArray(vendorBillToAddresses) ? vendorBillToAddresses : [];
  const payToOptions = safePayToAddresses.length ? safePayToAddresses : safeBillToAddresses;

  const emitHeaderChange = (name, value, type = 'text', checked = false) => {
    onHeaderChange?.({ target: { name, value, type, checked } });
  };

  const handlePayToChange = (event) => {
    if (onPayToCodeChange) {
      onPayToCodeChange(event);
      return;
    }

    const selectedCode = event.target.value;
    const selectedAddress = payToOptions.find((address) => String(address.Address || '') === String(selectedCode || ''));
    const formattedAddress = selectedAddress ? formatPurchaseLogisticsAddress(selectedAddress) : '';

    emitHeaderChange('payToCode', selectedCode);
    emitHeaderChange('payTo', formattedAddress);
    emitHeaderChange('payToAddress', formattedAddress);
  };

  return (
    <div className="po-tab-panel po-logistics-tab">
      <div className="po-logistics-grid">
        <div className="po-logistics-left">
          <div className="po-field po-logistics-address-field">
            <label className="po-field__label">Bill To</label>
            <div className="po-logistics-address-control">
              <textarea
                className="po-textarea"
                rows={3}
                name="billTo"
                value={header.billToAddress ?? header.billTo ?? ''}
                onChange={onHeaderChange}
                disabled={!isEditable}
              />
              <button
                type="button"
                className="po-lookup-btn"
                onClick={() => onOpenAddressModal('billTo')}
                title="Select Address"
                disabled={!isEditable}
              >
                ...
              </button>
            </div>
          </div>

          <div className="po-field">
            <label className="po-field__label">Pay to</label>
            <div className="po-logistics-code-control">
              <select
                className="po-field__select"
                name="payToCode"
                value={header.payToCode || ''}
                onChange={handlePayToChange}
                disabled={!isEditable}
              >
                <DocumentAddressOptions addresses={payToOptions} value={header.payToCode} />
              </select>
            </div>
          </div>

          <div className="po-field po-logistics-address-field">
            <label className="po-field__label" />
            <div className="po-logistics-address-control">
              <textarea
                className="po-textarea"
                rows={3}
                name="payTo"
                value={header.payToAddress ?? header.payTo ?? ''}
                onChange={onHeaderChange}
                disabled={!isEditable}
              />
              <button
                type="button"
                className="po-lookup-btn"
                onClick={() => onOpenAddressModal('payTo')}
                title="Select Address"
                disabled={!isEditable}
              >
                ...
              </button>
            </div>
          </div>

          <div className="po-field">
            <label className="po-field__label">Shipping Type</label>
            <LogisticsSelect className="po-field__select" name="shippingType" value={header.shippingType} onChange={onHeaderChange} options={logistics.shippingOptions} disabled={!isEditable} loading={logistics.loading} error={logistics.errors.shippingTypes} onRetry={logistics.retry} />
          </div>

          <div className="po-field">
            <label className="po-field__label" />
            <label className="po-checkbox-label">
              <input
                type="checkbox"
                name="usePayToForTax"
                checked={header.usePayToForTax || false}
                onChange={onHeaderChange}
                disabled={!isEditable}
              />
              <span>Use Pay to Address to Determine Tax</span>
            </label>
          </div>
        </div>

        <div className="po-logistics-right">
          <div className="po-field">
            <label className="po-field__label">Language</label>
            <LogisticsSelect className="po-field__select" name="language" value={header.language} onChange={onHeaderChange} options={logistics.languageOptions} disabled={!isEditable} loading={logistics.loading} error={logistics.errors.languages} onRetry={logistics.retry} />
          </div>

          <div className="po-field">
            <label className="po-field__label" />
            <label className="po-checkbox-label">
              <input type="checkbox" name="splitPurchaseOrder" checked={header.splitPurchaseOrder || false} onChange={onHeaderChange} disabled={!isEditable} />
              <span>Split Purchase Order</span>
            </label>
          </div>

          <div className="po-field">
            <label className="po-field__label" />
            <label className="po-checkbox-label">
              <input type="checkbox" name="confirmed" checked={header.confirmed ?? true} title={header.confirmed == null ? 'SAP company default; click to choose explicitly' : undefined} onChange={onHeaderChange} disabled={!isEditable} />
              <span>Approved</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
