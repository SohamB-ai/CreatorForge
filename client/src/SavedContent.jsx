import { useEffect, useId, useRef, useState } from 'react';
import { Download, LoaderCircle, Pencil, Save } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, errorText } from './api.js';
import './SavedContent.css';

export default function SavedContent({ projectId, assetId, onSaved, onDirtyChange }) {
  const [asset, setAsset] = useState(null);
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState('');
  const [version, setVersion] = useState(0);
  const [limit, setLimit] = useState(60000);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [format, setFormat] = useState('markdown');
  const [reload, setReload] = useState(0);
  const callbacks = useRef({ onSaved, onDirtyChange });
  const mounted = useRef(false);
  const editorId = useId();
  const formatId = useId();
  callbacks.current = { onSaved, onDirtyChange };
  const dirty = content !== saved;
  const bytes = new TextEncoder().encode(content).length;
  const endpoint = `/projects/${projectId}/media/${assetId}`;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; callbacks.current.onDirtyChange?.(false); }; }, []);
  useEffect(() => {
    callbacks.current.onDirtyChange?.(dirty);
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    if (dirty) window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setLoading(true); setError('');
    api.get(`${endpoint}/edit`, { signal: abort.signal }).then(({ data }) => {
      if (active) { setAsset(data.asset); setContent(data.content); setSaved(data.content); setVersion(data.version); setLimit(data.maxEditBytes); setEditing(false); }
    }).catch((failure) => active && setError(errorText(failure))).finally(() => active && setLoading(false));
    return () => { active = false; abort.abort(); };
  }, [endpoint, reload]);
  async function save() {
    if (busy || !dirty || bytes === 0 || bytes > limit) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.patch(endpoint, { content, version });
      if (mounted.current) { setSaved(data.content); setContent(data.content); setVersion(data.version); setAsset(data.asset); callbacks.current.onSaved?.(data.asset); }
    } catch (failure) { if (mounted.current) setError(errorText(failure)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function download() {
    if (busy || dirty) return;
    setBusy(true); setError('');
    try {
      const response = await api.get(`${endpoint}/export`, { params: { format }, responseType: 'blob' });
      if (!mounted.current) return;
      const match = response.headers['content-disposition']?.match(/filename\*=UTF-8''(.+)$/);
      const filename = match ? decodeURIComponent(match[1]) : `CreatorForge-content.${format === 'markdown' ? 'md' : 'txt'}`;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { if (mounted.current) setError(errorText(failure)); }
    finally { if (mounted.current) setBusy(false); }
  }
  function reloadSaved() {
    if (!dirty || window.confirm('Discard your unsaved changes and reload the saved version?')) setReload((value) => value + 1);
  }
  if (loading) return <p role="status"><LoaderCircle className="spin" size={16} /> Loading saved content…</p>;
  if (!asset) return <div><p className="inline-error" role="alert">{error}</p><button className="button secondary" onClick={reloadSaved}>Retry loading content</button></div>;
  return <section className="saved-content" aria-label="Saved content editor">
    <div className="saved-content-toolbar"><span role="status">{busy ? 'Working…' : dirty ? 'Unsaved changes' : 'Saved to project'}</span><button className="button secondary small" disabled={busy || (!editing && bytes > limit)} onClick={() => setEditing((value) => !value)}><Pencil size={14} />{editing ? 'Preview content' : 'Edit content'}</button></div>
    {editing ? <div className="field"><label htmlFor={editorId}>Edit saved content</label><textarea id={editorId} rows={14} value={content} onChange={(event) => setContent(event.target.value)} disabled={busy} /><small>{bytes.toLocaleString()} / {limit.toLocaleString()} bytes</small></div> : asset.mimeType === 'text/markdown' ? <div className="markdown"><Markdown remarkPlugins={[remarkGfm]}>{content || '_This asset is empty._'}</Markdown></div> : <pre className="text-preview">{content || 'This asset is empty.'}</pre>}
    {bytes > limit && <p className="inline-error" role="alert">This asset exceeds the 60 KB editing limit. You can still preview and export the saved content.</p>}
    {bytes === 0 && editing && <p className="inline-error" role="alert">Content cannot be empty. Enter text or discard your changes.</p>}
    {dirty && <div className="saved-content-actions"><button className="button primary small" disabled={busy || bytes === 0 || bytes > limit} onClick={save}><Save size={14} />Save changes</button><button className="button secondary small" disabled={busy} onClick={() => { setContent(saved); setError(''); }}>Discard changes</button></div>}
    <div className="saved-content-export"><div className="field"><label htmlFor={formatId}>Export format</label><select id={formatId} value={format} disabled={busy} onChange={(event) => setFormat(event.target.value)}><option value="markdown">Markdown (.md)</option><option value="text">Plain text (.txt)</option></select></div><button className="button secondary small" disabled={busy || dirty} onClick={download}><Download size={14} />Download saved content</button></div>
    {dirty && <p className="muted">Save or discard your edits before downloading.</p>}
    {error && <div><p className="inline-error" role="alert">{error}</p><button className="button secondary small" disabled={busy} onClick={reloadSaved}>Reload saved version</button></div>}
  </section>;
}
