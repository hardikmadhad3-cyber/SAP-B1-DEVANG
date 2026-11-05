'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { _buildARCreditMemoStandardLine } = require('../services/arCreditMemoService');

const RIN1_FIELDS = {
  ItemCode: 'nvarchar',
  Quantity: 'decimal',
  Price: 'decimal',
  TaxOnly: 'char',
};

test('based A/R Credit Memo lines inherit TaxOnly from their source document', async () => {
  const line = await _buildARCreditMemoStandardLine({
    line: {
      itemNo: 'I-100',
      quantity: 1,
      unitPrice: 100,
      taxLiable: 'N',
      baseType: 13,
      baseEntry: 42,
      baseLine: 0,
    },
    fieldMetadata: RIN1_FIELDS,
  });

  assert.deepEqual({
    BaseType: line.BaseType,
    BaseEntry: line.BaseEntry,
    BaseLine: line.BaseLine,
  }, { BaseType: 13, BaseEntry: 42, BaseLine: 0 });
  assert.equal(Object.hasOwn(line, 'TaxOnly'), false);
});

test('standalone A/R Credit Memo lines retain their selected TaxOnly value', async () => {
  const line = await _buildARCreditMemoStandardLine({
    line: { itemNo: 'I-101', quantity: 1, unitPrice: 100, taxLiable: 'Y' },
    fieldMetadata: RIN1_FIELDS,
  });

  assert.equal(line.TaxOnly, 'tYES');
});

test('A/R Credit Memo line UDFs retain memo text and type quantities for Service Layer', async () => {
  const result = await _buildARCreditMemoStandardLine({
    line: { itemNo: 'I-102', quantity: 1, unitPrice: 100, udf: {
      U_GrossWt: '1250.75', U_Seller_Quality: 'REBATE FFA UPTO 4% NO REBATE',
    } },
    allowedLineUdfs: new Set(['U_GrossWt', 'U_Seller_Quality']),
    fieldMetadata: { ...RIN1_FIELDS, U_GrossWt: 'decimal', U_Seller_Quality: 'ntext' },
  });
  assert.equal(result.U_GrossWt, 1250.75);
  assert.equal(result.U_Seller_Quality, 'REBATE FFA UPTO 4% NO REBATE');
});
