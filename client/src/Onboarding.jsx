import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Layers, LoaderCircle, Megaphone, PenTool, Sparkles, Video } from 'lucide-react';
import { api, errorText } from './api.js';
import { creatorRoles } from '../../shared/onboarding.js';
import { skillById, skillsForProfessions } from '../../shared/skills.js';
import './Onboarding.css';

const roleIcons = [Video, Megaphone, PenTool, Layers, BookOpen, Sparkles];
const emptyProfile = { professions: [], roleDetail: '', skillIds: [], workflow: '' };

export default function Onboarding() {
  const navigate = useNavigate();
  const heading = useRef(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/onboarding').then(({ data }) => {
      if (active) setProfile(data.profile || emptyProfile);
    }).catch(failure => {
      if (active) { setError(errorText(failure)); setLoadFailed(true); }
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loading) heading.current?.focus({ preventScroll: true });
  }, [step, loading]);

  const roleReady = profile.professions.length > 0 && (!profile.professions.includes('other') || profile.roleDetail.trim());
  const available = skillsForProfessions(profile.professions);
  const update = values => setProfile(current => ({ ...current, ...values }));

  function toggleProfession(identifier) {
    setError('');
    setProfile(current => {
      const professions = current.professions.includes(identifier) ? current.professions.filter(profession => profession !== identifier) : [...current.professions, identifier];
      const availableIds = skillsForProfessions(professions).map(skill => skill.id);
      return { ...current, professions, skillIds: current.skillIds.filter(skill => availableIds.includes(skill)) };
    });
  }

  function toggleSkill(identifier) {
    setProfile(current => ({ ...current, skillIds: current.skillIds.includes(identifier)
      ? current.skillIds.filter(skill => skill !== identifier) : [...current.skillIds, identifier] }));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || loadFailed || !roleReady) return;
    setError('');
    if (step === 1) { setStep(2); return; }
    setBusy(true);
    try {
      await api.put('/onboarding', { ...profile, roleDetail: profile.professions.includes('other') ? profile.roleDetail : '' });
      navigate('/skills');
    } catch (failure) {
      setError(errorText(failure));
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-page">
      <aside className="onboarding-intro">
        <div className="eyebrow">A WORKSPACE THAT GETS YOU</div>
        <h1>More than one role.<br />One creative home.</h1>
        <p>Creator and student? Marketer and designer? Choose every side of your work, then bring the skills you need into one project.</p>
        <div className="onboarding-note"><Sparkles size={20} /><span>Two questions. About a minute.<br /><strong>Always yours to change.</strong></span></div>
        <p className="onboarding-privacy">Your professions organize your skills, not your account permissions. Setup doesn’t change your brand kit or start AI requests.</p>
      </aside>
      <section className="onboarding-content" aria-label="Creator profile setup">
        <div className="onboarding-topline">
          <span>Step {step} of 2</span>
          <Link to="/dashboard" aria-disabled={busy} onClick={event => busy && event.preventDefault()}>Skip for now</Link>
        </div>
        <ol className="onboarding-progress" aria-label="Setup progress">
          <li aria-current={step === 1 ? 'step' : undefined} className="active"><span>{step === 2 ? <Check size={13} /> : '1'}</span>Your professions</li>
          <li aria-current={step === 2 ? 'step' : undefined} className={step === 2 ? 'active' : ''}><span>2</span>Your skills</li>
        </ol>
        {loading ? <p role="status" className="loading"><LoaderCircle size={20} className="spin" />Loading your preferences…</p> : (
          <form onSubmit={submit}>
            <h2 ref={heading} tabIndex={-1}>{step === 1 ? 'What do you do?' : 'How can CreatorForge help you?'}</h2>
            <p className="onboarding-subtitle">{step === 1 ? 'Choose one or more professions. You don’t have to fit into one box.' : 'Pick some starting skills, or explore them later. Each has a specialist agent workflow.'}</p>
            {step === 1 ? (
              <>
                <fieldset className="onboarding-options" disabled={busy || loadFailed}>
                  <legend className="sr-only">What do you do?</legend>
                  {creatorRoles.map((role, index) => {
                    const Icon = roleIcons[index];
                    return <label className="onboarding-choice" key={role.id}>
                      <input type="checkbox" checked={profile.professions.includes(role.id)} onChange={() => toggleProfession(role.id)} />
                      <span className="onboarding-choice-body"><Icon size={21} /><span><strong>{role.title}</strong><small>{role.detail}</small></span><span className="onboarding-selector" aria-hidden="true">{profile.professions.includes(role.id) && <Check size={13} />}</span></span>
                    </label>;
                  })}
                </fieldset>
                {profile.professions.includes('other') && <label className="onboarding-field">Tell us what you do<input value={profile.roleDetail} onChange={event => update({ roleDetail: event.target.value })} maxLength={120} required disabled={busy || loadFailed} placeholder="e.g. Podcaster, researcher, nonprofit organizer" /></label>}
              </>
            ) : (
              <>
                <fieldset className="onboarding-options" disabled={busy || loadFailed}>
                  <legend className="sr-only">Choose starting skills</legend>
                  {available.map(skill => {
                    const selected = profile.skillIds.includes(skill.id);
                    return <label className="onboarding-choice" key={skill.id}>
                      <input type="checkbox" checked={selected} onChange={() => toggleSkill(skill.id)} />
                      <span className="onboarding-choice-body"><Sparkles size={21} /><span><strong>{skill.title}</strong><small>{skill.description}</small><small>Agent · {skill.agent.name}</small></span><span className="onboarding-selector" aria-hidden="true">{selected && <Check size={13} />}</span></span>
                    </label>;
                  })}
                </fieldset>
                <p className="onboarding-selection" role="status">{profile.skillIds.length} starting skills selected · You can add more later.</p>
                {profile.professions.some(profession => !skillsForProfessions([profession]).length) && <p className="skills-notice">Only creator, marketer, and designer workflows have been supplied so far. Your other professions are saved, but their skills aren’t available yet.</p>}
                <label className="onboarding-field">Anything else we should know? <span>(optional)</span><textarea rows={3} value={profile.workflow} onChange={event => update({ workflow: event.target.value })} maxLength={1000} disabled={busy || loadFailed} placeholder="e.g. I turn weekly podcast episodes into posts for my small business." /></label>
              </>
            )}
            {error && <div className="inline-error" role="alert">{error}{loadFailed && <button type="button" className="button secondary" onClick={() => window.location.reload()}>Reload preferences</button>}</div>}
            <div className="onboarding-actions">
              {step === 2 ? <button className="button secondary" type="button" disabled={busy} onClick={() => { setStep(1); setError(''); }}><ArrowLeft size={16} />Back</button> : <span>You can update this any time.</span>}
              <button className="button primary" disabled={loading || loadFailed || busy || !roleReady}>{busy ? <><LoaderCircle size={16} className="spin" />Saving…</> : <>{step === 1 ? 'Continue' : 'Explore my skills'}<ArrowRight size={16} /></>}</button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export function CreatorWelcome({ onCreate }) {
  const [profile, setProfile] = useState(undefined);
  useEffect(() => {
    let active = true;
    api.get('/onboarding').then(({ data }) => active && setProfile(data.profile)).catch(() => {});
    return () => { active = false; };
  }, []);
  if (profile === undefined) return <Link className="onboarding-fallback" to="/onboarding">Personalize your workspace<ArrowRight size={15} /></Link>;
  return (
    <section className="creator-welcome" aria-label="Your creative starting point">
      <div className="creator-welcome-icon"><Sparkles size={23} /></div>
      <div className="creator-welcome-copy">
        <div className="eyebrow">{profile ? profile.professions.map(identifier => creatorRoles.find(role => role.id === identifier)?.title).join(' + ') : 'LET’S FIND YOUR STARTING POINT'}</div>
        <h2>{profile ? 'Your skills. One place to create.' : 'Make CreatorForge work your way.'}</h2>
        <p>{profile ? 'Switch between your professions, combine their skills, and give your next project a specialist workflow.' : 'What do you do, and what would you like help with? Two quick questions to make this space more useful.'}</p>
        {profile && <div className="creator-focus-tags">{profile.skillIds.map(identifier => <span key={identifier}>{skillById(identifier)?.title}</span>)}</div>}
      </div>
      <div className="creator-welcome-actions">
        {profile ? <><Link className="button secondary" to="/skills">Explore skills<ArrowRight size={16} /></Link><Link to="/onboarding">Edit preferences</Link><button className="button secondary" onClick={onCreate}>Start a blank project</button></> : <Link className="button secondary" to="/onboarding">Personalize my workspace<ArrowRight size={16} /></Link>}
      </div>
    </section>
  );
}
