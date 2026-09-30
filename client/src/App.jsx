import { cloneElement, createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  AudioLines,
  Check,
  ChevronRight,
  FileText,
  Folder,
  Image,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  MessageSquare,
  Palette,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  X,
  BookOpen,
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, errorText, streamChat } from './api.js';
import GoogleSignIn from './GoogleSignIn.jsx';
import SavedContent from './SavedContent.jsx';
import ChatMessageActions from './ChatMessageActions.jsx';
import Onboarding, { CreatorWelcome } from './Onboarding.jsx';
import Skills from './Skills.jsx';
import { skillById } from '../../shared/skills.js';
import { BentoGrid } from './components/BentoGrid.jsx';
import { TrustWall } from './components/TrustWall.jsx';
import { ResultsSection } from './components/ResultsSection.jsx';
import { ProblemSection } from './components/ProblemSection.jsx';
import { HowItWorksSection } from './components/HowItWorksSection.jsx';
import { FaqSection } from './components/FaqSection.jsx';
import { Footer } from './components/Footer.jsx';
import { ShimmerButton } from './components/ShimmerButton.jsx';
import { BrandColorPreview } from './components/BrandColorPreview.jsx';
import { OrnateDivider } from './components/OrnateDivider.jsx';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Auth = createContext(null);
const Toast = createContext(null);
const fileLimit = 5 * 1024 * 1024;
const mediaIcons = { image: Image, audio: AudioLines, video: Video, document: FileText, text: FileText };
const formats = ['Instagram caption', 'Blog post', 'Video script', 'Tweet thread', 'LinkedIn post', 'Image prompt', 'Summary'];
const defaultBrand = { name: '', tone: 'Professional and conversational', audience: '', keywords: [], colors: [], guidelines: '' };
const sizeLabel = (size) => size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

function Logo() {
  return (
    <Link
      className="logo inline-flex items-center justify-center group py-1"
      to="/"
      aria-label="CreatorForge"
      title="CreatorForge"
    >
      <span className="w-9 h-9 rounded-[2.88px] border border-[var(--color-ink-black)] bg-[var(--color-ink-black)] flex items-center justify-center transition-all duration-150">
        <img
          src="/assets/pen_and_sword_badge.svg"
          alt="CreatorForge insignia"
          className="w-5 h-5 filter brightness-110 invert"
        />
      </span>
      <span className="font-canopee tracking-[-0.03em] font-normal text-xl text-[var(--color-ink-black)]">
        CREATORFORGE
      </span>
    </Link>
  );
}

function Spinner({ label = 'Loading your workspace…' }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin text-[var(--color-ember-orange)]" size={20} />
      <span>{label}</span>
    </div>
  );
}

function Field({ label, children, hint }) {
  const identifier = useId();
  return (
    <div className="field">
      <label htmlFor={identifier}>{label}</label>
      {cloneElement(children, { id: identifier, 'aria-describedby': hint ? `${identifier}-hint` : undefined })}
      {hint && <small id={`${identifier}-hint`}>{hint}</small>}
    </div>
  );
}

