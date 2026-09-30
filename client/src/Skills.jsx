import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, LoaderCircle, Sparkles } from 'lucide-react';
import { api, errorText } from './api.js';
import { creatorRoles } from '../../shared/onboarding.js';
import { skillById, skillsForProfessions } from '../../shared/skills.js';
import './Onboarding.css';

export default function Skills() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const targetProject = search.get('project');
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState([]);
  const [profession, setProfession] = useState('all');
  const [destination, setDestination] = useState(targetProject || 'new');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/onboarding'), api.get('/projects')]).then(([preferences, owned]) => {
      if (!active) return;
      setProfile(preferences.data.profile);
      setSelected(preferences.data.profile?.skillIds || []);
      setProjects(owned.data);
      setDestination(targetProject && owned.data.some(project => project._id === targetProject) ? targetProject : 'new');
    }).catch(failure => { if (active) { setError(errorText(failure)); setLoadFailed(true); } })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [targetProject]);

  const available = skillsForProfessions(profile?.professions || []);
  const visible = profession === 'all' ? available : available.filter(skill => skill.professions.includes(profession));
  const selectedSkills = selected.map(skillById).filter(Boolean);
  function toggleSkill(identifier) {
    setSelected(current => current.includes(identifier) ? current.filter(skill => skill !== identifier) : [...current, identifier]);
  }
  async function submit(event) {
    event.preventDefault();
    if (busy || !selected.length || !profile) return;
    setBusy(true);
    setError('');
    try {
      let result;
      if (destination === 'new') result = await api.post('/projects', { name: name.trim(), description: description.trim(), skillIds: selected });
      else result = await api.patch(`/projects/${destination}/skills`, { skillIds: selected });
      navigate(`/project/${result.data._id}`);
    } catch (failure) { setError(errorText(failure)); setBusy(false); }
  }

  return <main className="skills-page">
    <div className="skills-heading"><div><div className="eyebrow">YOUR TOOLKIT, YOUR WAY</div><h1>Choose the skills.<br />Make something yours.</h1><p>Each skill has a specialist agent workflow. Mix skills across your professions in one project.</p></div><Link className="button secondary" to="/onboarding">Edit professions</Link></div>
    {loading ? <p className="loading" role="status"><LoaderCircle className="spin" size={20} />Loading your skills…</p> : loadFailed ? <div className="skills-notice"><p className="inline-error" role="alert">{error}</p><button className="button secondary" onClick={() => window.location.reload()}>Reload skills</button></div> : !profile ? <div className="skills-notice"><h2>First, tell us what you do.</h2><p>Choose one or more professions to find the skills that fit your work.</p><Link className="button primary" to="/onboarding">Set up my professions<ArrowRight size={16} /></Link></div> : <>
      <div className="skills-filters" role="group" aria-label="Filter skills by profession"><button aria-pressed={profession === 'all'} onClick={() => setProfession('all')}>All my professions</button>{profile.professions.map(identifier => <button key={identifier} aria-pressed={profession === identifier} onClick={() => setProfession(identifier)}>{creatorRoles.find(role => role.id === identifier)?.title}</button>)}</div>
      <div className="skills-layout">
        <section aria-label="Available skills">
          <div className="skills-result-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'skill' : 'skills'} · {selected.length} selected across your professions</div>
          {visible.length ? <fieldset className="skill-grid" disabled={busy}><legend className="sr-only">Add skills to your project</legend>{visible.map(skill => <label key={skill.id} className="skill-card">
            <input type="checkbox" checked={selected.includes(skill.id)} onChange={() => toggleSkill(skill.id)} />
            <span className="skill-card-body"><span className="skill-card-top"><Sparkles size={20} /><span>{skill.professions.map(identifier => creatorRoles.find(role => role.id === identifier)?.title).join(' · ')}</span><span className="onboarding-selector" aria-hidden="true">{selected.includes(skill.id) && <Check size={13} />}</span></span><strong>{skill.title}</strong><span className="skill-card-description">{skill.description}</span><span className="skill-card-source">Source · {skill.inputs}</span><span className="skill-card-agent">Agent · {skill.agent.name}</span></span>
          </label>)}</fieldset> : <div className="skills-notice"><h2>No skills supplied for this profession yet.</h2><p>Your profession is saved. Switch to another collection; we won’t invent skills that haven’t been defined.</p></div>}
        </section>
        <form className="skill-project-form" onSubmit={submit}>
          <div className="eyebrow">BUILD YOUR PROJECT</div><h2>{selected.length} {selected.length === 1 ? 'skill' : 'skills'} together</h2><p>Selection stays with you when you switch professions.</p>
          {selectedSkills.length ? <ul className="selected-skill-list">{selectedSkills.map(skill => <li key={skill.id}><span>{skill.title}<small>{skill.agent.name}</small></span><button type="button" disabled={busy} onClick={() => toggleSkill(skill.id)} aria-label={`Remove ${skill.title}`}>×</button></li>)}</ul> : <p className="skills-notice">Choose a skill to start.</p>}
          <label className="onboarding-field">Add skills to<select value={destination} disabled={busy} onChange={event => setDestination(event.target.value)}><option value="new">A new project</option>{projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}</select></label>
          {destination === 'new' && <><label className="onboarding-field">Project name<input required maxLength={100} value={name} disabled={busy} onChange={event => setName(event.target.value)} placeholder="e.g. Podcast launch campaign" /></label><label className="onboarding-field">Project brief <span>(optional)</span><textarea rows={3} maxLength={500} value={description} disabled={busy} onChange={event => setDescription(event.target.value)} placeholder="What are you creating, and who is it for?" /></label></>}
          {error && <p role="alert" className="inline-error">{error}</p>}
          <button className="button primary" disabled={busy || !selected.length || (destination === 'new' && !name.trim())}>{busy ? <><LoaderCircle size={16} className="spin" />Saving…</> : <>{destination === 'new' ? 'Create project with skills' : 'Add skills to project'}<ArrowRight size={16} /></>}</button>
          <small className="skill-project-footnote">Adding skills doesn’t run AI. Upload your sources and run an agent when you’re ready. Outputs are text; nothing is posted automatically.</small>
        </form>
      </div>
    </>}
  </main>;
}
