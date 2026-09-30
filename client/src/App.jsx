import { cloneElement, createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUp, AudioLines, Check, ChevronRight, Copy, FileText, Flame, Folder, Image, LayoutGrid, LoaderCircle, LogOut, MessageSquare, Moon, MoreHorizontal, Palette, Pencil, Plus, Search, Sparkles, Sun, Trash2, Upload, Video, WandSparkles, X } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, errorText } from './api.js';
import GoogleSignIn from './GoogleSignIn.jsx';
import SavedContent from './SavedContent.jsx';

const Auth = createContext(null);
const Toast = createContext(null);
const fileLimit = 5 * 1024 * 1024;
const mediaIcons = { image: Image, audio: AudioLines, video: Video, document: FileText, text: FileText };
const formats = ['Instagram caption', 'Blog post', 'Video script', 'Tweet thread', 'LinkedIn post', 'Image prompt', 'Summary'];
const defaultBrand = { name: '', tone: 'Professional and conversational', audience: '', keywords: [], colors: [], guidelines: '' };
const sizeLabel = (size) => size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

function Logo() { return <Link className="logo" to="/"><span className="logo-mark"><Flame size={22} /></span>Creator<span className="logo-light">Forge</span></Link>; }
function Spinner({ label = 'Loading your workspace…' }) { return <div className="loading" role="status"><LoaderCircle className="spin" size={22} />{label}</div>; }
function Field({ label, children, hint }) {
  const identifier = useId();
  return <div className="field"><label htmlFor={identifier}>{label}</label>{cloneElement(children, { id: identifier, 'aria-describedby': hint ? `${identifier}-hint` : undefined })}{hint && <small id={`${identifier}-hint`}>{hint}</small>}</div>;
}
function Dialog({ title, onClose, children }) {
  const reference = useRef(null);
  useEffect(() => { const dialog = reference.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={reference} onCancel={(event) => { event.preventDefault(); onClose(); }} className="modal"><div className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</dialog>;
}
function useHealth() {
  const [health, setHealth] = useState(null);
  useEffect(() => { let active = true; api.get('/health').then(({ data }) => active && setHealth(data)).catch(() => active && setHealth({ database: 'disconnected', aiConfigured: false })); return () => { active = false; }; }, []);
  return health;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [light, setLight] = useState(() => localStorage.getItem('creatorforge.theme') === 'light');
  useEffect(() => { document.documentElement.dataset.theme = light ? 'light' : 'dark'; localStorage.setItem('creatorforge.theme', light ? 'light' : 'dark'); }, [light]);
  useEffect(() => {
    const logout = () => { localStorage.removeItem('creatorforge.token'); setUser(null); };
    window.addEventListener('creatorforge.session-expired', logout);
    if (localStorage.getItem('creatorforge.token')) api.get('/auth/me').then(({ data }) => setUser(data)).catch((error) => { if (error.response?.status === 401) logout(); }).finally(() => setLoading(false));
    else setLoading(false);
    return () => window.removeEventListener('creatorforge.session-expired', logout);
  }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 6500); return () => clearTimeout(timer); }, [toast]);
  const auth = {
    user, loading,
    signIn: (data) => { localStorage.setItem('creatorforge.token', data.token); setUser(data.user); },
    logout: () => { localStorage.removeItem('creatorforge.token'); setUser(null); },
    light, toggleTheme: () => setLight((value) => !value),
  };
  return <Auth.Provider value={auth}><Toast.Provider value={(message, kind = 'success') => setToast({ message, kind })}><Routes>
    <Route path="/" element={<Landing />} /><Route path="/login" element={<AuthPage />} /><Route path="/register" element={<AuthPage register />} />
    <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} /><Route path="/project/:id" element={<Protected><Workspace /></Protected>} />
    <Route path="/settings/brandkit" element={<Protected><BrandSettings /></Protected>} /><Route path="*" element={<Navigate to="/" replace />} />
  </Routes>{toast && <div className={`toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>{toast.kind === 'success' && <Check size={18} />}<span>{toast.message}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button></div>}</Toast.Provider></Auth.Provider>;
}
function Protected({ children }) { const auth = useContext(Auth); return auth.loading ? <Spinner /> : auth.user ? children : <Navigate to="/login" replace />; }
function ThemeButton() { const auth = useContext(Auth); return <button className="icon-button" onClick={auth.toggleTheme} aria-label={`Switch to ${auth.light ? 'dark' : 'light'} theme`}>{auth.light ? <Moon size={18} /> : <Sun size={18} />}</button>; }
function Shell({ children, workspace = false }) {
  const auth = useContext(Auth);
  const navigate = useNavigate();
  return <div className={`app-shell ${workspace ? 'workspace-shell' : ''}`}><header className="app-header"><Logo /><nav aria-label="Main navigation"><Link to="/dashboard" className="nav-link" aria-label="Projects"><LayoutGrid size={17} /><span>Projects</span></Link><Link to="/settings/brandkit" className="nav-link" aria-label="Brand kit"><Palette size={17} /><span>Brand kit</span></Link></nav><div className="account"><ThemeButton /><span className="avatar" title={auth.user.name}>{auth.user.name.slice(0, 1).toUpperCase()}</span><button className="icon-button" aria-label="Sign out" onClick={() => { auth.logout(); navigate('/login'); }}><LogOut size={18} /></button></div></header>{children}</div>;
}
function Landing() {
  const auth = useContext(Auth);
  const next = auth.user ? '/dashboard' : '/register';
  return <div className="landing"><header className="landing-header"><Logo /><div className="landing-actions"><ThemeButton /><Link className="text-button" to={auth.user ? '/dashboard' : '/login'}>{auth.user ? 'Your workspace' : 'Sign in'}<ArrowRight size={16} /></Link></div></header><main>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="status-dot" />THE MULTIMODAL CREATIVE WORKSPACE</div><h1>Many sources.<br />One creative<br /><span>direction.</span></h1><p>Your images, voice notes, videos, and briefs belong together. Bring them into one workspace, then turn what you have into what comes next.</p><Link to={next} className="button primary">Start creating <ArrowRight size={18} /></Link><div className="hero-note">Built for creators. Guided by your brand.</div></div><div className="source-board" aria-label="Images, audio, video and documents come together in CreatorForge"><div className="board-header"><span><span className="status-dot" />YOUR CREATIVE INPUTS</span><MoreHorizontal size={18} /></div><div className="source-tile image-tile"><div className="abstract-landscape"><div className="landscape-sun" /><div className="landscape-hill" /></div><span><Image size={15} />Reference images</span></div><div className="source-tile audio-tile"><div className="waveform">{[20, 38, 24, 58, 40, 72, 50, 34, 64, 82, 45, 28, 52, 36, 16].map((height, index) => <i key={index} style={{ height }} />)}</div><span><AudioLines size={15} />Voice & audio</span></div><div className="source-tile doc-tile"><div className="document-lines"><i /><i /><i /><i /></div><span><FileText size={15} />Briefs & documents</span></div><div className="source-tile video-tile"><Video size={40} strokeWidth={1.2} /><span>Video & stories</span></div><div className="board-result"><span className="result-icon"><Sparkles size={21} /></span><div><strong>Context becomes content.</strong><small>Connected ideas. On-brand output.</small></div><ArrowUp size={20} /></div></div></section>
    <section className="feature-strip"><div><span className="feature-number">01</span><Folder size={21} /><h2>Gather your sources</h2><p>Organize mixed media by project. Everything in its place, nothing lost in tabs.</p></div><div><span className="feature-number">02</span><MessageSquare size={21} /><h2>Create with context</h2><p>Ask questions and generate content with AI that sees your project together.</p></div><div><span className="feature-number">03</span><WandSparkles size={21} /><h2>Make it your own</h2><p>Remix one asset into new formats, with your brand voice guiding the way.</p></div></section>
  </main><footer className="landing-footer"><span>CreatorForge</span><span>Forge content from any source.</span></footer></div>;
}
function AuthPage({ register = false }) {
  const auth = useContext(Auth);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');
  if (!auth.loading && auth.user) return <Navigate to="/dashboard" replace />;
  async function submit(event) {
    event.preventDefault();
    if (busy || googleBusy) return;
    setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    try { const { data } = await api.post(register ? '/auth/register' : '/auth/login', Object.fromEntries(form)); auth.signIn(data); navigate('/dashboard'); } catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
  }
  return <div className="auth-page"><header><Logo /><ThemeButton /></header><main className="auth-layout"><aside><div className="eyebrow">YOUR NEXT GREAT IDEA STARTS HERE</div><h1>Less scattered.<br />More creative.</h1><p>A home for your source material and the ideas it inspires.</p><div className="auth-source-icons"><Image /><AudioLines /><Video /><FileText /></div></aside><section className="auth-form"><div className="eyebrow">CREATORFORGE WORKSPACE</div><h2>{register ? 'Make room for your ideas.' : 'Welcome back.'}</h2><p>{register ? 'Create an account to start your first project.' : 'Your projects and creative direction await.'}</p><GoogleSignIn key={register ? 'register' : 'login'} disabled={busy} light={auth.light} onBusyChange={setGoogleBusy} onSuccess={(data) => { auth.signIn(data); navigate('/dashboard'); }} /><form onSubmit={submit}>{register && <Field label="Your name"><input name="name" autoComplete="name" required maxLength={50} placeholder="How should we call you?" /></Field>}<Field label="Email address"><input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></Field><Field label="Password" hint={register ? 'At least 8 characters, up to 72 UTF-8 bytes.' : null}><input name="password" type="password" required minLength={register ? 8 : undefined} autoComplete={register ? 'new-password' : 'current-password'} /></Field>{error && <p className="inline-error" role="alert">{error}</p>}<button disabled={busy || googleBusy} className="button primary full">{busy ? <LoaderCircle className="spin" size={18} /> : null}{register ? 'Create account' : 'Sign in'}<ArrowRight size={18} /></button></form><p className="auth-switch">{register ? 'Already have an account?' : 'New to CreatorForge?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p></section></main></div>;
}
function ProjectForm({ project, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { const { data } = project ? await api.patch(`/projects/${project._id}`, values) : await api.post('/projects', values); onSaved(data); } catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
  }
  return <Dialog title={project ? 'Edit project' : 'A new creative direction'} onClose={onClose}><form onSubmit={submit}><Field label="Project name"><input autoFocus name="name" required maxLength={100} defaultValue={project?.name} placeholder="e.g. Autumn launch campaign" /></Field><Field label="Brief" hint="A little context helps shape better content."><textarea name="description" rows={3} maxLength={500} defaultValue={project?.description} placeholder="What are you creating, and who is it for?" /></Field>{error && <p className="inline-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy && <LoaderCircle className="spin" size={16} />}{project ? 'Save changes' : 'Create project'}</button></div></form></Dialog>;
}
function DeleteDialog({ name, onClose, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Dialog title="Delete this project?" onClose={onClose}><p className="muted">“{name}” and all of its media and chat history will be permanently deleted.</p>{error && <p role="alert" className="inline-error">{error}</p>}<div className="modal-actions"><button className="button secondary" onClick={onClose}>Keep project</button><button className="button danger" disabled={busy} onClick={async () => { setBusy(true); try { await onDelete(); } catch (failure) { setError(errorText(failure)); setBusy(false); } }}>Delete project</button></div></Dialog>;
}
function Dashboard() {
  const auth = useContext(Auth);
  const notify = useContext(Toast);
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  async function load() { setLoading(true); setError(''); try { setProjects((await api.get('/projects')).data); } catch (failure) { setError(errorText(failure)); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const visible = projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(search.toLowerCase()));
  return <Shell><main className="dashboard"><div className="page-title"><div><div className="eyebrow">YOUR CREATIVE HOME</div><h1>Let's make something, {auth.user.name.split(' ')[0]}.</h1><p>Every great piece of content starts with a place for your ideas.</p></div><button className="button primary" onClick={() => setDialog({ type: 'create' })}><Plus size={18} />New project</button></div><div className="section-toolbar"><div><h2>Projects <span className="count">{projects.length}</span></h2></div><label className="search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search projects" placeholder="Search projects…" /></label></div>{loading ? <Spinner /> : error ? <div className="empty-state"><p className="inline-error" role="alert">{error}</p><button className="button secondary" onClick={load}>Try again</button></div> : !projects.length ? <div className="empty-state"><div className="empty-illustration"><Folder size={42} strokeWidth={1.25} /><span><Plus size={17} /></span></div><h2>A blank canvas. A world of possibilities.</h2><p>Create a project, bring in your source material,<br className="desktop-only" /> and give your next idea a home.</p><button className="button primary" onClick={() => setDialog({ type: 'create' })}><Plus size={17} />Create your first project</button><div className="supported-formats"><Image size={17} />Images <AudioLines size={17} />Audio <Video size={17} />Video <FileText size={17} />Documents</div></div> : visible.length ? <div className="project-grid">{visible.map((project) => <article className="project-card" key={project._id}><Link to={`/project/${project._id}`} className="project-main"><div className="project-symbol"><Folder size={24} strokeWidth={1.4} /></div><h3>{project.name}</h3><p>{project.description || 'Your next creative direction starts here.'}</p><div className="project-stats"><span><FileText size={14} />{project.mediaCount || 0} assets</span><span><MessageSquare size={14} />{project.messageCount || 0} messages</span></div></Link><div className="project-footer"><span>Updated {new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><div><button className="icon-button" aria-label={`Edit ${project.name}`} onClick={() => setDialog({ type: 'edit', project })}><Pencil size={15} /></button><button className="icon-button" aria-label={`Delete ${project.name}`} onClick={() => setDialog({ type: 'delete', project })}><Trash2 size={15} /></button></div></div></article>)}</div> : <p className="muted">No projects match “{search}”.</p>}<div className="dashboard-tip"><Palette size={20} /><div><strong>Your voice, in every creation.</strong><p>Set up your brand kit to keep all your AI-generated content on-brand.</p></div><Link to="/settings/brandkit">Set up brand kit <ArrowRight size={16} /></Link></div></main>{dialog?.type === 'create' || dialog?.type === 'edit' ? <ProjectForm project={dialog.project} onClose={() => setDialog(null)} onSaved={(project) => { setDialog(null); if (dialog.type === 'create') navigate(`/project/${project._id}`); else load(); notify(dialog.type === 'create' ? 'Project created.' : 'Project updated.'); }} /> : dialog?.type === 'delete' ? <DeleteDialog name={dialog.project.name} onClose={() => setDialog(null)} onDelete={async () => { await api.delete(`/projects/${dialog.project._id}`); setDialog(null); await load(); notify('Project deleted.'); }} /> : null}</Shell>;
}
function MediaPreview({ asset, projectId, onClose, onSaved }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const dirty = useRef(false);
  useEffect(() => {
    if (asset.type === 'text') return;
    let active = true;
    let objectUrl;
    api.get('/projects/' + projectId + '/media/' + asset._id + '/content', { responseType: 'blob' }).then(({ data }) => {
      objectUrl = URL.createObjectURL(data);
      if (active) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl);
    }).catch((failure) => active && setError(errorText(failure)));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [asset._id, projectId, asset.type]);
  function close() { if (!dirty.current || window.confirm('Discard unsaved content changes?')) onClose(); }
  return <Dialog title={asset.name} onClose={close}>{asset.type === 'text' ? <SavedContent projectId={projectId} assetId={asset._id} onSaved={onSaved} onDirtyChange={(value) => { dirty.current = value; }} /> : error ? <p role="alert" className="inline-error">{error}</p> : !url ? <Spinner /> : asset.type === 'image' ? <img className="preview-image" src={url} alt={asset.name} /> : asset.type === 'audio' ? <audio controls src={url} /> : asset.type === 'video' ? <video className="preview-video" controls src={url} /> : <iframe className="preview-pdf" title={asset.name} src={url} />}</Dialog>;
}
function Workspace() {
  const { id } = useParams();
  const notify = useContext(Toast);
  const health = useHealth();
  const [project, setProject] = useState(null);
  const [media, setMedia] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('chat');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [source, setSource] = useState('');
  const [format, setFormat] = useState(formats[0]);
  const [instructions, setInstructions] = useState('');
  const [outputAssetId, setOutputAssetId] = useState('');
  const [outputDirty, setOutputDirty] = useState(false);
  const [editProject, setEditProject] = useState(false);
  const fileInput = useRef(null);
  const chatEnd = useRef(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([api.get(`/projects/${id}`), api.get(`/projects/${id}/media`), api.get(`/projects/${id}/messages`)]).then(([details, assets, history]) => { if (active) { setProject(details.data); setMedia(assets.data); setMessages(history.data); } }).catch((failure) => active && setError(errorText(failure))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [messages, pending]);
  async function uploadFiles(files) {
    if (uploading) return;
    setUploading(true); setDragging(false);
    for (const file of files) {
      if (file.size > fileLimit) { notify(`${file.name} exceeds the 5 MB limit.`, 'error'); continue; }
      const payload = new FormData();
      const extension = file.name.split('.').pop().toLowerCase();
      const textType = { txt: 'text/plain', md: 'text/markdown', csv: 'text/csv' }[extension];
      payload.append('file', textType ? new File([file], file.name, { type: textType }) : file);
      setProgress(0);
      try { const { data } = await api.post(`/projects/${id}/media`, payload, { onUploadProgress: (event) => setProgress(event.total ? Math.round(event.loaded / event.total * 100) : 0) }); setMedia((assets) => [data, ...assets]); notify(`${file.name} uploaded.`); } catch (failure) { notify(errorText(failure), 'error'); }
    }
    setUploading(false); if (fileInput.current) fileInput.current.value = '';
  }
  async function send(event, prompt) {
    event?.preventDefault();
    const message = (prompt || input).trim();
    if (!message || busy) return;
    setBusy(true); setPending(message);
    try { const { data } = await api.post('/chat', { projectId: id, message }); setMessages((history) => [...history, data.userMessage, data.assistantMessage]); setInput(''); } catch (failure) { notify(errorText(failure), 'error'); } finally { setBusy(false); setPending(''); }
  }
  async function remix(event) {
    event.preventDefault();
    if (outputDirty && !window.confirm('Discard unsaved edits and create a new remix?')) return;
    setBusy(true);
    try { const { data } = await api.post('/remix', { projectId: id, mediaId: source, format, instructions }); setOutputAssetId(data.mediaId); setOutputDirty(false); setMedia((await api.get(`/projects/${id}/media`)).data); notify('Remix created and saved to your assets.'); } catch (failure) { notify(errorText(failure), 'error'); } finally { setBusy(false); }
  }
  function contentSaved(asset) { setMedia((assets) => assets.map((item) => item._id === asset._id ? asset : item)); notify('Content changes saved to your project.'); }
  async function copy(content) { try { await navigator.clipboard.writeText(content); notify('Copied to clipboard.'); } catch { notify('Clipboard access is unavailable. Select and copy the text instead.', 'error'); } }
  if (loading) return <Shell><Spinner /></Shell>;
  if (error) return <Shell><div className="empty-state"><p className="inline-error" role="alert">{error}</p><Link className="button secondary" to="/dashboard">Back to projects</Link></div></Shell>;
  return <Shell workspace><div className="workspace-top"><div className="breadcrumbs"><Link to="/dashboard">Projects</Link><ChevronRight size={14} /><strong>{project.name}</strong></div><button className="icon-button" aria-label="Edit project" onClick={() => setEditProject(true)}><Pencil size={16} /></button></div><main className="workspace"><aside className="media-rail"><div className="rail-title"><h2>Source library <span className="count">{media.length}</span></h2><span className="muted">Your project's context</span></div><input ref={fileInput} className="sr-only" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.mp3,.wav,.mp4,.webm,.pdf,.txt,.md,.csv" aria-label="Upload media files" onChange={(event) => uploadFiles(Array.from(event.target.files || []))} /><button className={`upload-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); uploadFiles(Array.from(event.dataTransfer.files)); }} onClick={() => fileInput.current.click()} disabled={uploading}><Upload size={23} /><strong>{uploading ? `Uploading… ${progress}%` : 'Drop your files here'}</strong><span>{uploading ? 'Keeping your sources together' : 'or click to browse'}</span><small>Images, audio, video, PDF & text · 5 MB each</small>{uploading && <progress aria-label="Upload progress" value={progress} max="100" />}</button><div className="asset-list">{media.map((asset) => { const Icon = mediaIcons[asset.type] || FileText; return <div className="asset" key={asset._id}><button className="asset-open" onClick={() => setPreview(asset)}><span className={`asset-icon ${asset.type}`}><Icon size={20} /></span><span><strong>{asset.name}</strong><small>{asset.type.toUpperCase()} · {sizeLabel(asset.size)}</small></span></button><button className="icon-button asset-delete" aria-label={`Remove ${asset.name}`} disabled={busy || outputDirty} onClick={async () => { try { await api.delete(`/projects/${id}/media/${asset._id}`); setMedia((assets) => assets.filter((item) => item._id !== asset._id)); if (source === asset._id) setSource(''); if (outputAssetId === asset._id) setOutputAssetId(''); notify('Asset removed.'); } catch (failure) { notify(errorText(failure), 'error'); } }}><X size={14} /></button></div>; })}</div>{!media.length && <div className="rail-empty"><FileText size={20} /><p>Your source material lives here.<br />Upload a brief or a first idea.</p></div>}<div className="context-note"><Sparkles size={15} /><span>Chat uses every asset in this project.<br />Remix focuses on the one you choose.</span></div></aside><section className="creation-panel"><div className="workspace-tabs" role="tablist" aria-label="Creation tools"><button id="chat-tab" role="tab" aria-controls="creation-content" aria-selected={tab === 'chat'} className={tab === 'chat' ? 'active' : ''} onClick={() => { if (!outputDirty || window.confirm('Discard unsaved content changes?')) { setTab('chat'); setOutputDirty(false); } }}><MessageSquare size={17} />AI chat</button><button id="remix-tab" role="tab" aria-controls="creation-content" aria-selected={tab === 'remix'} className={tab === 'remix' ? 'active' : ''} onClick={() => setTab('remix')}><WandSparkles size={17} />Content remix</button><span className="context-counter"><FileText size={14} />{media.length} assets in context</span></div>{health && !health.aiConfigured && <div className="connection-notice" role="status"><span className="warning-dot" /><span><strong>AI connection needed.</strong> Your projects and uploads work now. Configure GEMINI_API_KEY and GEMINI_MODEL, then explicitly enable AI generation.</span></div>}<div id="creation-content" role="tabpanel" aria-labelledby={tab === 'chat' ? 'chat-tab' : 'remix-tab'} className="creation-content">{tab === 'chat' ? <><div className="chat-scroll">{!messages.length && !pending ? <div className="chat-welcome"><span className="sparkle-mark"><Sparkles size={28} strokeWidth={1.5} /></span><div className="eyebrow">LET'S CONNECT THE DOTS</div><h1>What are we creating today?</h1><p>{media.length ? 'Your source material is in context. Ask a question or turn it into something new.' : 'Upload your source material, then ask questions, find the story, or create your next piece of content.'}</p><div className="prompt-grid">{[['Find the story', 'Summarize the key ideas across my uploaded assets.', FileText], ['Write a caption', 'Write three Instagram captions based on my project assets.', Image], ['Draft a blog post', 'Create a blog post from the source material in this project.', Pencil], ['Build a video script', 'Turn my source material into a 60-second video script.', Video]].map(([label, prompt, Icon]) => <button key={label} onClick={() => setInput(prompt)}><Icon size={19} /><span>{label}</span><ArrowRight size={15} /></button>)}</div></div> : <div className="messages">{messages.map((message) => <article className={`message ${message.role}`} key={message._id}><span className="message-avatar">{message.role === 'model' ? <Sparkles size={17} /> : 'You'}</span><div><header><strong>{message.role === 'model' ? 'CreatorForge' : 'You'}</strong><span>{new Date(message.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>{message.role === 'model' && <button className="icon-button" aria-label="Copy response" onClick={() => copy(message.content)}><Copy size={14} /></button>}</header><div className="markdown"><Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown></div></div></article>)}{pending && <><article className="message user"><span className="message-avatar">You</span><div><header><strong>You</strong></header><p>{pending}</p></div></article><div className="generating" role="status"><LoaderCircle className="spin" size={17} />Connecting your sources…</div></>}</div>}<div ref={chatEnd} /></div><div className="composer-wrap"><form onSubmit={send} className="composer"><textarea aria-label="Message CreatorForge" rows={2} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your sources, or tell me what to create…" maxLength={10000} disabled={busy} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(event); } }} /><div className="composer-footer"><span><Sparkles size={13} />Project context + your brand voice</span><button className="send-button" aria-label="Send message" disabled={busy || !input.trim()}>{busy ? <LoaderCircle className="spin" size={18} /> : <ArrowUp size={19} />}</button></div></form><p className="composer-note">AI can make mistakes. Review your content before publishing.</p></div></> : <div className="remix-panel"><div className="eyebrow">ONE SOURCE. NEW POSSIBILITIES.</div><h1>Give your content a second life.</h1><p className="muted">Choose a source, pick a format, and let your brand lead the way.</p><form onSubmit={remix} className="remix-form"><div className="two-columns"><Field label="Source asset"><select required value={source} onChange={(event) => setSource(event.target.value)}><option value="">Choose an asset…</option>{media.map((asset) => <option key={asset._id} value={asset._id}>{asset.name}</option>)}</select></Field><Field label="Create a"><select value={format} onChange={(event) => setFormat(event.target.value)}>{formats.map((item) => <option key={item}>{item}</option>)}</select></Field></div><Field label="Creative direction (optional)"><textarea rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={3000} placeholder="A specific angle, length, or call to action…" /></Field><button disabled={busy || !source} className="button primary">{busy ? <LoaderCircle className="spin" size={17} /> : <WandSparkles size={17} />}{busy ? 'Creating your remix…' : 'Generate remix'}</button></form>{!media.length && <p className="muted">Upload at least one asset to get started.</p>}{outputAssetId && <section className="remix-output"><header><h2>Your remixed content</h2></header><SavedContent key={outputAssetId} projectId={id} assetId={outputAssetId} onSaved={contentSaved} onDirtyChange={setOutputDirty} /></section>}</div>}</div></section></main>{preview && <MediaPreview key={preview._id} projectId={id} asset={preview} onSaved={contentSaved} onClose={() => setPreview(null)} />}{editProject && <ProjectForm project={project} onClose={() => setEditProject(false)} onSaved={(value) => { setProject(value); setEditProject(false); notify('Project updated.'); }} />}</Shell>;
}
function BrandSettings() {
  const notify = useContext(Toast);
  const [brand, setBrand] = useState(defaultBrand);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/brand-kit').then(({ data }) => setBrand({ ...defaultBrand, ...data })).catch((failure) => setError(errorText(failure))).finally(() => setLoading(false)); }, []);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try { const { data } = await api.put('/brand-kit', { ...form, keywords: form.keywords.split(',').map((item) => item.trim()).filter(Boolean), colors: form.colors.split(',').map((item) => item.trim()).filter(Boolean) }); setBrand(data); notify('Brand kit saved. Your voice is ready for every generation.'); } catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
  }
  return <Shell><main className="brand-page"><Link className="back-link" to="/dashboard"><ArrowLeft size={16} />Back to projects</Link><div className="page-title"><div><div className="eyebrow">CONSISTENCY IS A CREATIVE ADVANTAGE</div><h1>Your brand. Your voice.</h1><p>Give every creation a familiar direction, without repeating yourself.</p></div><span className="brand-emblem"><Palette size={32} /></span></div>{loading ? <Spinner /> : <div className="brand-layout"><form onSubmit={save} className="brand-form"><h2>The essentials</h2><Field label="Brand name"><input name="name" defaultValue={brand.name} maxLength={100} placeholder="Your brand or studio name" /></Field><div className="two-columns"><Field label="Tone of voice"><input name="tone" defaultValue={brand.tone} maxLength={200} placeholder="Warm, bold, conversational…" /></Field><Field label="Audience"><input name="audience" defaultValue={brand.audience} maxLength={500} placeholder="Who are you speaking to?" /></Field></div><Field label="Keywords" hint="Separate words or short phrases with commas."><input name="keywords" defaultValue={brand.keywords.join(', ')} placeholder="Thoughtful, independent, sustainable" /></Field><Field label="Brand colors" hint="Hex codes separated by commas, e.g. #8B5CF6, #10B981."><input name="colors" defaultValue={brand.colors.join(', ')} placeholder="#8B5CF6, #10B981" /></Field><h2 className="guidelines-heading">The creative guardrails</h2><Field label="Brand guidelines"><textarea name="guidelines" rows={7} defaultValue={brand.guidelines} maxLength={10000} placeholder="What should your content always do? What should it avoid? Add preferred phrases, writing rules, and anything that makes your brand feel like you." /></Field>{error && <p className="inline-error" role="alert">{error}</p>}<button disabled={busy} className="button primary">{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}Save brand kit</button></form><aside className="brand-explainer"><Sparkles size={24} /><h2>One voice.<br />Every project.</h2><p>Your saved brand kit is included in every AI chat and remix request across your account.</p><div className="brand-rule"><Check size={16} />Your tone, not a generic voice</div><div className="brand-rule"><Check size={16} />Audience-aware content</div><div className="brand-rule"><Check size={16} />Guidelines applied automatically</div><p className="brand-footnote">Colors guide the creative brief. CreatorForge generates text, not images or videos.</p></aside></div>}</main></Shell>;
}
