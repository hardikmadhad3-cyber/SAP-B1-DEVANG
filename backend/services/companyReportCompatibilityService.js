const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const connectionKey = sql => [sql?.dialect, sql?.server, sql?.instanceName || '', sql?.port || '', sql?.database]
  .map(value => String(value || '').trim().toLowerCase()).join('|');

const createReportCompatibilityService = ({ root = path.join(__dirname, '../report-overrides'), readFile = fs.readFile } = {}) => {
  const find = async (config, docCode) => {
    if (!config?.companyId || config.sql?.dialect !== 'sqlserver') return null;
    let manifest;
    try { manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw fail(500, 'The deployed report compatibility configuration is unavailable.'); }
    const company = (manifest.companies || []).find(item => connectionKey(item.connection) === connectionKey(config.sql));
    return company?.reports?.[String(docCode || '').toUpperCase()] || null;
  };
  return {
    hasCorrection: async (config, docCode) => Boolean(await find(config, docCode)),
    getParameterOverrides: async (config, docCode) => (await find(config, docCode))?.parameterOverrides || [],
    resolveCorrection: async (config, docCode, sourceTemplate) => {
      const profile = await find(config, docCode);
      if (!profile) return null;
      if (hash(sourceTemplate) !== profile.sourceSha256) throw fail(409, 'This SAP report definition changed. Its local compatibility correction must be reviewed again.');
      let template = sourceTemplate;
      if (profile.templatePath) {
        const file = path.resolve(root, profile.templatePath);
        const relative = path.relative(path.resolve(root), file);
        if (relative.startsWith('..') || path.isAbsolute(relative)) throw fail(500, 'Invalid deployed report template path.');
        template = await readFile(file);
        if (hash(template) !== profile.templateSha256) throw fail(500, 'The deployed report template failed its integrity check.');
      }
      return { template, commandOverride: profile.commandOverride };
    },
  };
};
module.exports = { ...createReportCompatibilityService(), createReportCompatibilityService, connectionKey };
