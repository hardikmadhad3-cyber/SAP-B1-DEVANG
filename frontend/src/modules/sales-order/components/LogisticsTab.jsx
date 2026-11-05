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
  isEditable = true,
}) {
  const logistics = useDocumentLogistics({ header, onHeaderChange: originalHeaderChange });
  const onHeaderChange = logistics.handleChange;
  const shipToOptions = vendorShipToAddresses.length ? vendorShipToAddresses : vendorPayToAddresses;
  const billToOptions = vendorBillToAddresses.length ? vendorBillToAddresses : vendorPayToAddresses;

  return (
    <div className="sap-tab-panel so-tab-panel so-logistics-panel">
      <div className="so-logistics-grid">
        <section className="so-logistics-column so-logistics-column--left">
          <div className="sap-form-row so-logistics-row">
            <label className="so-field__label">Ship To</label>
            <div className="sap-input-group so-logistics-field-with-button">
              <select className="so-field__select" name="shipToCode" value={header.shipToCode} onChange={onHeaderChange} disabled={!isEditable}>
                <DocumentAddressOptions addresses={shipToOptions} value={header.shipToCode} />
              </select>
              <button type="button" className="so-btn so-btn--lookup" onClick={() => onOpenAddressModal('shipTo')} disabled={!isEditable} title="Select Address">...</button>
            </div>
          </div>

          <div className="sap-form-row so-logistics-row so-logistics-row--address">
            <span aria-hidden="true" />
            <textarea className="so-textarea" rows={3} name="shipToAddress" value={header.shipToAddress || ''} onChange={onHeaderChange}  disabled={!isEditable} />
          </div>

          <div className="sap-form-row so-logistics-row">
            <label className="so-field__label">Bill To</label>
            <div className="sap-input-group so-logistics-field-with-button">
              <select className="so-field__select" name="billToCode" value={header.billToCode} onChange={onHeaderChange} disabled={!isEditable}>
                <DocumentAddressOptions addresses={billToOptions} value={header.billToCode} />
              </select>
              <button type="button" className="so-btn so-btn--lookup" onClick={() => onOpenAddressModal('billTo')} disabled={!isEditable} title="Select Address">...</button>
            </div>
          </div>

          <div className="sap-form-row so-logistics-row so-logistics-row--address">
            <span aria-hidden="true" />
            <textarea className="so-textarea" rows={3} name="billToAddress" value={header.billToAddress || ''} onChange={onHeaderChange}  disabled={!isEditable} />
          </div>

          <div className="sap-form-row so-logistics-row">
            <label className="so-field__label">Shipping Type</label>
            <LogisticsSelect className="so-field__select" name="shippingType" value={header.shippingType} onChange={onHeaderChange} options={logistics.shippingOptions} disabled={!isEditable} loading={logistics.loading} error={logistics.errors.shippingTypes} onRetry={logistics.retry} />
          </div>

          <div className="sap-form-row so-logistics-row so-logistics-row--checkbox">
            <label className="sap-checkbox-row so-logistics-checkbox-row">
              <input type="checkbox" id="useBillToForTax" name="useBillToForTax" checked={header.useBillToForTax || false} onChange={onHeaderChange} />
              <span>Use Bill to Address to Determine Tax</span>
            </label>
          </div>

        </section>

        <section className="so-logistics-column so-logistics-column--right">
          <div className="sap-form-row so-logistics-row so-logistics-row--checkbox">
            <label className="sap-checkbox-row so-logistics-checkbox-row">
              <input type="checkbox" name="printPickingSheet" checked={Boolean(header.printPickingSheet)} onChange={onHeaderChange} />
              <span>Print Picking Sheet</span>
            </label>
          </div>

          <div className="sap-form-row so-logistics-row">
            <label className="so-field__label">Language</label>
            <LogisticsSelect className="so-field__select" name="language" value={header.language} onChange={onHeaderChange} options={logistics.languageOptions} disabled={!isEditable} loading={logistics.loading} error={logistics.errors.languages} onRetry={logistics.retry} />
          </div>

          <div className="sap-form-row so-logistics-row so-logistics-row--checkbox">
            <label className="sap-checkbox-row so-logistics-checkbox-row">
              <input type="checkbox" name="procureNonDropShipItems" checked={Boolean(header.procureNonDropShipItems)} onChange={onHeaderChange} />
              <span>Procure Non Drop-Ship Items</span>
            </label>
          </div>

          <div className="sap-form-row so-logistics-row so-logistics-row--checkbox">
            <label className="sap-checkbox-row so-logistics-checkbox-row">
              <input type="checkbox" name="procureDropShipItems" checked={header.procureDropShipItems !== false} onChange={onHeaderChange} />
              <span>Procure Drop-Ship Items</span>
            </label>
          </div>

          <div className="sap-form-row so-logistics-row so-logistics-row--checkbox">
            <label className="sap-checkbox-row so-logistics-checkbox-row">
              <input type="checkbox" name="confirmed" checked={header.confirmed ?? true} title={header.confirmed == null ? "SAP company default; click to choose explicitly" : undefined} onChange={onHeaderChange} />
              <span>Approved</span>
            </label>
          </div>

          <div className="sap-form-row so-logistics-row so-logistics-row--checkbox">
            <label className="sap-checkbox-row so-logistics-checkbox-row">
              <input type="checkbox" name="allowPartialDelivery" checked={header.allowPartialDelivery !== false} onChange={onHeaderChange} />
              <span>Allow Partial Delivery</span>
            </label>
          </div>

          <div className="sap-form-row so-logistics-row">
            <label className="so-field__label">Pick and Pack Remarks</label>
            <input className="so-field__input" name="pickAndPackRemarks" value={header.pickAndPackRemarks || ''} onChange={onHeaderChange} />
          </div>

          <div className="sap-form-row so-logistics-row">
            <label className="so-field__label">BP Channel Name</label>
            <LogisticsChannel logistics={logistics} header={header} className="so-field__input" disabled={!isEditable} />
          </div>

          <div className="sap-form-row so-logistics-row">
            <label className="so-field__label">BP Channel Contact</label>
            <LogisticsSelect className="so-field__select" name="bpChannelContact" value={header.bpChannelContact} onChange={onHeaderChange} options={logistics.channel.contacts} disabled={!isEditable} loading={logistics.loading} error={logistics.channel.error} onRetry={logistics.retry} />
          </div>
        </section>
      </div>
    </div>
  );
}

