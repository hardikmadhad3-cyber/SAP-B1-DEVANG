'use strict';
const db = require('./dbService');
const { createTableColumnDetailsReader, rowValue } = require('./salesDocumentDbCompatibility');
function createDocumentLogisticsLookupService({ database = db, getColumns = createTableColumnDetailsReader({ database }) } = {}) {
  const columns = async table => new Set((await getColumns(table)).map(column => String(column.columnName).toUpperCase()));
  const select = async (statement, params = {}) => (await database.query(statement, params)).recordset || [];
  const has = (fields, required) => required.every(key => fields.has(key.toUpperCase()));
  const option = (row, code, label) => ({ value: String(rowValue(row, code) ?? ''), label: String(rowValue(row, label) ?? '') });
  const getShippingTypes = async () => {
    if (!has(await columns('OSHP'), ['TrnspCode', 'TrnspName'])) return [];
    return (await select('SELECT TrnspCode, TrnspName FROM OSHP ORDER BY TrnspName, TrnspCode')).map(row => option(row, 'TrnspCode', 'TrnspName'));
  };
  const getLanguages = async () => {
    if (!has(await columns('OLNG'), ['Code', 'Name'])) return [];
    // Code is the document foreign key. SysLang can differ between companies.
    // Locked languages are SAP-supplied, not unavailable languages.
    return (await select('SELECT Code, Name FROM OLNG ORDER BY Name, Code')).map(row => option(row, 'Code', 'Name'));
  };
  const getOptions = async () => {
    const results = await Promise.allSettled([getShippingTypes(), getLanguages()]);
    return { shippingTypes: results[0].status === 'fulfilled' ? results[0].value : [],
      languages: results[1].status === 'fulfilled' ? results[1].value : [],
      errors: Object.fromEntries(results.flatMap((result, index) => result.status === 'rejected'
        ? [[index === 0 ? 'shippingTypes' : 'languages', 'The company lookup could not be loaded. Please retry.']] : [])) };
  };
  const findChannels = async ({ query = '', top = 50, skip = 0 } = {}) => {
    if (!has(await columns('OCRD'), ['CardCode', 'CardName', 'CardType'])) return [];
    const limit = Math.trunc(Math.max(1, Math.min(200, Number(top) || 50)));
    const offset = Math.trunc(Math.max(0, Math.min(10000, Number(skip) || 0)));
    const search = '%' + String(query).trim().replace(/[!%_]/g, char => '!' + char) + '%';
    const statement = "SELECT TOP (" + (limit + offset) + ") CardCode, CardName, CardType FROM OCRD WHERE CardType = 'C' AND (CardCode LIKE @query ESCAPE '!' OR CardName LIKE @query ESCAPE '!') ORDER BY CardName, CardCode";
    return (await select(statement, { query: search })).slice(offset, offset + limit);
  };
  const getChannel = async cardCode => {
    const code = String(cardCode || '').trim();
    if (!code || !has(await columns('OCRD'), ['CardCode', 'CardName', 'CardType'])) return { channel: null, contacts: [] };
    const channel = (await select("SELECT CardCode, CardName, CardType FROM OCRD WHERE CardCode = @cardCode AND CardType = 'C'", { cardCode: code }))[0] || null;
    if (!channel) return { channel: null, contacts: [] };
    const fields = await columns('OCPR');
    if (!has(fields, ['CardCode', 'CntctCode', 'Name'])) return { channel, contacts: [] };
    const statement = 'SELECT CntctCode, Name FROM OCPR WHERE CardCode = @cardCode'
      + (fields.has('ACTIVE') ? " AND (Active = 'Y' OR Active IS NULL)" : '') + ' ORDER BY Name, CntctCode';
    return { channel, contacts: (await select(statement, { cardCode: code })).map(row => option(row, 'CntctCode', 'Name')) };
  };
  return { getOptions, getShippingTypes, getLanguages, findChannels, getChannel };
}
module.exports = { ...createDocumentLogisticsLookupService(), createDocumentLogisticsLookupService };
