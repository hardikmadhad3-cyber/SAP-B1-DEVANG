'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createDocumentLogisticsSnapshotService } = require('../services/documentLogisticsSnapshotService');
const { normalizeSql } = require('../db/hanaDb');
const all = ['DocEntry','TrnspCode','LangCode','BPChCode','BPChCntc','Address','Address2','ShipToCode','PayToCode'];
const row = { TrnspCode: 0, LangCode: 8, BPChCode: 'C001', BPChCntc: 25, Address: 'Bill snapshot', Address2: 'Ship snapshot', ShipToCode: 'SHIP', PayToCode: 'BILL' };
const make = fields => createDocumentLogisticsSnapshotService({ getColumns: async () => fields.map(columnName => ({ columnName })), database: { query: async (statement, params) => {
  assert.equal(params.docEntry, 168); assert.match(statement, /^SELECT /); assert.ok(!statement.includes('OCRD'));
  for (const field of all.filter(field => field !== 'DocEntry' && !fields.includes(field))) assert.ok(!statement.includes('['+field+']'));
  assert.match(normalizeSql(statement), /WHERE/);
  return { recordset: [row] };
} } });
test('sales snapshots preserve document edits and correct SAP Bill/Ship sides across all sales tables', async () => {
  for (const table of ['ORDR','OQUT','OINV','ORIN']) {
    const result = await make(all)(table,168);
    assert.equal(result.billToAddress,'Bill snapshot'); assert.equal(result.shipToAddress,'Ship snapshot');
    assert.equal(result.shippingType,'0'); assert.equal(result.language,'8'); assert.equal(result.bpChannelCode,'C001'); assert.equal(result.bpChannelContact,'25');
  }
});
test('purchase snapshots preserve warehouse and vendor billing sides separately', async () => {
  const result = await make(all)('OPCH',168,{ purchase:true });
  assert.equal(result.billToAddress,'Bill snapshot'); assert.equal(result.payToAddress,'Ship snapshot');
  assert.equal(result.bpChannelCode,undefined); assert.equal(result.billToCode,'SHIP');
});
test('missing optional columns do not overwrite existing hydrated fields', async () => {
  assert.deepEqual(await make(['DocEntry','LangCode'])('ORDR',168),{language:'8'});
  assert.deepEqual(await make([])('ORDR',168),{});
});
test('invalid table and document identifiers are rejected before querying', async () => {
  await assert.rejects(make(all)('ORDR;DROP',168)); await assert.rejects(make(all)('ORDR','168)bad'));
});
