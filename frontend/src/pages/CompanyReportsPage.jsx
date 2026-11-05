import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import ReportPopupModal from '../components/reports-studio/ReportPopupModal';
import PdfViewer from '../components/reports-studio/PdfViewer';
import { fetchCompanyReport, fetchCompanyReports, runCompanyReport, exportCompanyReportExcel } from '../api/companyReportsApi';
import { base64ToPdfBlob } from '../utils/pdfUtils';
import { workbookBase64ToBlob } from '../utils/pdfExcelExport';
import { groupCompanyReports } from '../utils/companyReportCategories';
import '../styles/report-studio.css';
import '../styles/company-reports.css';

const errorText = (error, fallback) =>
  error?.response?.data?.detail || error?.response?.data?.message || error?.message || fallback;

const formatDate = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

const previousMonthClamped = (date) => {
  const first = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay));
};

const initialValues = (parameters) => {
  const today = new Date();
  const previousMonth = previousMonthClamped(today);
  return Object.fromEntries(parameters.map((parameter) => {
    const identity = `${parameter.displayName || ''} ${parameter.paramName || ''}`.toLowerCase();
    if (parameter.paramType === 'date' && /from.?date|date.?from|start.?date/.test(identity)) {
      return [parameter.paramName, formatDate(previousMonth)];
    }
    if (parameter.paramType === 'date' && /to.?date|date.?to|end.?date/.test(identity)) {
      return [parameter.paramName, formatDate(today)];
    }
    return [parameter.paramName, parameter.defaultValue || ''];
  }));
};

