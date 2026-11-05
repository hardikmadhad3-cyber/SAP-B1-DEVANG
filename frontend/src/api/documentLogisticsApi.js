import apiClient from './client';
export const fetchDocumentLogisticsOptions = () => apiClient.get('/document-logistics/options').then(result => result.data);
export const fetchDocumentChannels = (query, { top = 50, skip = 0 } = {}) => apiClient.get('/document-logistics/channels', { params: { query, top, skip } }).then(result => result.data);
export const fetchDocumentChannel = code => apiClient.get('/document-logistics/channels/' + encodeURIComponent(code)).then(result => result.data);
