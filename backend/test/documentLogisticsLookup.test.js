'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createDocumentLogisticsLookupService } = require('../services/documentLogisticsLookupService');
const { normalizeSql, bindParams } = require('../db/hanaDb');
const columnNames = { OSHP: ['TrnspCode','TrnspName'], OLNG: ['Code','Name','SysLang','Locked'], OCRD: ['CardCode','CardName','CardType'], OCPR: ['CardCode','CntctCode','Name','Active'] };
const columns = async table => (columnNames[table] || []).map(columnName => ({ columnName }));
test('current-company shipping and language codes are loaded without invented language IDs or Locked filtering', async () => {
  const queries = [];
  const service = createDocumentLogisticsLookupService({ getColumns: columns, database: { query: async statement => {
    queries.push(statement);
    return { recordset: statement.includes('OSHP') ? [{ TrnspCode: 0, TrnspName: 'Zero code' }, { TrnspCode: 1, TrnspName: 'By Road' }]
      : [{ Code: 8, Name: 'English (UK)', SysLang: 3, Locked: 'Y' }, { CODE: 26, NAME: 'Company language' }] };
  } } });
  const result = await service.getOptions();
  assert.deepEqual(result.shippingTypes.map(row => row.value), ['0','1']);
  assert.deepEqual(result.languages, [{ value: '8', label: 'English (UK)' }, { value: '26', label: 'Company language' }]);
  assert.ok(queries.every(statement => /^SELECT /.test(statement)));
  assert.ok(queries.every(statement => !statement.includes('Locked')));
});
test('one failed lookup cannot erase the other successful list', async () => {
  const service = createDocumentLogisticsLookupService({ getColumns: columns, database: { query: async statement => {
    if (statement.includes('OLNG')) throw new Error('metadata error');
    return { recordset: [{ TrnspCode: 1, TrnspName: 'By Road' }] };
  } } });
  const result = await service.getOptions();
  assert.equal(result.shippingTypes.length, 1);
  assert.equal(result.languages.length, 0);
  assert.ok(result.errors.languages);
});
test('channel contacts are scoped to the selected customer channel and filter inactive contacts', async () => {
  const queries = [];
  const service = createDocumentLogisticsLookupService({ getColumns: columns, database: { query: async (statement, params) => {
    queries.push({ statement, params });
    return { recordset: statement.includes('OCRD') ? [{ CardCode: params.cardCode, CardName: 'Channel', CardType: 'C' }]
      : [{ CntctCode: 17, Name: 'Channel contact' }] };
  } } });
  const result = await service.getChannel('CHAN-1');
  assert.deepEqual(result.contacts, [{ value: '17', label: 'Channel contact' }]);
  assert.equal(queries[1].params.cardCode, 'CHAN-1');
  assert.match(queries[1].statement, /Active = 'Y'/);
  assert.equal((await service.getChannel('')).contacts.length, 0);
});
test('optional contact Active column is checked before referencing it', async () => {
  let query;
  const service = createDocumentLogisticsLookupService({ getColumns: async table => (await columns(table)).filter(column => column.columnName !== 'Active'),
    database: { query: async statement => { query = statement; return { recordset: statement.includes('OCRD') ? [{ CardCode: 'C' }] : [] }; } } });
  await service.getChannel('C');
  assert.ok(!query.includes('Active'));
});
test('customer-channel search is parameterized, paginated, and portable to HANA', async () => {
  let query, params;
  const service = createDocumentLogisticsLookupService({ getColumns: columns, database: { query: async (statement, values) => {
    query = statement; params = values; return { recordset: [{ CardCode: 'A' }, { CardCode: 'B' }] };
  } } });
  assert.deepEqual(await service.findChannels({ query: "%' OR 1=1--", top: 1, skip: 1 }), [{ CardCode: 'B' }]);
  assert.ok(!query.includes('OR 1=1'));
  assert.match(params.query, /!%/);
  assert.match(query, /CardType = 'C'/);
  assert.match(normalizeSql(query), /SELECT|select/);
  assert.ok(bindParams(normalizeSql(query), params));
});
test('missing optional lookup tables do not generate SQL against absent columns', async () => {
  const service = createDocumentLogisticsLookupService({ getColumns: async () => [], database: { query: async () => assert.fail('Must not query absent table') } });
  assert.deepEqual((await service.getOptions()).shippingTypes, []);
  assert.deepEqual(await service.findChannels(), []);
});
