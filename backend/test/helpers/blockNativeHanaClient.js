'use strict';
// Payload unit tests must never initialize a native client or connect to SAP.
const id = require.resolve('@sap/hana-client');
require.cache[id] = { id, filename: id, loaded: true, exports: {
  createConnection() { throw new Error('Unexpected live HANA connection in payload unit test.'); },
} };