export default function CompanyReportsPage() {
  const { company } = useAuth();
  const companyId = company?.companyId ?? company?.CompanyId;
  const activeCompanyId = useRef(companyId);
  activeCompanyId.current = companyId;
  const [catalog, setCatalog] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const listRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [preview, setPreview] = useState({ fileName: '', url: '' });
  const [loading, setLoading] = useState({ catalog: true, detail: false, run: false });
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setCatalog([]);
    setCategoryId('all');
    setQuery('');
    setSelected(null);
    setMessage('');
    setPreview({ fileName: '', url: '' });
    setLoading((current) => ({ ...current, catalog: true }));
    fetchCompanyReports()
      .then((result) => { if (active) setCatalog(result.items || []); })
      .catch((error) => { if (active) setMessage(errorText(error, 'Could not load company reports.')); })
      .finally(() => { if (active) setLoading((current) => ({ ...current, catalog: false })); });
    return () => { active = false; };
  }, [companyId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query, categoryId]);

  useEffect(() => () => {
    if (preview.url) URL.revokeObjectURL(preview.url);
  }, [preview.url]);

  const groups = useMemo(() => groupCompanyReports(catalog, query), [catalog, query]);
  const visibleGroups = groups.filter((group) =>
    group.reports.length && (categoryId === 'all' || group.id === categoryId));
  const matchingCount = groups.reduce((count, group) => count + group.reports.length, 0);
  const visibleCount = visibleGroups.reduce((count, group) => count + group.reports.length, 0);
  const activeCategory = groups.find((group) => group.id === categoryId);

  const openReport = async (code) => {
    const requestedCompanyId = companyId;
    setMessage('');
    setLoading((current) => ({ ...current, detail: true }));
    try {
      const detail = await fetchCompanyReport(code);
      if (activeCompanyId.current !== requestedCompanyId) return;
      setValues(initialValues(detail.parameters || []));
      setSelected(detail);
    } catch (error) {
      if (activeCompanyId.current === requestedCompanyId) {
        setMessage(errorText(error, 'Could not load report parameters.'));
      }
    } finally {
      setLoading((current) => ({ ...current, detail: false }));
    }
  };

  const runSelected = async () => {
    if (!selected) return;
    const exportContext = { companyId, code: selected.report.code, parameters: { ...values } };
    setMessage('');
    setLoading((current) => ({ ...current, run: true }));
    try {
      const result = await runCompanyReport(exportContext.code, exportContext.parameters);
      if (activeCompanyId.current !== exportContext.companyId) return;
      const url = URL.createObjectURL(base64ToPdfBlob(result.pdfBase64));
      setPreview({ fileName: result.fileName || `${exportContext.code}.pdf`, url, exportContext });
      setSelected(null);
    } catch (error) {
      if (activeCompanyId.current === exportContext.companyId) setMessage(errorText(error, 'Could not generate the report.'));
    } finally {
      setLoading((current) => ({ ...current, run: false }));
    }
  };

  const exportPreviewExcel = async (format = 'data-only') => {
    const context = preview.exportContext;
    if (!context || activeCompanyId.current !== context.companyId) {
      throw Object.assign(new Error('The selected company changed. Run the report again.'), { name: 'AbortError' });
    }
    const result = await exportCompanyReportExcel(context.code, context.parameters, format);
    if (activeCompanyId.current !== context.companyId) throw Object.assign(new Error('Export cancelled.'), { name: 'AbortError' });
    return workbookBase64ToBlob(result.workbookBase64);
  };

  return (
    <div className="rs-window company-reports-page">
      <header className="rs-window__titlebar company-reports-page__title">
        <div>
          <h1>Company Reports</h1>
          <p>Live reports for {company?.companyName || company?.CompanyName || 'the selected company'}</p>
        </div>
        <span className="rs-badge">{catalog.length} reports</span>
      </header>
      <main className="company-reports-page__body">
        <section className="rs-card company-reports-page__card">
          <div className="rs-card__header">
            <h3>Browse reports by category</h3>
            <div className="company-reports-page__search">
              <input
                aria-label="Search company reports"
                type="search"
                placeholder="Search report name, code or category"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? <button type="button" className="rs-btn" onClick={() => setQuery('')}>Clear search</button> : null}
            </div>
          </div>
          {message ? <div className="rs-message is-error" role="alert">{message}</div> : null}
          {loading.catalog ? <div className="company-reports-page__empty">Loading company reports...</div> : null}
          {!loading.catalog ? (
            <div className="company-reports-page__browser">
              <nav className="company-reports-page__categories" aria-label="Report categories">
                <button type="button" className="company-reports-page__category"
                  aria-pressed={categoryId === 'all'} onClick={() => setCategoryId('all')}>
                  <span>All Reports</span><small>{query ? `${matchingCount} / ` : ''}{catalog.length}</small>
                </button>
                {groups.map((group) => (
                  <button key={group.id} type="button" className="company-reports-page__category"
                    aria-pressed={categoryId === group.id} onClick={() => setCategoryId(group.id)}>
                    <span>{group.label}</span><small>{query ? `${group.reports.length} / ` : ''}{group.total}</small>
                  </button>
                ))}
              </nav>
              <div className="company-reports-page__results">
                <div className="company-reports-page__summary" role="status" aria-live="polite">
                  <strong>{activeCategory?.label || 'All Reports'}</strong>
                  <span>{visibleCount} {visibleCount === 1 ? 'report' : 'reports'}{query ? ' found' : ''}</span>
                </div>
                <div className="company-reports-page__list" ref={listRef} aria-busy={loading.detail}>
                  {!visibleCount ? (
                    <div className="company-reports-page__empty">
                      <p>{catalog.length ? 'No reports match your current search and category.' : 'No company reports are available.'}</p>
                      {query || categoryId !== 'all' ? (
                        <button type="button" className="rs-btn" onClick={() => { setQuery(''); setCategoryId('all'); }}>Show all reports</button>
                      ) : null}
                    </div>
                  ) : null}
                  {visibleGroups.map((group) => (
                    <section key={group.id} className="company-reports-page__group" aria-labelledby={`report-category-${group.id}`}>
                      <header className="company-reports-page__group-heading">
                        <div><h4 id={`report-category-${group.id}`}>{group.label}</h4><p>{group.description}</p></div>
                        <span className="company-reports-page__count">{group.reports.length}</span>
                      </header>
                      {group.reports.map((report) => (
                        <button key={report.code} type="button" className="company-reports-page__row"
                          onClick={() => openReport(report.code)} disabled={loading.detail}>
                          <span>{report.name}</span><small>{report.code}<span aria-hidden="true"> ›</span></small>
                        </button>
                      ))}
                    </section>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>
      <ReportPopupModal
        isOpen={Boolean(selected)}
        report={selected ? { reportName: selected.report.name, reportCode: selected.report.code, reportType: 'Crystal' } : null}
        parameters={selected?.parameters || []}
        values={values}
        isRunning={loading.run}
        errorMessage={message}
        onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
        onClose={() => setSelected(null)}
        onRun={runSelected}
      />
      <PdfViewer
        onExportExcel={exportPreviewExcel}
        fileName={preview.fileName}
        previewUrl={preview.url}
        isOpen={Boolean(preview.url)}
        onClose={() => setPreview({ fileName: '', url: '' })}
        onOpen={() => window.open(preview.url, '_blank', 'noopener,noreferrer')}
      />
    </div>
  );
}
