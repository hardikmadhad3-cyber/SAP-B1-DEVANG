import apiClient from './client';

export const fetchCompanyReports = () =>
  apiClient.get('/company-reports').then((response) => response.data);

export const fetchCompanyReport = (code) =>
  apiClient.get(`/company-reports/${encodeURIComponent(code)}`).then((response) => response.data);

export const runCompanyReport = (code, parameters) =>
  apiClient.post(`/company-reports/${encodeURIComponent(code)}/run`, { parameters })
    .then((response) => response.data);

export const exportCompanyReportExcel = (code, parameters, format = 'data-only') =>
  apiClient.post(`/company-reports/${encodeURIComponent(code)}/excel`, { parameters, format }, { timeout: 150000 })
    .then((response) => response.data);
