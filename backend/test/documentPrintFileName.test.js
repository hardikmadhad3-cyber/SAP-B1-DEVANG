'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { buildDocumentPrintFileName } = require('../utils/documentPrintFileName');
const cases = [
  [{layoutName:'soda_nodh_Sales_BC_19042019',docNum:11635,docEntry:999},'soda_nodh_Sales_BC_11635.pdf'],
  [{layoutName:'Sales_20261102.rpt',docNum:'00042'},'Sales_00042.pdf'],
  [{layoutName:'Delivery',docNum:81},'Delivery_81.pdf'],
  [{layoutName:'Report_12345678',docNum:8},'Report_12345678_8.pdf'],
  [{layoutName:'Report_31022019',docNum:8},'Report_31022019_8.pdf'],
  [{layoutName:'Report_29022024',docNum:8},'Report_8.pdf'],
  [{layoutName:'Report_29022023',docNum:8},'Report_29022023_8.pdf'],
  [{layoutName:'A/B: Sales',docNum:'42/3'},'A_B__Sales_42_3.pdf'],
  [{layoutCode:'RDR001',docEntry:100},'RDR001_100.pdf'],
];
for(const [input,expected] of cases)test(expected,()=>assert.equal(buildDocumentPrintFileName(input),expected));
const source=fs.readFileSync(require.resolve('../services/documentPrintLayoutService'),'utf8');
const configStart=source.indexOf('const DOCUMENT_PRINT_CONFIG =');const configEnd=source.indexOf('const DOCUMENT_TYPE_BY_ALIAS =',configStart);
const configs=vm.runInNewContext(source.slice(configStart,configEnd)+'\nDOCUMENT_PRINT_CONFIG;');
const start=source.indexOf('const buildFileName =');const end=source.indexOf('const downloadAllLayouts =',start);
for(const [key,config] of Object.entries(configs))test(key+': export uses the selected SAP layout name and resolved DocNum',async()=>{
 let exported;
 const print=vm.runInNewContext(source.slice(start,end)+'\nprintDocument;',{
  buildDocumentPrintFileName,requirePrintPermission:()=>{},getDocumentPrintConfig:()=>({...config,key}),
  getDocumentReportMetadata:async()=>({documentLabel:config.label,layout:{docCode:'REPORT123',docName:'soda_nodh_Sales_BC_19042019'},document:{docEntry:'999',docNum:'11635',cardCode:'C001'},schema:'COMPANY_A',diagnostics:{}}),
  hydrateSalesOrderPrintFields:async()=>{},console:{info:()=>{}},
  reportService:{exportDocumentPdf:async payload=>{exported=payload;return{fileName:payload.fileName,base64Pdf:'JVBERg==',mimeType:'application/pdf'};}},
 });
 const result=await print({documentType:key,docEntry:999,docNum:1,layoutName:'Untrusted client name'});
 assert.equal(exported.fileName,'soda_nodh_Sales_BC_11635.pdf');assert.equal(result.fileName,exported.fileName);
 assert.equal(exported.docEntry,'999');assert.equal(exported.docNum,'11635');
});
