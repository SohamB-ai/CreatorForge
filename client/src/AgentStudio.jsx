import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { api, errorText } from './api.js';
import './studio.css';
const initial = {
  brief: '',
  duration: 480,
  sourceIds: [],
  overrides: {
    tone: '',
    hook: '',
    pacing: '',
    cta: ''
  }
};
export default function AgentStudio({
  projectId,
  media,
  onSaved,
  openRunId,
  onDirtyChange
}) {
  const [catalog, setCatalog] = useState([]),
    [runs, setRuns] = useState([]),
    [agent, setAgent] = useState('long-form-script'),
    [run, setRun] = useState(null),
    [draft, setDraft] = useState(initial),
    [artifacts, setArtifacts] = useState({}),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false),
    [revisions, setRevisions] = useState([]);
  const controller = useRef(null),
    epoch = useRef(0),
    heading = useRef(null);
  const base = `/projects/${projectId}/studio`;
  function accept(value) {
    setRun(value);
    setAgent(value.agentId);
    setDraft({
      brief: value.brief,
      duration: value.duration,
      sourceIds: value.sourceIds,
      overrides: value.overrides
    });
    setArtifacts(value.artifacts || {});
    setDirty(false);
  }
  async function refresh() {
    const {
      data
    } = await api.get(`${base}/runs`);
    setRuns(data);
    onSaved?.();
  }
  useEffect(() => {
    const generation = ++epoch.current;
    let active = true;
    setRun(null);
    setError('');
    setDraft(initial);
    setArtifacts({});
    Promise.all([api.get(`${base}/catalog`), api.get(`${base}/runs`)]).then(async ([c, r]) => {
      if (!active) return;
      setCatalog(c.data);
      setRuns(r.data);
      const id = openRunId || r.data[0]?._id;
      if (id) {
        const {
          data
        } = await api.get(`${base}/runs/${id}`);
        if (active && epoch.current === generation) accept(data);
      }
    }).catch(e => active && setError(errorText(e)));
    return () => {
      active = false;
      epoch.current++;
      controller.current?.abort();
    };
  }, [projectId, openRunId]);
  useEffect(() => {
    if (!run) return;
    api.get(`${base}/runs/${run._id}/revisions`).then(r => setRevisions(r.data)).catch(() => {});
  }, [run?.revision, run?._id]);
  useEffect(() => {
    const warn = e => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  async function act(label, operation) {
    setBusy(label);
    setError('');
    const activeEpoch = epoch.current;
    try {
      await operation();
      if (epoch.current === activeEpoch) {
        await refresh();
        heading.current?.focus();
      }
    } catch (e) {
      if (epoch.current === activeEpoch) setError(errorText(e));
    } finally {
      if (epoch.current === activeEpoch) setBusy('');
    }
  }
  function change(values) {
    setDraft(d => ({
      ...d,
      ...values
    }));
    setDirty(true);
  }
  async function save() {
    const body = {
      revision: run.revision
    };
    const changed = key => JSON.stringify(artifacts[key]) !== JSON.stringify(run.artifacts[key]);
    if (JSON.stringify(draft) !== JSON.stringify({
      brief: run.brief,
      duration: run.duration,
      sourceIds: run.sourceIds,
      overrides: run.overrides
    })) body.draft = draft;
    if (artifacts.script && changed('script')) body.scenes = artifacts.script.scenes;
    if (artifacts.outline && changed('outline')) body.outline = artifacts.outline;
    if (artifacts.hooks && changed('hooks')) body.hooks = artifacts.hooks;
    const outputs = Object.fromEntries(['x', 'linkedin', 'newsletter'].filter(k => artifacts[k] && changed(k)).map(k => [k, artifacts[k]]));
    if (Object.keys(outputs).length) body.outputs = outputs;
    const {
      data
    } = await api.patch(`${base}/runs/${run._id}`, body);
    accept(data);
    return data;
  }
  async function patch(body) {
    const {
      data
    } = await api.patch(`${base}/runs/${run._id}`, {
      revision: run.revision,
      ...body
    });
    accept(data);
  }
  function generate(stage, sceneId) {
    act(`Generating ${stage}…`, async () => {
      let current = run;
      if (dirty) current = await save();
      controller.current = new AbortController();
      const {
        data
      } = await api.post(`${base}/runs/${current._id}/generate`, {
        revision: current.revision,
        requestId: crypto.randomUUID(),
        stage,
        restart: stage === "script" && !sceneId && current.agentId === "long-form-script" && current.artifacts.script?.completedChapters === current.artifacts.outline?.chapters.length,
        ...(sceneId ? {
          sceneId
        } : {})
      }, {
        timeout: 190000,
        signal: controller.current.signal
      });
      accept(data);
    });
  }
  function editScene(i, key, value) {
    setArtifacts(a => ({
      ...a,
      script: {
        ...a.script,
        scenes: a.script.scenes.map((s, j) => i === j ? {
          ...s,
          [key]: value
        } : s)
      }
    }));
    setDirty(true);
  }
  const locked = !!busy;
  return <section className="agent-studio" aria-busy={locked}>
 <header><p className="studio-kicker">CREATORFORGE / EDITORIAL DESK</p><h1 ref={heading} tabIndex={-1}>Agent Studio</h1><p>Shape the angle. Direct the draft. Make every scene count.</p></header>
 <div role="status" className="studio-status">{busy || (dirty ? 'Unsaved edits' : run ? `Saved · revision ${run.revision}` : 'Start a new creative brief')}</div>
 {busy.startsWith('Generating') && <button onClick={() => controller.current?.abort()}>Cancel generation</button>}
 {error && <div role="alert"><p>{error}</p>{run && <button onClick={() => act('Reloading…', async () => accept((await api.get(`${base}/runs/${run._id}`)).data))}>Reload saved run (discards local edits)</button>}</div>}
 <fieldset disabled={locked}><legend>Creative desk</legend><div className="studio-grid">{catalog.map(a => <button key={a.id} aria-pressed={agent === a.id} onClick={() => {
          if (dirty && !window.confirm('Discard unsaved edits?')) return;
          setAgent(a.id);
          setRun(null);
          setArtifacts({});
          setDirty(false);
          setDraft({
            ...initial,
            duration: a.id === 'reels-script' ? 30 : 480
          });
        }}>{a.title}</button>)}</div>
 <label>Previous runs<select value={run?._id || ''} onChange={e => {
          const id = e.target.value;
          if (!id) return;
          if (dirty && !window.confirm('Discard unsaved edits?')) return;
          act('Loading…', async () => accept((await api.get(`${base}/runs/${id}`)).data));
        }}><option value="">Choose a saved run</option>{runs.map(r => <option key={r._id} value={r._id}>{r.brief.slice(0, 60)} · {r.agentId}</option>)}</select></label>
 <label>Idea / source notes<textarea required rows={4} value={draft.brief} maxLength={10000} onChange={e => change({
          brief: e.target.value
        })} /></label>
 {['long-form-script', 'reels-script'].includes(agent) && <label>Target duration (seconds)<input type="number" min={agent === 'reels-script' ? 15 : 60} max={agent === 'reels-script' ? 60 : 1800} value={draft.duration} onChange={e => change({
          duration: Number(e.target.value)
        })} />{agent === 'long-form-script' && <span className="studio-actions">{[8, 12, 20].map(n => <button key={n} onClick={() => change({
            duration: n * 60
          })}>{n} minutes</button>)}</span>}</label>}
 <details><summary>Reference sources ({draft.sourceIds.length})</summary>{media.map(m => <label key={m._id} className="studio-check"><input type="checkbox" checked={draft.sourceIds.includes(m._id)} onChange={e => change({
            sourceIds: e.target.checked ? [...draft.sourceIds, m._id] : draft.sourceIds.filter(id => id !== m._id)
          })} />{m.name}</label>)}</details>
 <details><summary>Creative overrides</summary><p>Explicit overrides take precedence over saved brand guidance. Review any conflicting instructions before generating.</p>{Object.keys(initial.overrides).map(key => <label key={key}>{key}<input value={draft.overrides[key]} onChange={e => change({
            overrides: {
              ...draft.overrides,
              [key]: e.target.value
            }
          })} /></label>)}{run?.brand?.tone && draft.overrides.tone && draft.overrides.tone !== run.brand.tone && <p role="status">Tone override replaces brand tone: {run.brand.tone}</p>}</details>
 <div className="studio-actions">{!run ? <button disabled={!draft.brief.trim()} onClick={() => act('Creating run…', async () => accept((await api.post(`${base}/runs`, {
          agentId: agent,
          ...draft
        })).data))}>Create draft</button> : <><button disabled={!dirty} onClick={() => act('Saving…', save)}>Save changes</button><button onClick={() => {
            if (dirty && !window.confirm('Discard unsaved edits?')) return;
            setRun(null);
            setArtifacts({});
            setDirty(false);
          }}>New run</button></>}</div>
 </fieldset>
 {run && <fieldset disabled={locked}><legend>Editorial workflow</legend>
 <ol className="studio-steps">{catalog.find(a => a.id === agent)?.stages.map(stage => <li key={stage}>{stage} · {run.stale.includes(stage) ? 'outdated' : artifacts[stage] ? 'saved' : 'pending'}</li>)}</ol>
 {['long-form-script', 'reels-script'].includes(agent) && <><button onClick={() => generate('angles')}>Generate angles / hooks</button>{artifacts.angles?.angles.map((a, i) => <label key={i} className="studio-angle"><input type="radio" name="studio-angle" checked={run.selectedAngle === i} disabled={dirty || run.stale.includes('angles')} onChange={() => act('Selecting angle…', () => patch({
            selectedAngle: i
          }))} /><strong>{a.title}</strong><span>{a.hook}</span></label>)}
 {agent === 'long-form-script' && <><button disabled={run.selectedAngle < 0 || run.stale.includes('angles')} onClick={() => generate('outline')}>Generate outline</button>{artifacts.outline?.chapters.map((c, i) => <div key={i} className="studio-card"><label>Chapter {i + 1} title<input value={c.title} onChange={e => {
                setArtifacts(a => ({
                  ...a,
                  outline: {
                    chapters: a.outline.chapters.map((c, j) => j === i ? {
                      ...c,
                      title: e.target.value
                    } : c)
                  }
                }));
                setDirty(true);
              }} /></label><label>Chapter summary<textarea value={c.summary} onChange={e => {
                setArtifacts(a => ({
                  ...a,
                  outline: {
                    chapters: a.outline.chapters.map((c, j) => j === i ? {
                      ...c,
                      summary: e.target.value
                    } : c)
                  }
                }));
                setDirty(true);
              }} /></label></div>)}{artifacts.outline && <button onClick={() => act('Approving outline…', async () => {
            await save();
          })}>Save edited outline</button>}{artifacts.outline && <button disabled={dirty || run.stale.includes('outline')} onClick={() => act('Approving outline…', () => patch({
            approveOutline: true
          }))}>{run.outlineApproved ? 'Outline approved' : 'Approve outline'}</button>}</>}
 <button disabled={run.selectedAngle < 0 || run.stale.includes('angles') || agent === 'long-form-script' && (!run.outlineApproved || run.stale.includes('outline'))} onClick={() => generate('script')}>Generate / resume script</button></>}
 {agent === 'hook-lab' && <button onClick={() => generate('hooks')}>Generate hooks & titles</button>}
 {agent === 'repurpose-engine' && <div className="studio-actions">{['x', 'linkedin', 'newsletter'].map(key => <button key={key} onClick={() => generate(key)}>Generate {key}</button>)}</div>}
 {artifacts.script?.scenes.map((s, i) => <article className="studio-card" key={s.id}><h2>Scene {i + 1} · estimated {s.start}–{s.end}s</h2><p>{s.markers.join(' · ')}</p>{['spoken', 'visual', 'onScreen', 'loopId'].map(key => <label key={key}>{key}<textarea rows={key === 'spoken' ? 5 : 2} value={s[key]} onChange={e => editScene(i, key, e.target.value)} /></label>)}<label>Retention markers (comma separated)<input value={s.markers.join(', ')} onChange={e => editScene(i, 'markers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} /></label><button disabled={run.stale.includes('script')} onClick={() => generate('script', s.id)}>Regenerate this scene</button></article>)}
 {artifacts.hooks && <><h2>Hook variants</h2>{artifacts.hooks.hooks.map((h, i) => <label key={i}>{h.category}<textarea value={h.text} onChange={e => {
            setArtifacts(a => ({
              ...a,
              hooks: {
                ...a.hooks,
                hooks: a.hooks.hooks.map((h, j) => j === i ? {
                  ...h,
                  text: e.target.value
                } : h)
              }
            }));
            setDirty(true);
          }} /></label>)}<h2>Titles & thumbnail concepts</h2>{artifacts.hooks.titles.map((t, i) => <div key={i}>{['title', 'thumbnail'].map(key => <label key={key}>{key}<input value={t[key]} onChange={e => {
              setArtifacts(a => ({
                ...a,
                hooks: {
                  ...a.hooks,
                  titles: a.hooks.titles.map((t, j) => j === i ? {
                    ...t,
                    [key]: e.target.value
                  } : t)
                }
              }));
              setDirty(true);
            }} /></label>)}</div>)}</>}
 {['x', 'linkedin', 'newsletter'].filter(k => artifacts[k]).map(key => <article key={key}><h2>{key}</h2><label>Edit {key}<textarea rows={10} value={artifacts[key].content} onChange={e => {
            setArtifacts(a => ({
              ...a,
              [key]: {
                content: e.target.value
              }
            }));
            setDirty(true);
          }} /></label><details><summary>Preview</summary><Markdown>{artifacts[key].content}</Markdown></details></article>)}
 <div className="studio-actions"><button disabled={!Object.keys(artifacts).some(k => ['script', 'hooks', 'x', 'linkedin', 'newsletter'].includes(k))} onClick={() => generate('audit')}>Run audit again</button>{Object.entries(run.assets || {}).map(([key, id]) => <span key={key}>{key}: {['markdown', 'text'].map(format => <button key={format} onClick={() => act('Exporting…', async () => {
            const {
              data
            } = await api.get(`/projects/${projectId}/media/${id}/export?format=${format}`, {
              responseType: 'blob'
            });
            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${key}.${format === 'text' ? 'txt' : 'md'}`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          })}>{format}</button>)}</span>)}</div>
 {run.audit && <aside><h2>Script quality audit {run.audit.revision !== run.revision || dirty ? '· outdated' : ''}</h2><p>Editorial guidance and estimated pacing, without predicted audience retention.</p>{[...run.audit.checks, ...run.audit.findings].map((f, i) => <article className="studio-card" key={i}><strong>{f.category} · {f.target}</strong><p>{f.evidence}</p><p>{f.suggestion}</p></article>)}{!run.audit.checks.length && !run.audit.findings.length && <p>No findings reported.</p>}</aside>}
 <details><summary>Revision history</summary>{revisions.map(r => <button key={r._id} onClick={() => act('Restoring…', async () => accept((await api.post(`${base}/runs/${run._id}/restore`, {
          revision: run.revision,
          restoreRevision: r.revision
        })).data))}>Restore revision {r.revision}</button>)}</details>
 </fieldset>}
 </section>;
}
