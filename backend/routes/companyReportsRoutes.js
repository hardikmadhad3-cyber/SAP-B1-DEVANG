const express = require('express');
const service = require('../services/companyReportsService');

const router = express.Router();
const respond = (handler) => async (req, res, next) => {
  try {
    res.json(await handler(req));
  } catch (error) {
    next(error);
  }
};

router.get('/company-reports', respond((req) => service.listCompanyReports(req.auth)));
router.get('/company-reports/:code', respond((req) => service.getCompanyReport(req.auth, req.params.code)));
router.post('/company-reports/:code/run', respond((req) =>
  service.runCompanyReport(req.auth, req.params.code, req.body?.parameters || {})));
router.post('/company-reports/:code/excel', respond((req) =>
  service.exportCompanyReportExcel(req.auth, req.params.code, req.body?.parameters || {}, req.body?.format)));

module.exports = router;
