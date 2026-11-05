'use strict';
const db = require('./dbService');
const { createTableColumnDetailsReader, rowValue } = require('./salesDocumentDbCompatibility');
const TABLES = new Set(['ORDR','OQUT','ODLN','OINV','ORIN','OPOR','OPQT','OPDN','OPCH','ORPC']);
function createDocumentLogisticsSnapshotService({ database = db, getColumns = createTableColumnDetailsReader({ database }) } = {}) {
  return async function readDocumentLogisticsSnapshot(table, docEntry, { purchase = false } = {}) {
    if (!TABLES.has(table)) throw new Error('Unsupported logistics document table.');
    const id = Number(docEntry);
    if (!Number.isSafeInteger(id) || id < 0) throw new Error('Invalid document entry.');
    const columns = new Map((await getColumns(table)).map(column => [String(column.columnName).toUpperCase(), String(column.columnName)]));
    if (!columns.has('DOCENTRY')) return {};
    const fields = ['TrnspCode','LangCode','BPChCode','BPChCntc','Address','Address2','ShipToCode','PayToCode'].filter(field => columns.has(field.toUpperCase()));
    if (!fields.length) return {};
    // Column identifiers come exclusively from a fixed allowlist and physical metadata.
    const statement = 'SELECT ' + fields.map(field => '[' + columns.get(field.toUpperCase()).replace(/]/g, ']]') + '] AS [' + field + ']').join(', ')
      + ' FROM ' + table + ' WHERE DocEntry = @docEntry';
    const row = (await database.query(statement, { docEntry: id })).recordset?.[0];
    if (!row) return {};
    const result = {};
    const set = (field, keys) => { if (fields.includes(field)) for (const key of keys) result[key] = String(rowValue(row, field) ?? ''); };
    set('TrnspCode', ['shippingType']); set('LangCode', ['language']);
    if (!purchase) {
      set('BPChCode', ['bpChannelCode','bpChannelName']); set('BPChCntc', ['bpChannelContact']);
      set('Address2', ['shipToAddress','shipTo']); set('Address', ['billToAddress','payTo']);
      set('ShipToCode', ['shipToCode']); set('PayToCode', ['billToCode','payToCode']);
    } else {
      set('Address', ['billToAddress','billTo']); set('Address2', ['payToAddress','payTo']);
      set('ShipToCode', ['shipToCode','billToCode']); set('PayToCode', ['payToCode']);
    }
    return result;
  };
}
module.exports = { readDocumentLogisticsSnapshot: createDocumentLogisticsSnapshotService(), createDocumentLogisticsSnapshotService };
