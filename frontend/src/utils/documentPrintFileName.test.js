import { buildDocumentPrintFileName } from './documentPrintFileName';
test.each([
  ['soda_nodh_Sales_BC_19042019', '11635', 'soda_nodh_Sales_BC_11635.pdf'],
  ['Invoice_20261102.rpt', '00042', 'Invoice_00042.pdf'],
  ['Delivery', '81', 'Delivery_81.pdf'],
  ['Report_12345678', '8', 'Report_12345678_8.pdf'],
  ['Report_31022019', '8', 'Report_31022019_8.pdf'],
])('names %s using visible DocNum %s', (layoutName,docNum,expected)=>{
 expect(buildDocumentPrintFileName({layoutName,docNum,docEntry:999})).toBe(expected);
});
