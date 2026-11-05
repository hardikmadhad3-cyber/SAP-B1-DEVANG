import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchDocumentLogisticsOptions, fetchDocumentChannel } from '../api/documentLogisticsApi';
import { getDocumentAddressEditChanges } from '../utils/documentLogisticsChanges';
export default function useDocumentLogistics({ header = {}, onHeaderChange, addressMode = 'sales' }) {
  const { company, user } = useAuth();
  const scope = [company?.companyId, company?.dbName, user?.userId || user?.UserId || user?.username].join(':');
  const [state, setState] = useState({});
  const [channelState, setChannelState] = useState({});
  const [revision, setRevision] = useState(0);
  const channelCode = String(header.bpChannelCode || header.bpChannelName || '').trim();
  const callback = useRef(onHeaderChange);
  callback.current = onHeaderChange;
  useEffect(() => {
    let current = true;
    fetchDocumentLogisticsOptions().then(data => { if (current) setState({ ...data, scope }); })
      .catch(() => { if (current) setState({ scope, shippingTypes: [], languages: [], errors: { shippingTypes: 'Lookup unavailable', languages: 'Lookup unavailable' } }); });
    return () => { current = false; };
  }, [scope, revision]);
  useEffect(() => {
    let current = true;
    if (!channelCode) { setChannelState({ scope, code: '', contacts: [] }); return undefined; }
    fetchDocumentChannel(channelCode).then(data => { if (current) setChannelState({ ...data, scope, code: channelCode }); })
      .catch(() => { if (current) setChannelState({ scope, code: channelCode, contacts: [], error: 'Channel contacts unavailable' }); });
    return () => { current = false; };
  }, [scope, channelCode, revision]);
  const emit = useCallback((name, value) => callback.current?.({ target: { name, value, type: 'text' } }), []);
  const handleChange = useCallback(event => {
    const { name, value } = event.target;
    callback.current?.(event);
    Object.entries(getDocumentAddressEditChanges(name, value, { mode: addressMode })).forEach(([key, next]) => { if (key !== name) emit(key, next); });
  }, [emit, addressMode]);
  const data = state.scope === scope ? state : {};
  return { handleChange, emit, shippingOptions: data.shippingTypes || [], languageOptions: data.languages || [],
    channel: channelState.scope === scope && channelState.code === channelCode ? channelState : {},
    errors: data.errors || {}, loading: state.scope !== scope, retry: () => setRevision(value => value + 1),
    selectChannel: partner => { emit('bpChannelCode', partner?.CardCode || ''); emit('bpChannelName', partner?.CardName || ''); emit('bpChannelContact', ''); } };
}