function Dialog({ title, onClose, children }) {
  const reference = useRef(null);
  useEffect(() => {
    const dialog = reference.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog && dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={reference}
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="modal"
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function useHealth() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    let active = true;
    api.get('/health')
      .then(({ data }) => active && setHealth(data))
      .catch(() => active && setHealth({ database: 'disconnected', aiConfigured: false }));
    return () => { active = false; };
  }, []);
  return health;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Enforce dark broadsheet theme strictly
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    localStorage.setItem('creatorforge.theme', 'dark');
  }, []);

  useEffect(() => {
    const logout = () => {
      localStorage.removeItem('creatorforge.token');
      setUser(null);
    };
    window.addEventListener('creatorforge.session-expired', logout);
    if (localStorage.getItem('creatorforge.token')) {
      api.get('/auth/me')
        .then(({ data }) => setUser(data))
        .catch((error) => {
          if (error.response?.status === 401) logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => window.removeEventListener('creatorforge.session-expired', logout);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);

  const auth = {
    user,
    loading,
    signIn: (data) => {
      localStorage.setItem('creatorforge.token', data.token);
      setUser(data.user);
    },
    logout: () => {
      localStorage.removeItem('creatorforge.token');
      setUser(null);
    },
    light: false,
    toggleTheme: () => {},
  };

  return (
    <Auth.Provider value={auth}>
      <Toast.Provider value={(message, kind = 'success') => setToast({ message, kind })}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/onboarding" element={<Protected><Shell><Onboarding /></Shell></Protected>} />
          <Route path="/skills" element={<Protected><Shell><Skills /></Shell></Protected>} />
          <Route path="/project/:id" element={<Protected><Workspace /></Protected>} />
          <Route path="/settings/brandkit" element={<Protected><BrandSettings /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {toast && (
          <div className={`toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
            {toast.kind === 'success' && <Check size={16} className="text-[var(--color-ink-black)]" />}
            <span>{toast.message}</span>
            <button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast(null)}>
              <X size={15} />
            </button>
          </div>
        )}
      </Toast.Provider>
    </Auth.Provider>
  );
}

function Protected({ children }) {
  const auth = useContext(Auth);
  return auth.loading ? <Spinner /> : auth.user ? children : <Navigate to="/login" replace />;
}

function Shell({ children, workspace = false }) {
  const auth = useContext(Auth);
  const navigate = useNavigate();

  return (
    <div className={`app-shell ${workspace ? 'workspace-shell' : ''}`}>
      <header className="app-header border-b border-[var(--color-ink-black)] bg-[var(--color-parchment)]">
        <Logo />
        <nav aria-label="Main navigation" className="font-editorial-new text-sm">
          <Link to="/dashboard" className="nav-link text-[var(--color-ink-black)] hover:bg-[var(--color-bone-cream)]" aria-label="Projects">
            <LayoutGrid size={15} className="text-[var(--color-ink-black)]" />
            <span>Projects</span>
          </Link>
          <Link to="/settings/brandkit" className="nav-link text-[var(--color-ink-black)] hover:bg-[var(--color-bone-cream)]" aria-label="Brand Manual">
            <Palette size={15} className="text-[var(--color-ink-black)]" />
            <span>Brand Manual</span>
          </Link>
        </nav>
        <div className="account flex items-center gap-3">
          <span className="avatar bg-[var(--color-ink-black)] border border-[var(--color-ink-black)] text-[var(--color-parchment)] font-normal font-editorial-new rounded-[2.88px]" title={auth.user.name}>
            {auth.user.name.slice(0, 1).toUpperCase()}
          </span>
          <button
            className="icon-button hover:bg-[var(--color-bone-cream)]"
            aria-label="Sign out"
            onClick={() => {
              auth.logout();
              navigate('/login');
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

function Landing() {
  const auth = useContext(Auth);
  const next = auth.user ? '/dashboard' : '/register';

  const heroSectionRef = useRef(null);
  const heroCopyRef = useRef(null);
  const heroVisualRef = useRef(null);
  const proclamationRef = useRef(null);

  const [heroVoicePlaying, setHeroVoicePlaying] = useState(false);
  const [heroVoiceSec, setHeroVoiceSec] = useState(165);
  const [heroWaves, setHeroWaves] = useState([35, 70, 45, 90, 60, 40, 80, 50, 25, 65, 85, 30]);

  // Audio wave animation for hero voice record
  useEffect(() => {
    let timer;
    if (heroVoicePlaying) {
      timer = setInterval(() => {
        setHeroVoiceSec((s) => s + 1);
        setHeroWaves((prev) => prev.map(() => Math.floor(Math.random() * 70) + 25));
      }, 160);
    }
    return () => clearInterval(timer);
  }, [heroVoicePlaying]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      // Hero copy stagger
      if (heroCopyRef.current) {
        gsap.fromTo(
          heroCopyRef.current.children,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.1,
            ease: 'power2.out',
          }
        );
      }

      // Hero editorial desk entrance
      if (heroVisualRef.current) {
        gsap.fromTo(
          heroVisualRef.current,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            delay: 0.15,
            ease: 'power2.out',
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  const formatHeroTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `0${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="landing max-w-6xl mx-auto px-6 py-2">
      {/* Editorial Header Bar */}
      <header className="landing-header border-b border-[var(--color-ink-black)] py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-editorial-new text-xs uppercase tracking-[-0.01em] text-[var(--color-charcoal)]">
            Issue 01 · Studio Edition
          </span>
        </div>
        <Logo />
        <div className="landing-actions flex items-center gap-4">
          <Link
            className="font-editorial-new text-sm text-[var(--color-ink-black)] hover:text-[var(--color-pure-black)] underline underline-offset-4 flex items-center gap-1.5"
            to={auth.user ? '/dashboard' : '/login'}
          >
            {auth.user ? 'Enter Studio' : 'Sign In'}
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main>
        {/* Section 1: Hero: Desired End Result Without the Core Fear */}
        <section ref={heroSectionRef} className="hero py-14 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div ref={heroCopyRef} className="hero-copy lg:col-span-6 will-change-transform">
            <span className="font-editorial-new text-xs uppercase tracking-wider text-[var(--color-ember-orange)] mb-3 block font-semibold">
              The Multimodal Scriptorium
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-canopee font-normal tracking-[-0.04em] text-[var(--color-ink-black)] leading-[0.88] mb-5">
              Turn raw research into<br />
              publication-ready writing.<br />
              <span className="text-[var(--color-ember-orange)] italic font-normal">Without losing your voice.</span>
            </h1>
            <p className="text-lg text-[var(--color-charcoal)] font-editorial-new leading-[1.35] max-w-lg mb-6">
              CreatorForge grounds your essays, scripts, and threads directly in your primary sources, voice notes, and house style.
            </p>
            <div className="flex flex-wrap items-center gap-3.5 mb-5">
              <ShimmerButton to={next} className="primary">
                Start Writing Free <ArrowRight size={15} />
              </ShimmerButton>
              <Link to={auth.user ? '/dashboard' : '/login'} className="button secondary">
                Access Archives
              </Link>
            </div>
            <div className="pt-2 text-xs font-editorial-new text-[var(--color-charcoal)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
              <span>Trusted by 4,200+ essayists, newsletter authors, and creative directors.</span>
            </div>
          </div>

          <div ref={heroVisualRef} className="hero-visual lg:col-span-6 relative will-change-transform">
            <div className="p-6 md:p-7 rounded-[11.52px] border border-[var(--color-ink-black)] bg-[var(--color-bone-cream)] shadow-[var(--shadow-sm)]">
              <div className="flex items-center justify-between border-b border-[var(--color-ink-black)] pb-2.5 mb-4 font-editorial-new text-xs uppercase tracking-[-0.01em] text-[var(--color-ink-black)]">
                <span className="flex items-center gap-2">
                  <BookOpen size={14} /> Folio Proofs · Active Issue
                </span>
                <span className="new-badge">PROOF 01</span>
              </div>

              {/* Archival illustration plate */}
              <div className="overflow-hidden border border-[var(--color-ink-black)] bg-[var(--color-parchment)] mb-4 relative rounded-none">
                <img
                  src="/assets/creative_studio_art.jpg"
                  alt="Editorial study and creative references"
                  className="w-full h-52 object-cover object-center rounded-none"
                />
                <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 font-editorial-new text-xs uppercase tracking-[-0.01em] text-[var(--color-ink-black)] bg-[var(--color-parchment)] px-2.5 py-1 rounded-[2.88px] border border-[var(--color-ink-black)] shadow-[var(--shadow-sm)]">
                  <Image size={13} className="text-[var(--color-ember-orange)]" /> Photographic Proof · Plate 01
                </span>
              </div>

              {/* Multi-source cards grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  onClick={() => setHeroVoicePlaying(!heroVoicePlaying)}
                  className="p-3 rounded-[2.88px] bg-[var(--color-parchment)] border border-[var(--color-ink-black)] flex flex-col justify-between shadow-[var(--shadow-sm)] cursor-pointer hover:bg-[var(--color-elevated)] transition-colors"
                  title={heroVoicePlaying ? 'Pause voice recording' : 'Preview voice recording'}
                >
                  <div className="flex items-center justify-between text-xs text-[var(--color-charcoal)] font-editorial-new">
                    <span className="flex items-center gap-1.5 text-[var(--color-ink-black)]">
                      <AudioLines size={13} className="text-[var(--color-ember-orange)]" /> Voice Tape
                    </span>
                    <span className="font-mono text-xs text-[var(--color-ink-black)]">{formatHeroTimer(heroVoiceSec)}</span>
                  </div>
                  <div className="h-5 flex items-center gap-1 mt-2">
                    {heroWaves.map((h, i) => (
                      <span
                        key={i}
                        style={{ height: `${h}%` }}
                        className={`w-1 rounded-none transition-all duration-150 ${
                          heroVoicePlaying
                            ? 'bg-[var(--color-ember-orange)]'
                            : 'bg-[var(--color-ink-black)] opacity-60'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-[2.88px] bg-[var(--color-parchment)] border border-[var(--color-ink-black)] flex flex-col justify-between shadow-[var(--shadow-sm)]">
                  <div className="flex items-center justify-between text-xs text-[var(--color-charcoal)] font-editorial-new">
                    <span className="flex items-center gap-1.5 text-[var(--color-ink-black)]"><FileText size={13} className="text-[var(--color-ember-orange)]" /> Research Brief</span>
                    <span className="text-xs text-[var(--color-charcoal)]">Rev. 2</span>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="h-1 bg-[var(--color-ink-black)] w-full rounded-none" />
                    <div className="h-1 bg-[var(--color-ink-black)] w-3/4 rounded-none opacity-60" />
                    <div className="h-1 bg-[var(--color-ember-orange)] w-1/2 rounded-none" />
                  </div>
                </div>
              </div>

              {/* Synthesis result indicator */}
              <div className="p-3.5 rounded-[2.88px] bg-[var(--color-parchment)] border border-[var(--color-ink-black)] flex items-center justify-between shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-[2.88px] border border-[var(--color-ink-black)] bg-[var(--color-ink-black)] flex items-center justify-center text-[var(--color-parchment)]">
                    <Sparkles size={14} />
                  </span>
                  <div>
                    <strong className="block text-sm font-canopee font-normal text-[var(--color-ink-black)] tracking-[-0.02em]">
                      Raw research becomes published copy.
                    </strong>
                    <small className="text-xs text-[var(--color-charcoal)] font-editorial-new">
                      Synthesized into high-impact dispatches, threads and scripts
                    </small>
                  </div>
                </div>
                <ArrowUp size={16} className="text-[var(--color-ink-black)]" />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Social Proof & Quantifiable Results Anchor */}
        <TrustWall />
        <ResultsSection />

        <OrnateDivider glyph="✶" />

        {/* Section 3: Problem Statement: The Cost of the Problem */}
        <ProblemSection />

        <OrnateDivider glyph="❧" />

        {/* Section 4: Solution & Value: 6 Comprehensive Feature Pillars */}
        <BentoGrid />

        <OrnateDivider glyph="✤" />

        {/* Section 5: How It Works: 3 Frictionless Steps */}
        <HowItWorksSection />

        <OrnateDivider glyph="✶" />

        {/* Section 6: Frequently Asked Questions */}
        <FaqSection />

        <OrnateDivider glyph="❧" />

        {/* Section 7: Final Benefit-Driven CTA */}
        <section
          ref={proclamationRef}
          className="my-16 p-8 md:p-14 rounded-[11.52px] bg-[var(--color-bone-cream)] border border-[var(--color-ink-black)] text-center relative max-w-4xl mx-auto shadow-[var(--shadow-sm)] overflow-hidden will-change-transform"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-canopee font-normal tracking-[-0.035em] text-[var(--color-ink-black)] mb-3 leading-[0.95]">
            Stop letting brilliant ideas die in scattered notes.
          </h2>
          <p className="text-[var(--color-charcoal)] font-editorial-new text-lg max-w-xl mx-auto mb-8 leading-[1.35]">
            Create your first project archive, deposit your research and voice dictations, and craft with unyielding conviction.
          </p>
          <div className="flex justify-center relative z-10">
            <ShimmerButton to={next} className="primary">
              Start Writing Free <ArrowRight size={16} />
            </ShimmerButton>
          </div>
        </section>
      </main>

      {/* Structured Broadsheet Footer */}
      <Footer />
    </div>
  );
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
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const { data } = await api.post(
        register ? '/auth/register' : '/auth/login',
        Object.fromEntries(form)
      );
      auth.signIn(data);
      navigate('/dashboard');
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page max-w-5xl mx-auto px-6 py-4">
      <header className="border-b border-[var(--color-ink-black)] py-3.5 flex items-center justify-between">
        <Logo />
        <span className="font-editorial-new text-xs uppercase text-[var(--color-charcoal)]">
          Editorial Access
        </span>
      </header>
      <main className="auth-layout py-10">
        <aside className="pr-4">
          <span className="font-editorial-new text-xs uppercase tracking-[-0.01em] text-[var(--color-ember-orange)] mb-2 block">
            The Newsroom Desk
          </span>
          <h1 className="text-4xl md:text-5xl font-canopee font-normal tracking-[-0.04em] text-[var(--color-ink-black)] mb-3 leading-[0.92]">
            Less scattered.<br />More focused.
          </h1>
          <p className="text-[var(--color-charcoal)] font-editorial-new text-base leading-[1.35]">
            A dedicated newsroom for your research materials, voice dictations, and editorial ideas.
          </p>
          <div className="mt-7 rounded-none overflow-hidden border border-[var(--color-ink-black)] max-w-sm bg-[var(--color-bone-cream)] shadow-[var(--shadow-sm)]">
            <img
              src="/assets/moodboard_photo.jpg"
              alt="Creative studio moodboard"
              className="w-full h-48 object-cover rounded-none"
            />
          </div>
          <div className="auth-source-icons flex items-center gap-4 mt-5 text-[var(--color-ink-black)]">
            <Image size={18} className="hover:text-[var(--color-ember-orange)] transition-colors" />
            <AudioLines size={18} className="hover:text-[var(--color-ember-orange)] transition-colors" />
            <Video size={18} className="hover:text-[var(--color-ember-orange)] transition-colors" />
            <FileText size={18} className="hover:text-[var(--color-ember-orange)] transition-colors" />
          </div>
        </aside>

        <section className="auth-form bg-[var(--color-bone-cream)] border border-[var(--color-ink-black)] p-7 md:p-8 rounded-[11.52px] shadow-[var(--shadow-sm)] relative">
          <h2 className="text-2xl font-canopee font-normal text-[var(--color-ink-black)] mb-1.5 leading-[0.98]">
            {register ? 'Create your publication account.' : 'Welcome back to the desk.'}
          </h2>
          <p className="text-[var(--color-charcoal)] font-editorial-new text-sm mb-5 leading-[1.35]">
            {register
              ? 'Register to start your first multimodal project.'
              : 'Your project archives and brand manual await.'}
          </p>

          <GoogleSignIn
            key={register ? 'register' : 'login'}
            disabled={busy}
            light={false}
            onBusyChange={setGoogleBusy}
            onSuccess={(data) => {
              auth.signIn(data);
              navigate('/dashboard');
            }}
          />

          <form onSubmit={submit} className="mt-3">
            {register && (
              <Field label="Your name">
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={50}
                  placeholder="e.g. Jane Miller"
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@publication.com"
              />
            </Field>
            <Field
              label="Password"
              hint={register ? 'At least 8 characters, up to 72 UTF-8 bytes.' : null}
            >
              <input
                name="password"
                type="password"
                required
                minLength={register ? 8 : undefined}
                autoComplete={register ? 'new-password' : 'current-password'}
              />
            </Field>

            {error && <p className="inline-error" role="alert">{error}</p>}

            <button disabled={busy || googleBusy} className="button primary full">
              {busy ? <LoaderCircle className="spin" size={16} /> : null}
              {register ? 'Create account' : 'Sign in to desk'}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="auth-switch text-center text-xs text-[var(--color-charcoal)] mt-5">
            {register ? 'Already registered?' : 'New to CreatorForge?'}
            <Link to={register ? '/login' : '/register'} className="text-[var(--color-ink-black)] underline font-normal ml-1">
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function ProjectForm({ project, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { data } = project
        ? await api.patch(`/projects/${project._id}`, values)
        : await api.post('/projects', values);
      onSaved(data);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={project ? 'Edit project' : 'Create new project'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Project title">
          <input
            autoFocus
            name="name"
            required
            maxLength={100}
            defaultValue={project?.name}
            placeholder="e.g. October Feature Dispatch"
          />
        </Field>
        <Field label="Brief & focus" hint="Provide background to guide the editorial synthesis.">
          <textarea
            name="description"
            rows={3}
            maxLength={500}
            defaultValue={project?.description}
            placeholder="What is this piece about, and what is its target channel?"
          />
        </Field>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy && <LoaderCircle className="spin" size={15} />}
            {project ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteDialog({ name, onClose, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <Dialog title="Delete this project?" onClose={onClose}>
      <p className="muted font-editorial-new">“{name}” and all of its media and draft history will be permanently deleted.</p>
      {error && <p role="alert" className="inline-error">{error}</p>}
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>
          Keep project
        </button>
        <button
          className="button danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onDelete();
            } catch (failure) {
              setError(errorText(failure));
              setBusy(false);
            }
          }}
        >
          Delete project
        </button>
      </div>
    </Dialog>
  );
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

  async function load() {
    setLoading(true);
    setError('');
    try {
      setProjects((await api.get('/projects')).data);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = projects.filter((project) =>
    `${project.name} ${project.description}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <main className="dashboard max-w-6xl mx-auto py-8 px-4 sm:px-6">
        <div className="page-title flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-3xl font-canopee font-normal tracking-[-0.035em] text-[var(--color-ink-black)] mb-1 leading-[0.98]">
              Editorial Desk · {auth.user.name.split(' ')[0]}
            </h1>
            <p className="text-[var(--color-charcoal)] font-editorial-new text-sm">
              Manage your publication projects, uploaded assets, and drafted dispatches.
            </p>
          </div>
          <button className="button primary shrink-0" onClick={() => setDialog({ type: 'create' })}>
            <Plus size={16} />New project
          </button>
        </div>

        <CreatorWelcome onCreate={() => setDialog({ type: 'create' })} />

        <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-[var(--color-ink-black)]">
          <span className="text-xs text-[var(--color-charcoal)] font-editorial-new">
            {projects.length} {projects.length === 1 ? 'project on file' : 'projects on file'}
          </span>

          <label className="search min-w-[240px]">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search projects"
              placeholder="Search projects…"
            />
          </label>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="empty-state">
            <p className="inline-error" role="alert">{error}</p>
            <button className="button secondary" onClick={load}>Try again</button>
          </div>
        ) : !projects.length ? (
          <div className="empty-state border border-[var(--color-ink-black)] rounded-[11.52px] bg-[var(--color-bone-cream)]">
            <div className="empty-illustration border border-[var(--color-ink-black)] bg-[var(--color-parchment)] text-[var(--color-ink-black)]">
              <Folder size={36} strokeWidth={1.25} />
              <span className="bg-[var(--color-ember-orange)] text-white"><Plus size={14} /></span>
            </div>
            <h2 className="font-canopee font-normal text-2xl text-[var(--color-ink-black)]">A blank broadsheet.</h2>
            <p className="font-editorial-new text-sm text-[var(--color-charcoal)]">
              Create a project, deposit your reference materials,<br className="desktop-only" /> and begin drafting your piece.
            </p>
            <button className="button primary" onClick={() => setDialog({ type: 'create' })}>
              <Plus size={15} />Create your first project
            </button>
            <div className="supported-formats text-[var(--color-charcoal)] font-editorial-new text-xs">
              <Image size={15} />Images
              <AudioLines size={15} />Audio
              <Video size={15} />Video
              <FileText size={15} />Manuscripts
            </div>
          </div>
        ) : visible.length ? (
          <div className="project-grid">
            {visible.map((project) => (
              <article className="project-card border border-[var(--color-ink-black)] bg-[var(--color-bone-cream)] rounded-[11.52px] shadow-[var(--shadow-sm)] group" key={project._id}>
                <Link to={`/project/${project._id}`} className="project-main p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="project-symbol bg-[var(--color-ink-black)] text-[var(--color-parchment)] rounded-[2.88px] p-2 inline-flex">
                      <Folder size={18} strokeWidth={1.5} />
                    </div>
                    <span className="new-badge">ACTIVE</span>
                  </div>
                  <h3 className="text-xl font-canopee font-normal text-[var(--color-ink-black)] group-hover:text-[var(--color-ember-orange)] transition-colors leading-[0.98]">{project.name}</h3>
                  <p className="text-[var(--color-charcoal)] font-editorial-new text-sm line-clamp-2 my-2 leading-[1.35]">{project.description || 'Editorial project workspace.'}</p>
                  <div className="project-stats text-xs text-[var(--color-charcoal)] font-editorial-new pt-2 border-t border-[var(--color-ink-black)]/20">
                    <span><FileText size={12} className="text-[var(--color-ink-black)]" />{project.mediaCount || 0} {project.mediaCount === 1 ? 'source' : 'sources'}</span>
                    <span><MessageSquare size={12} className="text-[var(--color-charcoal)]" />{project.messageCount || 0} {project.messageCount === 1 ? 'dispatch' : 'dispatches'}</span>
                  </div>
                </Link>
                <div className="project-footer px-5 py-2.5 border-t border-[var(--color-ink-black)] bg-[var(--color-elevated)] flex items-center justify-between text-xs text-[var(--color-charcoal)] font-editorial-new">
                  <span>Updated {new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <div className="flex items-center gap-1">
                    <button
                      className="icon-button hover:text-[var(--color-ink-black)]"
                      aria-label={`Edit ${project.name}`}
                      onClick={() => setDialog({ type: 'edit', project })}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-button hover:text-[#c03f13]"
                      aria-label={`Delete ${project.name}`}
                      onClick={() => setDialog({ type: 'delete', project })}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted py-8 text-center font-editorial-new">No projects match “{search}”.</p>
        )}

        <div className="dashboard-tip border border-[var(--color-ink-black)] bg-[var(--color-bone-cream)] rounded-[11.52px] my-8 shadow-[var(--shadow-sm)]">
          <Palette size={18} className="text-[var(--color-ink-black)]" />
          <div>
            <strong>House Style & Editorial Guidelines</strong>
            <p>Define your brand manual once to calibrate every generated piece of copy.</p>
          </div>
          <Link to="/settings/brandkit" className="text-[var(--color-ink-black)] font-normal underline hover:text-[var(--color-pure-black)] inline-flex items-center gap-1">
            Open style manual <ArrowRight size={14} />
          </Link>
        </div>
      </main>

      {dialog?.type === 'create' || dialog?.type === 'edit' ? (
        <ProjectForm
          project={dialog.project}
          onClose={() => setDialog(null)}
          onSaved={(project) => {
            setDialog(null);
            if (dialog.type === 'create') navigate(`/project/${project._id}`);
            else load();
            notify(dialog.type === 'create' ? 'Project created.' : 'Project updated.');
          }}
        />
      ) : dialog?.type === 'delete' ? (
        <DeleteDialog
          name={dialog.project.name}
          onClose={() => setDialog(null)}
          onDelete={async () => {
            await api.delete(`/projects/${dialog.project._id}`);
            setDialog(null);
            await load();
            notify('Project deleted.');
          }}
        />
      ) : null}
    </Shell>
  );
}

function MediaPreview({ asset, projectId, onClose, onSaved }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const dirty = useRef(false);

  useEffect(() => {
    if (asset.type === 'text') return;
    let active = true;
    let objectUrl;
    api.get(`/projects/${projectId}/media/${asset._id}/content`, { responseType: 'blob' })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        if (active) setUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((failure) => active && setError(errorText(failure)));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset._id, projectId, asset.type]);

  function close() {
    if (!dirty.current || window.confirm('Discard unsaved content changes?')) onClose();
  }

  return (
    <Dialog title={asset.name} onClose={close}>
      {asset.type === 'text' ? (
        <SavedContent
          projectId={projectId}
          assetId={asset._id}
          onSaved={onSaved}
          onDirtyChange={(value) => { dirty.current = value; }}
        />
      ) : error ? (
        <p role="alert" className="inline-error">{error}</p>
      ) : !url ? (
        <Spinner />
      ) : asset.type === 'image' ? (
        <img className="preview-image rounded-none" src={url} alt={asset.name} />
      ) : asset.type === 'audio' ? (
        <audio controls src={url} className="w-full" />
      ) : asset.type === 'video' ? (
        <video className="preview-video rounded-none" controls src={url} />
      ) : (
        <iframe className="preview-pdf" title={asset.name} src={url} />
      )}
    </Dialog>
  );
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
  const [draftResponse, setDraftResponse] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const generation = useRef(null);
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
  const currentProjectId = useRef(id);
  currentProjectId.current = id;
  const savingResponse = useRef(null);
  const [savingMessageId, setSavingMessageId] = useState('');

  useEffect(() => {
    let active = true;
    setBusy(false);
    setPending('');
    setDraftResponse('');
    setInput('');
    setSelectedSkillId('');
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/media`),
      api.get(`/projects/${id}/messages`),
    ])
      .then(([details, assets, history]) => {
        if (active) {
          setProject(details.data);
          setMedia(assets.data);
          setMessages(history.data);
        }
      })
      .catch((failure) => active && setError(errorText(failure)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      generation.current?.abort();
      generation.current = null;
    };
  }, [id]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [messages, pending, draftResponse]);

  async function uploadFiles(files) {
    if (uploading) return;
    setUploading(true);
    setDragging(false);
    for (const file of files) {
      if (file.size > fileLimit) {
        notify(`${file.name} exceeds the 5 MB limit.`, 'error');
        continue;
      }
      const payload = new FormData();
      const extension = file.name.split('.').pop().toLowerCase();
      const textType = { txt: 'text/plain', md: 'text/markdown', csv: 'text/csv' }[extension];
      payload.append('file', textType ? new File([file], file.name, { type: textType }) : file);
      setProgress(0);
      try {
        const { data } = await api.post(`/projects/${id}/media`, payload, {
          onUploadProgress: (event) => setProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
        });
        setMedia((assets) => [data, ...assets]);
        notify(`${file.name} deposited.`);
      } catch (failure) {
        notify(errorText(failure), 'error');
      }
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function send(event, prompt) {
    event?.preventDefault();
    const message = (prompt || input).trim();
    if (!message || busy || generation.current) return;
    const controller = new AbortController();
    generation.current = controller;
    const active = () => generation.current === controller && currentProjectId.current === id;
    setBusy(true);
    setPending(message);
    setInput(message);
    setDraftResponse('');
    try {
      const data = await streamChat({ projectId: id, message, ...(selectedSkillId ? { skillId: selectedSkillId } : {}) }, { signal: controller.signal, onDelta: (content) => active() && setDraftResponse(content) });
      if (!active()) return;
      setMessages((history) => [...history, data.userMessage, data.assistantMessage]);
      setInput('');
    } catch (failure) {
      if (active()) notify(failure.name === 'AbortError' ? 'Generation stopped. Your draft prompt was preserved.' : errorText(failure), failure.name === 'AbortError' ? 'info' : 'error');
    } finally {
      if (active()) {
        generation.current = null;
        setBusy(false);
        setPending('');
        setDraftResponse('');
      }
    }
  }

  async function remix(event) {
    event.preventDefault();
    if (outputDirty && !window.confirm('Discard unsaved edits and create a new remix?')) return;
    setBusy(true);
    try {
      const { data } = await api.post('/remix', { projectId: id, mediaId: source, format, instructions });
      setOutputAssetId(data.mediaId);
      setOutputDirty(false);
      setMedia((await api.get(`/projects/${id}/media`)).data);
      notify('Remixed copy generated and saved to library.');
    } catch (failure) {
      notify(errorText(failure), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function saveResponse(message) {
    if (savingResponse.current || media.some((asset) => asset.sourceMessageId === message._id)) return;
    const request = { projectId: id, messageId: message._id };
    savingResponse.current = request;
    setSavingMessageId(message._id);
    try {
      const { data } = await api.post(`/projects/${id}/messages/${message._id}/save`, {});
      if (currentProjectId.current !== request.projectId) return;
      setMedia((assets) => [data, ...assets.filter((asset) => asset._id !== data._id)]);
      notify('Dispatch saved to source library for editing.');
    } catch (failure) {
      if (currentProjectId.current === request.projectId) notify(errorText(failure), 'error');
    } finally {
      if (savingResponse.current === request) {
        savingResponse.current = null;
        setSavingMessageId('');
      }
    }
  }

  function contentSaved(asset) {
    setMedia((assets) => assets.map((item) => (item._id === asset._id ? asset : item)));
    notify('Content changes saved to your project.');
  }

  async function copy(content) {
    try {
      await navigator.clipboard.writeText(content);
      notify('Copied to clipboard.');
    } catch {
      notify('Clipboard access unavailable. Select and copy text directly.', 'error');
    }
  }

  if (loading) return <Shell><Spinner /></Shell>;
  if (error) {
    return (
      <Shell>
        <div className="empty-state">
          <p className="inline-error" role="alert">{error}</p>
          <Link className="button secondary" to="/dashboard">Back to projects</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell workspace>
      <div className="workspace-top border-b border-[var(--color-ink-black)] bg-[var(--color-parchment)] px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="breadcrumbs flex items-center gap-2 text-sm text-[var(--color-charcoal)] font-editorial-new">
            <Link to="/dashboard" className="hover:text-[var(--color-ink-black)] underline underline-offset-2">Projects</Link>
            <ChevronRight size={13} className="text-[var(--color-charcoal)]" />
            <strong className="text-[var(--color-ink-black)] font-normal font-canopee text-lg">{project.name}</strong>
          </div>
          <button className="icon-button" aria-label="Edit project" onClick={() => setEditProject(true)}>
            <Pencil size={14} />
          </button>
        </div>
      </div>

      <main className="workspace">
        <aside className="media-rail bg-[var(--color-bone-cream)] border-r border-[var(--color-ink-black)]">
          <div className="rail-title mb-3">
            <h2 className="font-canopee font-normal text-xl text-[var(--color-ink-black)]">
              Source desk <span className="count">{media.length}</span>
            </h2>
            <span className="muted text-xs font-editorial-new">Manuscripts, recordings & visual proofs</span>
          </div>

          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.mp3,.wav,.mp4,.webm,.pdf,.txt,.md,.csv"
            aria-label="Upload media files"
            onChange={(event) => uploadFiles(Array.from(event.target.files || []))}
          />

          <button
            className={`upload-zone ${dragging ? 'dragging' : ''} border border-dashed border-[var(--color-ink-black)] hover:bg-[var(--color-parchment)] transition-colors bg-[var(--color-parchment)] rounded-[2.88px]`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              uploadFiles(Array.from(event.dataTransfer.files));
            }}
            onClick={() => fileInput.current.click()}
            disabled={uploading}
          >
            <Upload size={20} className="text-[var(--color-ink-black)]" />
            <strong>{uploading ? `Depositing… ${progress}%` : 'Deposit files into project'}</strong>
            <span className="text-xs">{uploading ? 'Archiving source material' : 'or click to browse'}</span>
            <small>Images, audio, video, PDF & text · 5 MB each</small>
            {uploading && <progress aria-label="Upload progress" value={progress} max="100" />}
          </button>

          <div className="asset-list">
            {media.map((asset) => {
              const Icon = mediaIcons[asset.type] || FileText;
              return (
                <div className="asset border border-[var(--color-ink-black)] bg-[var(--color-parchment)] rounded-[2.88px] transition-colors" key={asset._id}>
                  <button className="asset-open" onClick={() => setPreview(asset)}>
                    <span className="asset-icon text-[var(--color-ink-black)]">
                      <Icon size={17} />
                    </span>
                    <span>
                      <strong className="font-editorial-new font-normal">{asset.name}</strong>
                      <small>{asset.type.toUpperCase()} · {sizeLabel(asset.size)}</small>
                    </span>
                  </button>
                  <button
                    className="icon-button asset-delete"
                    aria-label={`Remove ${asset.name}`}
                    disabled={busy || outputDirty}
                    onClick={async () => {
                      try {
                        await api.delete(`/projects/${id}/media/${asset._id}`);
                        setMedia((assets) => assets.filter((item) => item._id !== asset._id));
                        if (source === asset._id) setSource('');
                        if (outputAssetId === asset._id) setOutputAssetId('');
                        notify('Asset removed.');
                      } catch (failure) {
                        notify(errorText(failure), 'error');
                      }
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {!media.length && (
            <div className="rail-empty">
              <FileText size={18} />
              <p>Your source materials live here.<br />Deposit a brief, recording, or image.</p>
            </div>
          )}

          <div className="context-note border border-[var(--color-ink-black)] bg-[var(--color-parchment)] rounded-[2.88px] p-2.5 mt-auto">
            <Sparkles size={14} className="text-[var(--color-ember-orange)]" />
            <span>Chat uses all files in context.<br />Remix focuses on your chosen asset.</span>
          </div>
        </aside>

        <section className="creation-panel bg-[var(--color-parchment)]">
          <div className="workspace-tabs border-b border-[var(--color-ink-black)]" role="tablist" aria-label="Creation tools">
            <button
              id="chat-tab"
              role="tab"
              aria-controls="creation-content"
              aria-selected={tab === 'chat'}
              className={tab === 'chat' ? 'active' : ''}
              onClick={() => {
                if (!outputDirty || window.confirm('Discard unsaved content changes?')) {
                  setTab('chat');
                  setOutputDirty(false);
                }
              }}
            >
              <MessageSquare size={16} />Editorial Chat
            </button>
            <button
              id="remix-tab"
              role="tab"
              aria-controls="creation-content"
              aria-selected={tab === 'remix'}
              className={tab === 'remix' ? 'active' : ''}
              onClick={() => setTab('remix')}
            >
              <WandSparkles size={16} />Cross-Remix
            </button>
            <span className="context-counter font-editorial-new text-xs">
              <FileText size={13} className="text-[var(--color-ink-black)]" />{media.length} references in context
            </span>
          </div>

          {health && !health.aiConfigured && (
            <div className="connection-notice" role="status">
              <span className="warning-dot" />
              <span>
                <strong>{health.aiConfiguration?.keyPresent && health.aiConfiguration?.modelPresent ? 'AI generation is paused.' : 'AI connection needed.'}</strong>{' '}
                {health.aiConfiguration?.keyPresent && health.aiConfiguration?.modelPresent ? 'Key and model configured. Run check:ai before enabling.' : 'Configure GEMINI_API_KEY and GEMINI_MODEL in server/.env.'}
              </span>
            </div>
          )}

          {tab === 'chat' && <section className="workspace-skills m-4 p-3.5 border border-[var(--color-ink-black)] rounded-[2.88px] bg-[var(--color-bone-cream)]" aria-label="Project skills">
            <div className="workspace-skills-heading"><h3 className="font-canopee text-base font-normal">Active Editorial Skills</h3><Link to={`/skills?project=${id}`} className="text-xs text-[var(--color-ink-black)] underline">Configure skills</Link></div>
            {project.skillIds?.length ? <>
              <label className="text-xs text-[var(--color-charcoal)]">Select skill register<select aria-label="Active project skill" value={selectedSkillId} disabled={busy} onChange={event => setSelectedSkillId(event.target.value)} className="mt-1 bg-[var(--color-parchment)] text-sm border border-[var(--color-ink-black)] rounded-[2.88px]"><option value="">General broadsheet chat</option>{project.skillIds.map(identifier => { const skill = skillById(identifier); return skill && <option key={identifier} value={identifier}>{skill.title} · {skill.agent.name}</option>; })}</select></label>
              {selectedSkillId && <><p className="text-xs text-[var(--color-charcoal)] mt-1">{skillById(selectedSkillId)?.description}</p><button className="button secondary small mt-2" disabled={busy || (skillById(selectedSkillId)?.sourceTypes.length > 0 && !media.some(asset => skillById(selectedSkillId).sourceTypes.includes(asset.type)))} onClick={() => send(null, skillById(selectedSkillId).prompt)}><Sparkles size={13} />Run {skillById(selectedSkillId)?.agent.name}</button></>}
            </> : <p className="text-xs text-[var(--color-charcoal)] mt-1">Assign specialized skills, or use free-form editorial chat and remix.</p>}
          </section>}

          <div id="creation-content" role="tabpanel" aria-labelledby={tab === 'chat' ? 'chat-tab' : 'remix-tab'} className="creation-content">
            {tab === 'chat' ? (
              <>
                <div className="chat-scroll">
                  {!messages.length && !pending ? (
                    <div className="chat-welcome">
                      <span className="sparkle-mark bg-[var(--color-bone-cream)] border border-[var(--color-ink-black)] text-[var(--color-ember-orange)]">
                        <Sparkles size={24} strokeWidth={1.5} />
                      </span>
                      <h1 className="font-canopee font-normal text-3xl text-[var(--color-ink-black)] leading-[0.98]">What are we drafting today?</h1>
                      <p className="font-editorial-new text-sm text-[var(--color-charcoal)] mt-1.5 leading-[1.35]">
                        {media.length
                          ? 'Your sources are loaded into context. Query the facts, draft a piece, or remix into target formats.'
                          : 'Deposit your notes, recordings, or briefs to provide foundational context for generation.'}
                      </p>
                      <div className="prompt-grid">
                        {[
                          ['Extract the lead', 'Summarize the primary thesis and key points across my uploaded assets.', FileText],
                          ['Draft social thread', 'Write a cohesive 5-part thread based on my project materials.', Image],
                          ['Draft analysis column', 'Synthesize the notes into a structured 600-word analysis column.', Pencil],
                          ['Write video script', 'Structure my source materials into a 90-second audiovisual script.', Video],
                        ].map(([label, prompt, Icon]) => (
                          <button key={label} onClick={() => setInput(prompt)} className="border border-[var(--color-ink-black)] bg-[var(--color-bone-cream)] hover:bg-[var(--color-parchment)] transition-colors text-left rounded-[2.88px] p-3">
                            <Icon size={16} className="text-[var(--color-ember-orange)]" />
                            <span className="font-editorial-new text-sm text-[var(--color-ink-black)]">{label}</span>
                            <ArrowRight size={14} className="text-[var(--color-ink-black)] ml-auto" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="messages">
                      {messages.map((message) => (
                        <article className={`message ${message.role}`} key={message._id}>
                          <span className={`message-avatar ${message.role === 'model' ? 'bg-[var(--color-ember-orange)] text-white border-transparent' : 'bg-[var(--color-ink-black)] text-[var(--color-parchment)]'}`}>
                            {message.role === 'model' ? <Sparkles size={15} /> : 'You'}
                          </span>
                          <div>
                            <header>
                              <strong className="font-canopee font-normal text-base">{message.role === 'model' ? 'CreatorForge Newsroom' : 'Editor'}</strong>
                              <span className="font-mono text-xs">
                                {new Date(message.createdAt).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {message.role === 'model' && <ChatMessageActions saved={media.some((asset) => asset.sourceMessageId === message._id)} saving={savingMessageId === message._id} disabled={Boolean(savingMessageId)} onSave={() => saveResponse(message)} onCopy={() => copy(message.content)} />}
                            </header>
                            <div className="markdown">
                              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                            </div>
                          </div>
                        </article>
                      ))}
                      {pending && (
                        <>
                          <article className="message user">
                            <span className="message-avatar">You</span>
                            <div>
                              <header><strong className="font-canopee font-normal">Editor</strong></header>
                              <p className="font-editorial-new">{pending}</p>
                            </div>
                          </article>
                          {draftResponse && <article className="message model" aria-label="Response in progress">
                            <span className="message-avatar"><Sparkles size={15} /></span>
                            <div><header><strong className="font-canopee font-normal">CreatorForge</strong><span className="text-xs font-mono">Draft in progress…</span></header>
                              <div className="markdown"><Markdown remarkPlugins={[remarkGfm]}>{draftResponse}</Markdown></div>
                            </div>
                          </article>}
                          <div className="generating text-[var(--color-ink-black)] font-editorial-new" role="status">
                            <LoaderCircle className="spin text-[var(--color-ember-orange)]" size={16} />{draftResponse ? 'Drafting dispatch…' : 'Synthesizing sources…'}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>

                <div className="composer-wrap border-t border-[var(--color-ink-black)] bg-[var(--color-parchment)]">
                  {/* Format selector pills */}
                  <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 text-xs">
                    <span className="font-editorial-new text-xs uppercase text-[var(--color-charcoal)] mr-1 shrink-0">TARGET FORMAT:</span>
                    {formats.slice(0, 5).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setInput((prev) => prev ? `${prev}\n\nFormat as ${f}.` : `Write a ${f} based on this project.`)}
                        className="px-2.5 py-1 rounded-[2.88px] bg-[var(--color-bone-cream)] hover:bg-[var(--color-parchment)] border border-[var(--color-ink-black)] text-[var(--color-ink-black)] font-editorial-new text-xs shrink-0 transition-colors"
                      >
                        +{f}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={send} className="composer border border-[var(--color-ink-black)] bg-[var(--color-bone-cream)] rounded-[2.88px] shadow-[var(--shadow-sm)]">
                    <textarea
                      aria-label="Message CreatorForge"
                      rows={2}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask questions about your sources, or instruct what to draft…"
                      maxLength={10000}
                      disabled={busy}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          send(event);
                        }
                      }}
                    />
                    <div className="composer-footer border-t border-[var(--color-ink-black)]/20 pt-2">
                      <span className="text-[var(--color-charcoal)] font-editorial-new text-xs"><Sparkles size={12} className="text-[var(--color-ember-orange)]" />Context-aware + calibrated to your brand manual</span>
                      {pending ? <button key="stop-generation" type="button" className="send-button" aria-label="Stop generation" title="Stop generation" onClick={(event) => { event.preventDefault(); generation.current?.abort(); }}><span aria-hidden="true">■</span></button> : <button key="send-message" type="submit" className="send-button bg-[var(--color-ink-black)] text-[var(--color-parchment)] hover:bg-[var(--color-pure-black)]" aria-label="Send message" disabled={busy || !input.trim()}>
                        {busy ? <LoaderCircle className="spin" size={16} /> : <ArrowUp size={16} />}
                      </button>}
                    </div>
                  </form>
                  <p className="composer-note text-xs text-[var(--color-charcoal)] font-editorial-new">Produces editorial copy and outlines. Verify factual accuracy before publishing.</p>
                </div>
              </>
            ) : (
              <div className="remix-panel">
                <h1 className="text-2xl font-canopee font-normal text-[var(--color-ink-black)] mb-1 leading-[0.98]">Multi-format cross-remix.</h1>
                <p className="muted font-editorial-new text-sm">Select an asset, choose an output format, and reframe into new channels.</p>

                <form onSubmit={remix} className="remix-form">
                  <div className="two-columns">
                    <Field label="Source asset">
                      <select required value={source} onChange={(event) => setSource(event.target.value)}>
                        <option value="">Choose an asset…</option>
                        {media.map((asset) => (
                          <option key={asset._id} value={asset._id}>{asset.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Target format">
                      <select value={format} onChange={(event) => setFormat(event.target.value)}>
                        {formats.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Editorial instructions (optional)">
                    <textarea
                      rows={3}
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      maxLength={3000}
                      placeholder="Specify tone, angle, audience takeaway, or word count…"
                    />
                  </Field>

                  <button disabled={busy || !source} className="button primary">
                    {busy ? <LoaderCircle className="spin" size={15} /> : <WandSparkles size={15} />}
                    {busy ? 'Generating remix…' : 'Generate remix'}
                  </button>
                </form>

                {!media.length && <p className="muted font-editorial-new text-sm">Deposit at least one source file to unlock cross-remixing.</p>}

                {outputAssetId && (
                  <section className="remix-output">
                    <header>
                      <h2 className="font-canopee font-normal text-xl">Remixed content draft</h2>
                    </header>
                    <SavedContent
                      key={outputAssetId}
                      projectId={id}
                      assetId={outputAssetId}
                      onSaved={contentSaved}
                      onDirtyChange={setOutputDirty}
                    />
                  </section>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {preview && (
        <MediaPreview
          key={preview._id}
          projectId={id}
          asset={preview}
          onSaved={contentSaved}
          onClose={() => setPreview(null)}
        />
      )}
      {editProject && (
        <ProjectForm
          project={project}
          onClose={() => setEditProject(false)}
          onSaved={(value) => {
            setProject(value);
            setEditProject(false);
            notify('Project updated.');
          }}
        />
      )}
    </Shell>
  );
}

function BrandSettings() {
  const notify = useContext(Toast);
  const [brand, setBrand] = useState(defaultBrand);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [colorInput, setColorInput] = useState('');

  useEffect(() => {
    api.get('/brand-kit')
      .then(({ data }) => {
        const loaded = { ...defaultBrand, ...data };
        setBrand(loaded);
        setColorInput(loaded.colors?.join(', ') || '');
      })
      .catch((failure) => setError(errorText(failure)))
      .finally(() => setLoading(false));
  }, []);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { data } = await api.put('/brand-kit', {
        ...form,
        keywords: form.keywords.split(',').map((item) => item.trim()).filter(Boolean),
        colors: form.colors.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setBrand(data);
      notify('Brand manual saved. Guardrails will guide every generation.');
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <main className="brand-page max-w-6xl mx-auto py-8 px-4 sm:px-6">
        <Link className="back-link inline-flex items-center gap-2 text-sm text-[var(--color-charcoal)] hover:text-[var(--color-ink-black)] transition-colors mb-5 font-editorial-new" to="/dashboard">
          <ArrowLeft size={15} />Back to projects
        </Link>
        <div className="page-title flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-3xl md:text-4xl font-canopee font-normal tracking-[-0.035em] text-[var(--color-ink-black)] mb-1 leading-[0.98]">
              House Style & Brand Manual
            </h1>
            <p className="text-[var(--color-charcoal)] font-editorial-new text-sm">
              Define your publication voice, audience profile, and copy guidelines once.
            </p>
          </div>
          <span className="brand-emblem flex items-center justify-center w-14 h-14 rounded-[2.88px] bg-[var(--color-bone-cream)] border border-[var(--color-ink-black)] text-[var(--color-ember-orange)] shrink-0">
            <Palette size={24} />
          </span>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <div className="brand-layout grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <form onSubmit={save} className="brand-form bg-[var(--color-bone-cream)] border border-[var(--color-ink-black)] p-6 md:p-8 rounded-[11.52px] shadow-[var(--shadow-sm)]">
              <div className="mb-5 pb-2.5 border-b border-[var(--color-ink-black)]">
                <h2 className="text-lg font-canopee font-normal text-[var(--color-ink-black)]">The Essentials</h2>
              </div>

              <Field label="Publication / Brand name">
                <input
                  name="name"
                  defaultValue={brand.name}
                  maxLength={100}
                  placeholder="Your publication or studio name"
                />
              </Field>

              <div className="two-columns">
                <Field label="Voice & Register">
                  <input
                    name="tone"
                    defaultValue={brand.tone}
                    maxLength={200}
                    placeholder="Authoritative, journalistic, conversational…"
                  />
                </Field>
                <Field label="Target Readership">
                  <input
                    name="audience"
                    defaultValue={brand.audience}
                    maxLength={500}
                    placeholder="Who are you writing for?"
                  />
                </Field>
              </div>

              <Field label="Style Keywords" hint="Keywords separated by commas.">
                <input
                  name="keywords"
                  defaultValue={brand.keywords.join(', ')}
                  placeholder="Precise, incisive, observational"
                />
              </Field>
              <div>
                <Field label="Palette (Hex codes)" hint="Hex codes separated by commas, e.g. #1D1D1B, #C03F13, #E2DEDB.">
                  <input
                    name="colors"
                    value={colorInput}
                    onChange={(event) => setColorInput(event.target.value)}
                    placeholder="#1D1D1B, #C03F13, #E2DEDB"
                  />
                </Field>
                <BrandColorPreview colors={colorInput} />
              </div>

              <div className="flex items-center justify-between mt-7 mb-5 pb-2.5 border-b border-[var(--color-ink-black)]">
                <h2 className="guidelines-heading text-lg font-canopee font-normal text-[var(--color-ink-black)]">Editorial Guardrails</h2>
              </div>

              <Field label="Editorial Guidelines & Style Rules">
                <textarea
                  name="guidelines"
                  rows={6}
                  defaultValue={brand.guidelines}
                  maxLength={10000}
                  placeholder="What rules should drafts follow? Prohibited clichés, required citations, headline conventions, and tone directives."
                />
              </Field>

              {error && <p className="inline-error" role="alert">{error}</p>}

              <button disabled={busy} className="button primary mt-4">
                {busy ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}Save brand manual
              </button>
            </form>

            <aside className="brand-explainer bg-[var(--color-bone-cream)] border border-[var(--color-ink-black)] p-6 rounded-[11.52px] self-start shadow-[var(--shadow-sm)]">
              <Sparkles size={20} className="text-[var(--color-ember-orange)] mb-3" />
              <h2 className="text-xl font-canopee font-normal text-[var(--color-ink-black)] mb-2 leading-[0.98]">
                One standard.<br />Every dispatch.
              </h2>
              <p className="text-xs text-[var(--color-charcoal)] mb-5 leading-[1.35] font-editorial-new">
                Your saved manual is injected as system guidance into every AI prompt across this studio.
              </p>
              <div className="space-y-2.5 font-editorial-new text-xs">
                <div className="brand-rule flex items-center gap-2"><Check size={14} className="text-[var(--color-ember-orange)] shrink-0" />Custom tone of voice</div>
                <div className="brand-rule flex items-center gap-2"><Check size={14} className="text-[var(--color-ember-orange)] shrink-0" />Audience-calibrated vocabulary</div>
                <div className="brand-rule flex items-center gap-2"><Check size={14} className="text-[var(--color-ember-orange)] shrink-0" />Editorial rules enforced natively</div>
              </div>
              <p className="brand-footnote text-xs text-[var(--color-charcoal)] pt-3.5 border-t border-[var(--color-ink-black)] mt-5 leading-[1.35] font-editorial-new">
                CreatorForge generates publication-grade text, dispatches, and scripts.
              </p>
            </aside>
          </div>
        )}
      </main>
    </Shell>
  );
}
