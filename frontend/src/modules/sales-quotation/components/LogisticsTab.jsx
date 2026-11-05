import React from 'react';
import useDocumentLogistics from '../../../hooks/useDocumentLogistics';
import { LogisticsSelect, LogisticsChannel, DocumentAddressOptions } from '../../../components/document/LogisticsLookupControls';

export default function LogisticsTab({
  header,
  onHeaderChange: originalHeaderChange,
  vendorPayToAddresses = [],
  vendorShipToAddresses = [],
  vendorBillToAddresses = [],
  onOpenAddressModal,
  onOpenEWayBillModal,
  isEditable = true,
}) {
  const logistics = useDocumentLogistics({ header, onHeaderChange: originalHeaderChange });
  const onHeaderChange = logistics.handleChange;
  const shipToOptions = vendorShipToAddresses.length ? vendorShipToAddresses : vendorPayToAddresses;
  const billToOptions = vendorBillToAddresses.length ? vendorBillToAddresses : vendorPayToAddresses;
  return (
    <div className="im-tab-panel">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' }}>
        {/* Left Column */}
        <div>
          <div className="im-section-title">Shipping Information</div>
          
          <div className="im-field">
            <label className="im-field__label">Ship To Code</label>
            <div className="im-lookup-wrap">
              <select
                className="im-field__select"
                name="shipToCode"
                value={header.shipToCode}
                onChange={onHeaderChange}
                style={{ flex: 1 }}
               disabled={!isEditable}>
                <DocumentAddressOptions addresses={shipToOptions} value={header.shipToCode} />
              </select>
              <button
                type="button"
                className="im-lookup-btn"
                onClick={() => onOpenAddressModal('shipTo')} disabled={!isEditable}
                title="Select Address"
              >
                ...
              </button>
            </div>
          </div>

          <div className="im-field" style={{ alignItems: 'flex-start' }}>
            <label className="im-field__label" style={{ paddingTop: '4px' }}>Ship To Address</label>
            <textarea
              className="im-textarea"
              rows={3}
              name="shipTo"
              value={header.shipToAddress || ''}
              onChange={onHeaderChange}
              style={{ flex: 1 }}
             disabled={!isEditable} />
          </div>

          <div className="im-field">
            <label className="im-field__label">Bill To Code</label>
            <div className="im-lookup-wrap">
              <select
                className="im-field__select"
                name="billToCode"
                value={header.billToCode}
                onChange={onHeaderChange}
                style={{ flex: 1 }}
               disabled={!isEditable}>
                <DocumentAddressOptions addresses={billToOptions} value={header.billToCode} />
              </select>
              <button
                type="button"
                className="im-lookup-btn"
                onClick={() => onOpenAddressModal('billTo')} disabled={!isEditable}
                title="Select Address"
              >
                ...
              </button>
            </div>
          </div>

          <div className="im-field" style={{ alignItems: 'flex-start' }}>
            <label className="im-field__label" style={{ paddingTop: '4px' }}>Bill To Address</label>
            <textarea
              className="im-textarea"
              rows={3}
              name="payTo"
              value={header.billToAddress || ''}
              onChange={onHeaderChange}
              style={{ flex: 1 }}
             disabled={!isEditable} />
          </div>

          <div className="im-field">
            <label className="im-field__label"></label>
            <label className="im-checkbox-label">
              <input 
                type="checkbox" 
                id="useBillToForTax" 
                name="useBillToForTax"
                checked={header.useBillToForTax || false}
                onChange={onHeaderChange}
              />
              <span>Use Bill to Address to Determine Tax</span>
            </label>
          </div>

          <div className="im-field">
            <label className="im-field__label">E-Way Bill Details</label>
            <button
              type="button"
              className="im-lookup-btn"
              onClick={onOpenEWayBillModal}
              title="E-Way Bill Details"
              style={{ width: '80px', fontSize: '11px' }}
            >
              ...
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div className="im-section-title">Delivery Information</div>
          
          <div className="im-field">
            <label className="im-field__label">Shipping Type</label>
            <LogisticsSelect className="im-field__select" name="shippingType" value={header.shippingType} onChange={onHeaderChange} options={logistics.shippingOptions} disabled={!isEditable} loading={logistics.loading} error={logistics.errors.shippingTypes} onRetry={logistics.retry} />
          </div>

          <div className="im-field">
            <label className="im-field__label">Language</label>
            <LogisticsSelect className="im-field__select" name="language" value={header.language} onChange={onHeaderChange} options={logistics.languageOptions} disabled={!isEditable} loading={logistics.loading} error={logistics.errors.languages} onRetry={logistics.retry} />
          </div>

          <div className="im-field">
            <label className="im-field__label">Tracking No.</label>
            <input className="im-field__input" />
          </div>

          <div className="im-field">
            <label className="im-field__label">Stamp No.</label>
            <input className="im-field__input" />
          </div>

          <div className="im-field">
            <label className="im-field__label">Pick and Pack Remarks</label>
            <input className="im-field__input" />
          </div>

          <div className="im-field">
            <label className="im-field__label">BP Channel Name</label>
            <LogisticsChannel logistics={logistics} header={header} className="im-field__input" disabled={!isEditable} />
          </div>

          <div className="im-field">
            <label className="im-field__label">BP Channel Contact</label>
            <LogisticsSelect className="im-field__select" name="bpChannelContact" value={header.bpChannelContact} onChange={onHeaderChange} options={logistics.channel.contacts} disabled={!isEditable} loading={logistics.loading} error={logistics.channel.error} onRetry={logistics.retry} />
          </div>

          <div className="im-field">
            <label className="im-field__label"></label>
            <label className="im-checkbox-label">
              <input
                type="checkbox"
                name="confirmed"
                checked={header.confirmed ?? true} title={header.confirmed == null ? "SAP company default; click to choose explicitly" : undefined}
                onChange={onHeaderChange}
              />
              <span>Confirmed</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

