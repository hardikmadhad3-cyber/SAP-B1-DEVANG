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
    <div className="sap-tab-panel del-tab-panel del-logistics-panel">
      <div className="sap-tab-grid">
        
        {/* ══ LEFT COLUMN: SHIPPING INFORMATION ═════════════════════════ */}
        <div className="sap-tab-column del-logistics-section">
          <h6 className="del-section-title">Shipping Information</h6>
          
          {/* Ship To Code */}
          <div className="del-field del-logistics-field">
            <label className="del-field__label">Ship To Code</label>
            <div className="sap-input-group">
              <select
                className="del-field__select"
                name="shipToCode"
                value={header.shipToCode || ''}
                onChange={onHeaderChange}
                disabled={!isEditable}
              >
                <DocumentAddressOptions addresses={vendorShipToAddresses} value={header.shipToCode} />
              </select>
              <button
                type="button"
                className="del-btn del-btn--lookup"
                onClick={() => onOpenAddressModal('shipTo')}
                disabled={!isEditable}
              >
                ...
              </button>
            </div>
          </div>

          {/* Ship To Address */}
          <div className="del-field del-logistics-field del-logistics-field--address">
            <label className="del-field__label">Ship To Address</label>
            <textarea
              className="del-textarea"
              disabled={!isEditable}
              rows={4}
              name="shipToAddress"
              value={header.shipToAddress ?? header.shipTo ?? ''}
              onChange={onHeaderChange}
            />
          </div>

          {/* Bill To Code */}
          <div className="del-field del-logistics-field">
            <label className="del-field__label">Bill To Code</label>
            <div className="sap-input-group">
              <select
                className="del-field__select"
                name="billToCode"
                value={header.billToCode || ''}
                onChange={onHeaderChange}
                disabled={!isEditable}
              >
                <DocumentAddressOptions addresses={vendorBillToAddresses} value={header.billToCode} />
              </select>
              <button
                type="button"
                className="del-btn del-btn--lookup"
                onClick={() => onOpenAddressModal('billTo')}
                disabled={!isEditable}
              >
                ...
              </button>
            </div>
          </div>

          {/* Bill To Address */}
          <div className="del-field del-logistics-field del-logistics-field--address">
            <label className="del-field__label">Bill To Address</label>
            <textarea
              className="del-textarea"
              disabled={!isEditable}
              rows={4}
              name="billToAddress"
              value={header.billToAddress ?? header.payTo ?? ''}
              onChange={onHeaderChange}
            />
          </div>

          {/* Use Bill to Address to Determine Tax */}
          <div className="sap-checkbox-row del-logistics-checkbox">
            <input
              type="checkbox"
              id="useBillToAddress"
              name="useBillToForTax"
              checked={!!header.useBillToForTax}
              onChange={onHeaderChange}
            />
            <label htmlFor="useBillToAddress">
              Use Bill to Address to Determine Tax
            </label>
          </div>
        </div>

        {/* ══ RIGHT COLUMN: DELIVERY INFORMATION ═════════════════════════ */}
        <div className="sap-tab-column del-logistics-section">
          <h6 className="del-section-title">Delivery Information</h6>
          
          {/* Shipping Type */}
          <div className="del-field del-logistics-field">
            <label className="del-field__label">Shipping Type</label>
            <LogisticsSelect className="del-field__select" name="shippingType" value={header.shippingType}
              onChange={onHeaderChange} options={logistics.shippingOptions} disabled={!isEditable}
              loading={logistics.loading} error={logistics.errors.shippingTypes} onRetry={logistics.retry} />
          </div>

          {/* Language */}
          <div className="del-field del-logistics-field">
            <label className="del-field__label">Language</label>
            <LogisticsSelect className="del-field__select" name="languageCode" value={header.languageCode}
              onChange={onHeaderChange} options={logistics.languageOptions} disabled={!isEditable}
              loading={logistics.loading} error={logistics.errors.languages} onRetry={logistics.retry} />
          </div>

          {/* Tracking No. */}
          <div className="del-field del-logistics-field">
            <label className="del-field__label">Tracking No.</label>
            <input className="del-field__input" name="trackingNo" value={header.trackingNo || ''} onChange={onHeaderChange} disabled={!isEditable} />
          </div>

          {/* Stamp No. */}
          <div className="del-field del-logistics-field">
            <label className="del-field__label">Stamp No.</label>
            <input className="del-field__input" name="stampNo" value={header.stampNo || ''} onChange={onHeaderChange} disabled={!isEditable} />
          </div>

          {/* Pick and Pack Remarks */}
          <div className="del-field del-logistics-field">
            <label className="del-field__label">Pick and Pack Remarks</label>
            <input className="del-field__input" name="pickAndPackRemarks" value={header.pickAndPackRemarks || ''} onChange={onHeaderChange} disabled={!isEditable} />
          </div>

          {/* BP Channel Name */}
          <div className="del-field del-logistics-field">
            <label className="del-field__label">BP Channel Name</label>
            <LogisticsChannel logistics={logistics} header={header} className="del-field__input" disabled={!isEditable} />
          </div>

          {/* BP Channel Contact */}
          <div className="del-field del-logistics-field">
            <label className="del-field__label">BP Channel Contact</label>
            <LogisticsSelect className="del-field__select" name="bpChannelContact" value={header.bpChannelContact}
              onChange={onHeaderChange} options={logistics.channel.contacts} disabled={!isEditable}
              error={logistics.channel.error} onRetry={logistics.retry} />
          </div>

          {/* Confirmed */}
          <div className="sap-checkbox-row del-logistics-checkbox">
            <input
              type="checkbox"
              name="confirmed"
              aria-label="Confirmed"
              checked={header.confirmed ?? true} title={header.confirmed == null ? "SAP company default; click to choose explicitly" : undefined}
              onChange={onHeaderChange}
            />
            <label>
              Confirmed
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
