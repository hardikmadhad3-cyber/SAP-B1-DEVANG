import React from 'react';
import useDocumentLogistics from '../../../hooks/useDocumentLogistics';
import { LogisticsSelect, LogisticsChannel, DocumentAddressOptions } from '../../../components/document/LogisticsLookupControls';

export default function LogisticsTab({
  header,
  onHeaderChange: originalHeaderChange,
  vendorShipToAddresses = [],
  vendorBillToAddresses = [],
  onOpenAddressModal,
  isEditable = true,
}) {
  const logistics = useDocumentLogistics({ header, onHeaderChange: originalHeaderChange });
  const onHeaderChange = logistics.handleChange;
  return (
    <div className="del-tab-panel">
      <div className="del-field-grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: '24px' }}>
        
        {/* ══ LEFT COLUMN: SHIPPING INFORMATION ═════════════════════════ */}
        <div>
          <h6 className="del-section-title">Shipping Information</h6>
          
          {/* Ship To Code */}
          <div className="del-field">
            <label className="del-field__label">Ship To Code</label>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <select
                className="del-field__select"
                disabled={!isEditable}
                name="shipToCode"
                value={header.shipToCode || ''}
                onChange={onHeaderChange}
                style={{ flex: 1 }}
              >
                <DocumentAddressOptions addresses={vendorShipToAddresses} value={header.shipToCode} />
              </select>
              <button
                type="button"
                className="del-btn"
                onClick={() => onOpenAddressModal('shipTo')} disabled={!isEditable}
                style={{ padding: '4px 8px', fontSize: 11, marginTop: 0 }}
              >
                ...
              </button>
            </div>
          </div>

          {/* Ship To Address */}
          <div className="del-field">
            <label className="del-field__label">Ship To Address</label>
            <textarea
              className="del-textarea"
              disabled={!isEditable}
              rows={4}
              name="shipToAddress"
              value={header.shipToAddress ?? header.shipTo ?? ''}
              onChange={onHeaderChange}
              style={{ flex: 1 }}
            />
          </div>

          {/* Bill To Code */}
          <div className="del-field">
            <label className="del-field__label">Bill To Code</label>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
              <select
                className="del-field__select"
                disabled={!isEditable}
                name="billToCode"
                value={header.billToCode || ''}
                onChange={onHeaderChange}
                style={{ flex: 1 }}
              >
                <DocumentAddressOptions addresses={vendorBillToAddresses} value={header.billToCode} />
              </select>
              <button
                type="button"
                className="del-btn"
                onClick={() => onOpenAddressModal('billTo')} disabled={!isEditable}
                style={{ padding: '4px 8px', fontSize: 11, marginTop: 0 }}
              >
                ...
              </button>
            </div>
          </div>

          {/* Bill To Address */}
          <div className="del-field">
            <label className="del-field__label">Bill To Address</label>
            <textarea
              className="del-textarea"
              disabled={!isEditable}
              rows={4}
              name="billToAddress"
              value={header.billToAddress ?? header.payTo ?? ''}
              onChange={onHeaderChange}
              style={{ flex: 1 }}
            />
          </div>

          {/* Use Bill to Address to Determine Tax */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <input
              type="checkbox"
              id="useBillToAddress"
              name="useBillToForTax"
              checked={!!header.useBillToForTax}
              onChange={onHeaderChange}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="useBillToAddress" style={{ cursor: 'pointer', margin: 0, fontSize: '12px', color: '#333' }}>
              Use Bill to Address to Determine Tax
            </label>
          </div>
        </div>

        {/* ══ RIGHT COLUMN: DELIVERY INFORMATION ═════════════════════════ */}
        <div>
          <h6 className="del-section-title">Delivery Information</h6>
          
          {/* Shipping Type */}
          <div className="del-field">
            <label className="del-field__label">Shipping Type</label>
            <LogisticsSelect className="del-field__select" name="shippingType" value={header.shippingType} onChange={onHeaderChange} options={logistics.shippingOptions} disabled={!isEditable} loading={logistics.loading} error={logistics.errors.shippingTypes} onRetry={logistics.retry} />
          </div>

          {/* Language */}
          <div className="del-field">
            <label className="del-field__label">Language</label>
            <LogisticsSelect className="del-field__select" name="language" value={header.language} onChange={onHeaderChange} options={logistics.languageOptions} disabled={!isEditable} loading={logistics.loading} error={logistics.errors.languages} onRetry={logistics.retry} />
          </div>

          {/* Tracking No. */}
          <div className="del-field">
            <label className="del-field__label">Tracking No.</label>
            <input className="del-field__input" />
          </div>

          {/* Stamp No. */}
          <div className="del-field">
            <label className="del-field__label">Stamp No.</label>
            <input className="del-field__input" />
          </div>

          {/* Pick and Pack Remarks */}
          <div className="del-field">
            <label className="del-field__label">Pick and Pack Remarks</label>
            <input className="del-field__input" />
          </div>

          {/* BP Channel Name */}
          <div className="del-field">
            <label className="del-field__label">BP Channel Name</label>
            <LogisticsChannel logistics={logistics} header={header} className="del-field__input" disabled={!isEditable} />
          </div>

          {/* BP Channel Contact */}
          <div className="del-field">
            <label className="del-field__label">BP Channel Contact</label>
            <LogisticsSelect className="del-field__select" name="bpChannelContact" value={header.bpChannelContact} onChange={onHeaderChange} options={logistics.channel.contacts} disabled={!isEditable} loading={logistics.loading} error={logistics.channel.error} onRetry={logistics.retry} />
          </div>

          {/* Confirmed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <input
              type="checkbox"
              name="confirmed"
              checked={header.confirmed ?? true} title={header.confirmed == null ? "SAP company default; click to choose explicitly" : undefined}
              onChange={onHeaderChange}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label style={{ cursor: 'pointer', margin: 0, fontSize: '12px', color: '#333' }}>
              Confirmed
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
