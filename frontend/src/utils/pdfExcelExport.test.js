import * as XLSX from 'xlsx';
import { pdfTextToRows, buildPdfWorkbook, chooseExcelSaveTarget, exportPdfToExcel, excelFileName } from './pdfExcelExport';

const run = (str, x, y, width = 40) => ({ str, width, transform: [10, 0, 0, 10, x, y] });
const bytes = (blob) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsArrayBuffer(blob);
});
afterEach(() => { delete window.showSaveFilePicker; jest.restoreAllMocks(); });

test('reconstructs cells in reading order, joins split words, and retains missing columns', () => {
  expect(pdfTextToRows([
    run('Amount', 300, 700), run('Qty', 200, 700), run('Product', 40, 700),
    run('Green', 40, 680, 25), run('Tea', 68, 680, 15), run('2', 220, 680, 5), run('100.00', 310, 680),
    run('Coffee', 40, 660), run('200.00', 310, 660), { str: '' },
  ])).toEqual([['Product', 'Qty', 'Amount'], ['Green Tea', '2', '100.00'], ['Coffee', '', '200.00']]);
});

test('writes a real XLSX containing every page, including values resembling formulas and codes', async () => {
  const pdf = { numPages: 2, getPage: jest.fn(async (number) => ({
    getTextContent: async () => ({ items: [run('Code', 40, 700), run('Value', 200, 700),
      run(number === 1 ? '00123' : '=HYPERLINK("example")', 40, 680), run('1,234.50', 200, 680)] }),
  })) };
  const progress = jest.fn();
  const blob = await buildPdfWorkbook(pdf, { onProgress: progress });
  const buffer = await bytes(blob);
  expect(Array.from(new Uint8Array(buffer).slice(0, 2))).toEqual([80, 75]);
  const workbook = XLSX.read(buffer, { type: 'array' });
  expect(workbook.SheetNames).toEqual(['Page 1', 'Page 2']);
  expect(workbook.Sheets['Page 1'].A2).toMatchObject({ v: '00123', t: 's' });
  expect(workbook.Sheets['Page 2'].A2.v).toBe('=HYPERLINK("example")');
  expect(workbook.Sheets['Page 2'].A2.f).toBeUndefined();
  expect(progress).toHaveBeenLastCalledWith(2, 2);
  expect(pdf.getPage).toHaveBeenCalledTimes(2);
});

test('rejects reports with no selectable text instead of saving an empty spreadsheet', async () => {
  await expect(buildPdfWorkbook({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) }))
    .rejects.toThrow('no selectable text');
});

test('does not save partial workbooks when a later page fails or the preview is closed', async () => {
  const handle = { createWritable: jest.fn() };
  const pdf = { numPages: 2, getPage: jest.fn(async (number) => {
    if (number === 2) throw new Error('Could not load page');
    return { getTextContent: async () => ({ items: [run('Data', 40, 700)] }) };
  }) };
  await expect(exportPdfToExcel(pdf, { handle })).rejects.toThrow('Could not load page');
  expect(handle.createWritable).not.toHaveBeenCalled();
  await expect(exportPdfToExcel(pdf, { handle }, { isActive: () => false })).rejects.toMatchObject({ name: 'AbortError' });
  expect(handle.createWritable).not.toHaveBeenCalled();
});

test('the Save As dialog offers a genuine Excel extension and cancellation is respected', async () => {
  window.showSaveFilePicker = jest.fn().mockRejectedValue(Object.assign(new Error(), { name: 'AbortError' }));
  const target = await chooseExcelSaveTarget('RCRI0027.pdf');
  expect(target.cancelled).toBe(true);
  expect(window.showSaveFilePicker).toHaveBeenCalledWith(expect.objectContaining({
    suggestedName: 'RCRI0027.xlsx', types: [{ description: 'Excel workbook', accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    } }],
  }));
  expect(await exportPdfToExcel(null, target)).toEqual({ saved: false });
});

test('saves through the selected file handle and closes the writable', async () => {
  const writable = { write: jest.fn(), close: jest.fn() };
  const handle = { createWritable: jest.fn().mockResolvedValue(writable) };
  window.showSaveFilePicker = jest.fn().mockResolvedValue(handle);
  const target = await chooseExcelSaveTarget('report.pdf');
  await expect(exportPdfToExcel({ numPages: 1, getPage: async () => ({
    getTextContent: async () => ({ items: [run('Report text', 40, 700)] }),
  }) }, target)).resolves.toEqual({ saved: true, fallback: false });
  expect(writable.write).toHaveBeenCalledWith(expect.any(Blob));
  expect(writable.close).toHaveBeenCalledTimes(1);
});

test('browsers without Save As support use an xlsx download name', async () => {
  expect(await chooseExcelSaveTarget('RCRI0027.pdf')).toEqual({ fileName: 'RCRI0027.xlsx' });
  expect(excelFileName('bad/name.pdf')).toBe('bad_name.xlsx');
});
