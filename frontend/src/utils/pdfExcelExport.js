export const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const excelFileName = (name = 'report.pdf') => {
  const base = Array.from(String(name || 'report'), (character) =>
    character.charCodeAt(0) < 32 ? '_' : character).join('').replace(/\.(pdf|xlsx?)$/i, '')
    .replace(/[<>:"/\\|?*]/g, '_').replace(/[. ]+$/g, '').trim();
  return `${base || 'report'}.xlsx`;
};

export async function chooseExcelSaveTarget(name) {
  const fileName = excelFileName(name);
  if (typeof window.showSaveFilePicker !== 'function') return { fileName };
  try {
    const handle = await window.showSaveFilePicker({
      id: 'sap-b1-report-excel', suggestedName: fileName,
      types: [{ description: 'Excel workbook', accept: { [EXCEL_MIME_TYPE]: ['.xlsx'] } }],
      excludeAcceptAllOption: true,
    });
    return { fileName, handle };
  } catch (error) {
    if (error?.name === 'AbortError') return { cancelled: true };
    throw error;
  }
}

// PDF text runs are positioned, not tabular data. Reconstruct lines first, then
// use the most detailed line as column boundaries, retaining empty cells.
// Keep strings as strings: account codes/leading zeroes and formula-like report
// text must not become numbers or executable spreadsheet formulas.
export function pdfTextToRows(items) {
  const runs = items.filter((item) => typeof item.str === 'string' && item.str.trim()
    && Array.isArray(item.transform) && item.transform.every(Number.isFinite))
    .map((item) => ({
      text: item.str, x: item.transform[4], y: item.transform[5],
      width: Math.abs(Number(item.width) || 0),
      height: Math.hypot(item.transform[2], item.transform[3]) || 10,
    })).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  runs.forEach((run) => {
    let line = lines[lines.length - 1];
    const tolerance = Math.max(1, Math.min(3, run.height * 0.2));
    if (!line || Math.abs(line.y - run.y) > tolerance) {
      line = { y: run.y, runs: [] };
      lines.push(line);
    }
    line.runs.push(run);
  });
  const rows = lines.map((line) => {
    const cells = [];
    line.runs.sort((a, b) => a.x - b.x).forEach((run) => {
      const last = cells[cells.length - 1];
      const gap = last ? run.x - last.end : Infinity;
      if (last && gap <= Math.max(3, run.height * 0.45)) {
        const separator = gap > 0.5 && !/\s$/.test(last.text) && !/^\s/.test(run.text) ? ' ' : '';
        last.text += separator + run.text;
        last.end = Math.max(last.end, run.x + run.width);
      } else cells.push({ text: run.text, x: run.x, end: run.x + run.width });
    });
    return cells;
  });
  const reference = rows.reduce((best, row) => row.length > best.length ? row : best, []);
  const boundaries = reference.slice(1).map((cell, index) => (reference[index].end + cell.x) / 2);
  return rows.map((cells) => {
    const row = Array(reference.length).fill('');
    cells.forEach((cell) => {
      let column = boundaries.findIndex((boundary) => cell.x < boundary);
      if (column < 0) column = boundaries.length;
      row[column] = row[column] ? `${row[column]} ${cell.text.trim()}` : cell.text.trim();
    });
    return row;
  });
}

const assertActive = (isActive) => {
  if (!isActive()) throw Object.assign(new Error('Export cancelled.'), { name: 'AbortError' });
};

export async function buildPdfWorkbook(pdf, { isActive = () => true, onProgress = () => {} } = {}) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  let textCount = 0;
  for (let number = 1; number <= pdf.numPages; number += 1) {
    assertActive(isActive);
    onProgress(number, pdf.numPages);
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    assertActive(isActive);
    const rows = pdfTextToRows(content.items || []);
    textCount += rows.length;
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = Array.from({ length: rows[0]?.length || 1 }, (_, column) => ({
      wch: Math.min(70, Math.max(12, ...rows.map((row) => Math.min(70, String(row[column] || '').length + 2)))),
    }));
    XLSX.utils.book_append_sheet(workbook, sheet, `Page ${number}`);
  }
  if (!textCount) throw new Error('This report has no selectable text to export to Excel. Download the PDF instead.');
  workbook.Props = { Title: 'Report export', Comments: 'Text extracted from the displayed report, one worksheet per PDF page. Formatting may differ. Values are preserved as text.' };
  assertActive(isActive);
  return new Blob([XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true })], { type: EXCEL_MIME_TYPE });
}

export async function exportPdfToExcel(pdf, target, options = {}) {
  if (target.cancelled) return { saved: false };
  const blob = await buildPdfWorkbook(pdf, options);
  assertActive(options.isActive || (() => true));
  return saveExcelBlobToTarget(blob, target);
}

export function workbookBase64ToBlob(base64) {
  if (typeof base64 !== 'string' || !base64) throw new Error('The Excel response is empty.');
  const text = atob(base64);
  if (!text.startsWith('PK')) throw new Error('The server did not return a valid Excel workbook.');
  return new Blob([Uint8Array.from(text, (character) => character.charCodeAt(0))], { type: EXCEL_MIME_TYPE });
}

export async function saveExcelBlobToTarget(blob, target) {
  if (target.cancelled) return { saved: false };
  if (target.handle) {
    const writable = await target.handle.createWritable();
    try { await writable.write(blob); } finally { await writable.close(); }
  } else {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = target.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { saved: true, fallback: !target.handle };
}
