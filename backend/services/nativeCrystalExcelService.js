const reportCompatibility = require('./companyReportCompatibilityService');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const dbService = require('./dbService');
const companyConfigService = require('./companyConfigService');

const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });
let running = 0;

const runWorker = (request) => new Promise((resolve, reject) => {
  const worker = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, '../scripts/exportCrystalExcel.ps1')],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; worker.kill(); }, 120000);
  worker.stdout.resume();
  worker.stderr.resume();
  worker.on('error', () => { clearTimeout(timer); reject(fail(503, 'Native Crystal Reports Excel export is unavailable on this server.')); });
  worker.stdin.on('error', () => {});
  worker.on('close', (code) => {
    clearTimeout(timer);
    if (timedOut) reject(fail(504, 'Excel export timed out. Try a shorter date range.'));
    else if (code === 0) resolve();
    else reject(fail(422, 'Crystal Reports could not export Excel. Check the report parameters and the selected companyâ€™s native report connection.'));
  });
  worker.stdin.end(JSON.stringify(request));
});

async function exportNativeReport({ docCode, parameters = [], format = 'data-only' }) {
  if (!/^RCRI\d+$/i.test(docCode || '')) throw fail(400, 'Invalid company report code.');
  if (!['data-only', 'report-layout', 'pdf'].includes(format)) throw fail(400, 'Choose Excel Data-Only or Report layout.');
  if (process.platform !== 'win32') throw fail(503, 'Native Crystal Excel export requires a Windows server with the Crystal Reports runtime.');
  if (running >= 2) throw fail(503, 'Excel exports are busy. Please try again shortly.');
  running += 1;
  let directory;
  try {
    const config = await companyConfigService.getActiveCompanyConfig();
    const sql = config.sql;
    if (!config.companyId || !sql?.database || sql.dialect !== 'sqlserver') {
      throw fail(422, 'Native Excel export needs a selected company with a supported SQL Server report connection.');
    }
    if (sql.database.toLowerCase() !== String(config.reportService.companyDb || '').toLowerCase()) {
      throw fail(422, 'The report service and SQL connection must use the same selected company database for native Excel export.');
    }
    const metadata = await dbService.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RDOC' AND COLUMN_NAME = 'Template'");
    if (!metadata.recordset?.length) throw fail(422, 'The selected company does not expose its Crystal report template for native Excel export.');
    const result = await dbService.query("SELECT Template FROM RDOC WHERE DocCode = @code AND TypeCode = 'RCRI' AND Category = 'C' AND Status = 'A'", { code: docCode });
    const template = result.recordset?.[0]?.Template;
    if (!Buffer.isBuffer(template) || !template.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'))) {
      throw fail(422, 'A valid active Crystal report template was not found in the selected company.');
    }
    const correction = await reportCompatibility.resolveCorrection(config, docCode, template);
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sap-native-excel-'));
    const reportPath = path.join(directory, 'report.rpt');
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    const outputPath = path.join(directory, `report.${extension}`);
    await fs.writeFile(reportPath, correction?.template || template);
    let server = sql.server;
    if (sql.instanceName && !server.includes('\\')) server += `\\${sql.instanceName}`;
    else if (sql.port && !server.includes('\\')) server += `,${sql.port}`;
    await runWorker({ reportPath, outputPath, sql: { server, database: sql.database, user: sql.user, password: sql.password, encrypt: sql.encrypt, trustServerCertificate: sql.trustServerCertificate }, parameters, format, commandOverride: correction?.commandOverride });
    const workbook = await fs.readFile(outputPath);
    if (format === 'pdf') {
      if (workbook.subarray(0, 5).toString() !== '%PDF-') throw fail(502, 'Crystal Reports returned an invalid PDF.');
      return { fileName: `${docCode}.pdf`, base64Pdf: workbook.toString('base64'), mimeType: 'application/pdf' };
    }
    if (workbook.length < 4 || workbook.subarray(0, 2).toString() !== 'PK') throw fail(502, 'Crystal Reports returned an invalid Excel workbook.');
    return { fileName: `${docCode}.xlsx`, workbookBase64: workbook.toString('base64') };
  } finally {
    running -= 1;
    if (directory && path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir())
      && path.basename(directory).startsWith('sap-native-excel-')) {
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
}

const exportReportExcel = async (input = {}) => {
  if (input.format && !['data-only', 'report-layout'].includes(input.format)) throw fail(400, 'Choose Excel Data-Only or Report layout.');
  return exportNativeReport(input);
};
const exportReportPdf = input => exportNativeReport({ ...input, format: 'pdf' });
const hasPdfCorrection = async docCode => reportCompatibility.hasCorrection(await companyConfigService.getActiveCompanyConfig(), docCode);
const getReportParameterOverrides = async docCode => reportCompatibility.getParameterOverrides(await companyConfigService.getActiveCompanyConfig(), docCode);
module.exports = { exportReportExcel, exportReportPdf, hasPdfCorrection, getReportParameterOverrides };
