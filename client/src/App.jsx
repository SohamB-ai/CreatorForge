import { cloneElement, createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  AudioLines,
  Check,
  ChevronRight,
  Copy,
  FileText,
  Flame,
  Folder,
  Image,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  X,
  BookOpen,
  Feather,
  Scroll,
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
import { BorderBeam } from './components/BorderBeam.jsx';
import { BentoGrid } from './components/BentoGrid.jsx';
import { TrustWall } from './components/TrustWall.jsx';
import { ShimmerButton } from './components/ShimmerButton.jsx';
import { BrandColorPreview } from './components/BrandColorPreview.jsx';
import { OrnateDivider } from './components/OrnateDivider.jsx';
import { AtmosphereOverlay } from './components/AtmosphereOverlay.jsx';
import { GoldenCursorTrail } from './components/GoldenCursorTrail.jsx';
import { ScrollProgress } from './components/ScrollProgress.jsx';
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
      <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-[6px] border-2 border-[var(--accent)] bg-[var(--surface)] flex items-center justify-center shadow-[0_0_14px_var(--soft)] group-hover:border-[var(--accent-light)] group-hover:shadow-[0_0_22px_var(--soft)] group-hover:scale-105 transition-all duration-300">
        <img
          src="/assets/pen_and_sword_badge.svg"
          alt="CreatorForge insignia"
          className="w-7 h-7 sm:w-8 sm:h-8 filter brightness-105 drop-shadow"
        />
      </span>
    </Link>
  );
}

function Spinner({ label = 'Loading your workspace…' }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin text-orange-500" size={22} />
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
          <X size={20} />
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
  const [light, setLight] = useState(() => localStorage.getItem('creatorforge.theme') === 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    if (light) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('creatorforge.theme', light ? 'light' : 'dark');
  }, [light]);

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
    light,
    toggleTheme: () => setLight((value) => !value),
  };

  return (
    <Auth.Provider value={auth}>
      <Toast.Provider value={(message, kind = 'success') => setToast({ message, kind })}>
        <ScrollProgress />
        <AtmosphereOverlay />
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
            {toast.kind === 'success' && <Check size={18} className="text-emerald-400" />}
            <span>{toast.message}</span>
            <button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast(null)}>
              <X size={16} />
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

function ThemeButton() {
  const auth = useContext(Auth);
  return (
    <button
      className="icon-button"
      onClick={auth.toggleTheme}
      aria-label={`Switch to ${auth.light ? 'dark' : 'light'} theme`}
    >
      {auth.light ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}

function Shell({ children, workspace = false }) {
  const auth = useContext(Auth);
  const navigate = useNavigate();

  return (
    <div className={`app-shell ${workspace ? 'workspace-shell' : ''}`}>
      <header className="app-header border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md">
        <Logo />
        <nav aria-label="Main navigation" className="font-display text-xs tracking-wider">
          <Link to="/dashboard" className="nav-link text-[var(--text)] hover:text-[var(--accent)]" aria-label="Projects">
            <LayoutGrid size={16} className="text-[var(--accent)]" />
            <span>Archives</span>
          </Link>
          <Link to="/settings/brandkit" className="nav-link text-[var(--text)] hover:text-[var(--accent)]" aria-label="Brand kit">
            <Palette size={16} className="text-[var(--accent)]" />
            <span>Lexicon</span>
          </Link>
        </nav>
        <div className="account flex items-center gap-3">
          <ThemeButton />
          <span className="avatar bg-[var(--soft)] border border-[var(--accent)]/40 text-[var(--accent)] font-semibold font-display" title={auth.user.name}>
            {auth.user.name.slice(0, 1).toUpperCase()}
          </span>
          <button
            className="icon-button hover:text-[var(--accent)]"
            aria-label="Sign out"
            onClick={() => {
              auth.logout();
              navigate('/login');
            }}
          >
            <LogOut size={18} />
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

  // GSAP ScrollTrigger & Stagger Choreography
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      // Hero copy stagger
      if (heroCopyRef.current) {
        gsap.fromTo(
          heroCopyRef.current.children,
          { opacity: 0, y: 26 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            stagger: 0.12,
            ease: 'power3.out',
          }
        );
      }

      // Hero archival desk entrance
      if (heroVisualRef.current) {
        gsap.fromTo(
          heroVisualRef.current,
          { opacity: 0, y: 38, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.05,
            delay: 0.2,
            ease: 'power3.out',
          }
        );

        // Smooth physical depth parallax as user scrolls down
        if (heroSectionRef.current) {
          gsap.to(heroVisualRef.current, {
            yPercent: 10,
            ease: 'none',
            scrollTrigger: {
              trigger: heroSectionRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        }
      }

      // Volume IV: Proclamation reveal
      if (proclamationRef.current) {
        gsap.fromTo(
          proclamationRef.current,
          { opacity: 0, y: 35, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.95,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: proclamationRef.current,
              start: 'top 85%',
            },
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
    <div className="landing max-w-6xl mx-auto px-6 py-4">
      <GoldenCursorTrail />
      <header className="landing-header border-b border-[var(--border)] py-5 flex items-center justify-between">
        <Logo />
        <div className="landing-actions flex items-center gap-6">
          <ThemeButton />
          <Link
            className="font-display text-xs uppercase tracking-[0.2em] text-[var(--accent)] hover:tracking-[0.26em] hover:text-[var(--accent-light)] transition-all flex items-center gap-2"
            to={auth.user ? '/dashboard' : '/login'}
          >
            {auth.user ? 'Enter Scriptorium' : 'Access Archives'}
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main>
        {/* Volume I: The Scriptorium Hero */}
        <section ref={heroSectionRef} className="hero py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div ref={heroCopyRef} className="hero-copy lg:col-span-6 will-change-transform">
            <span className="font-display text-[11px] font-semibold tracking-[0.3em] uppercase text-[var(--accent)] mb-4 block">
              Volume I · The Scriptorium
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-medium tracking-tight text-[var(--text)] leading-[1.08] mb-6">
              Many sources.<br />
              One enduring<br />
              <span className="text-[var(--accent)] italic font-normal">scholarship.</span>
            </h1>
            <p className="drop-cap text-lg text-[var(--muted)] font-body leading-relaxed max-w-lg mb-8">
              Gather your archival plates, vocal dictations, film fragments, and historical folios into one consecrated study. Transform scattered thoughts into timeless manuscripts in your distinctive voice.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <ShimmerButton to={next} className="primary">
                Inscribe Your Work <ArrowRight size={16} />
              </ShimmerButton>
              <Link to={auth.user ? '/dashboard' : '/login'} className="button secondary">
                Consult Archives
              </Link>
            </div>
          </div>

          <div ref={heroVisualRef} className="hero-visual lg:col-span-6 relative will-change-transform">
            <div className="ornate-frame p-6 md:p-8 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl transition-colors">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-5 font-display text-[10.5px] uppercase tracking-[0.22em] text-[var(--accent)]">
                <span className="flex items-center gap-2">
                  <BookOpen size={14} /> The Archival Desk
                </span>
                <span className="text-[var(--muted)]">Folio 01 · Active</span>
              </div>

              {/* Cathedral Arch-Topped Feature Plate */}
              <div className="arch-top overflow-hidden border border-[var(--border)] bg-[var(--elevated)] mb-5 relative group">
                <img
                  src="/assets/creative_studio_art.jpg"
                  alt="Archival study and creative references"
                  className="w-full h-56 object-cover object-center sepia-reveal hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)]/90 via-transparent to-transparent opacity-80" />
                <span className="absolute bottom-3 left-4 inline-flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.16em] text-[var(--text)] bg-[var(--surface)]/90 px-2.5 py-1 rounded-[3px] border border-[var(--border)] backdrop-blur-sm shadow-sm">
                  <Image size={12} className="text-[var(--accent)]" /> Reference Plate · Oil on Canvas
                </span>
              </div>

              {/* Multi-source cards grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div
                  onClick={() => setHeroVoicePlaying(!heroVoicePlaying)}
                  className="p-3 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)] flex flex-col justify-between shadow-sm cursor-pointer hover:border-[var(--accent)]/50 transition-colors group"
                  title={heroVoicePlaying ? 'Pause voice dictation' : 'Click to preview voice dictation'}
                >
                  <div className="flex items-center justify-between text-xs text-[var(--muted)] font-display">
                    <span className="flex items-center gap-1.5 group-hover:text-[var(--accent)] transition-colors">
                      <AudioLines size={12} className="text-[var(--accent)]" /> Voice Record
                    </span>
                    <span className="font-mono text-[10px] text-[var(--accent)]">{formatHeroTimer(heroVoiceSec)}</span>
                  </div>
                  <div className="h-6 flex items-center gap-1 mt-2">
                    {heroWaves.map((h, i) => (
                      <span
                        key={i}
                        style={{ height: `${h}%` }}
                        className={`w-1 rounded-[1px] transition-all duration-150 ${
                          heroVoicePlaying
                            ? 'bg-[var(--accent)] shadow-[0_0_4px_rgba(201,169,98,0.6)]'
                            : 'bg-[var(--accent)] opacity-70 group-hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)] flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[var(--muted)] font-display">
                    <span className="flex items-center gap-1.5"><FileText size={12} className="text-[var(--accent)]" /> Research Brief</span>
                    <span className="text-[10px] text-[var(--muted)]">V. 3.2</span>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    <div className="h-1 bg-[var(--border)] w-full rounded-[1px]" />
                    <div className="h-1 bg-[var(--border)] w-3/4 rounded-[1px]" />
                    <div className="h-1 bg-[var(--accent)]/40 w-1/2 rounded-[1px]" />
                  </div>
                </div>
              </div>

              {/* Synthesis result indicator */}
              <div className="p-3.5 rounded-[3px] bg-[var(--elevated)] border border-[var(--accent)]/40 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full border border-[var(--accent)] bg-[var(--surface)] flex items-center justify-center text-[var(--accent)] shadow-sm">
                    <Sparkles size={15} />
                  </span>
                  <div>
                    <strong className="block text-sm font-heading font-medium text-[var(--text)] tracking-normal">
                      Context becomes canon.
                    </strong>
                    <small className="text-xs text-[var(--muted)] font-body">
                      Synthesized into high-impact essays and scripts
                    </small>
                  </div>
                </div>
                <ArrowUp size={16} className="text-[var(--accent)]" />
              </div>
            </div>
          </div>
        </section>

        <OrnateDivider glyph="✶" />

        <TrustWall />

        <OrnateDivider glyph="❧" />

        <BentoGrid />

        <OrnateDivider glyph="✤" />

        {/* Volume IV: The Proclamation / Call to Action */}
        <section
          ref={proclamationRef}
          className="my-20 p-10 md:p-16 rounded-[4px] bg-[var(--surface)] border border-[var(--border)] text-center relative ornate-frame max-w-4xl mx-auto shadow-2xl overflow-hidden will-change-transform"
        >
          <BorderBeam size={260} duration={14} borderWidth={1.5} colorFrom="#FFE680" colorTo="#C9A962" />
          <span className="font-display text-[10.5px] font-semibold tracking-[0.3em] uppercase text-[var(--accent)] mb-3 block">
            Volume IV · The Proclamation
          </span>
          <h2 className="text-3xl md:text-5xl font-heading font-medium tracking-tight text-[var(--text)] mb-4">
            Ready to inscribe your creative legacy?
          </h2>
          <p className="text-[var(--muted)] font-body text-lg max-w-xl mx-auto mb-9 leading-relaxed">
            Create your first project archive, deposit your research and vocal dictations, and craft with unyielding scholarly conviction.
          </p>
          <div className="flex justify-center relative z-10">
            <ShimmerButton to={next} className="primary">
              Commence Creation <ArrowRight size={16} />
            </ShimmerButton>
          </div>
        </section>
      </main>


      <footer className="landing-footer flex flex-col sm:flex-row items-center justify-between py-10 border-t border-[var(--border)] text-xs font-body text-[var(--muted)] gap-4">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="font-display text-[10px] tracking-wider uppercase text-[var(--muted)]">
            A sanctuary for source preservation and scholarly craft.
          </span>
        </div>
        <div className="font-display text-[10px] tracking-widest uppercase text-[var(--muted)]">
          Anno Domini MMXXVI · CreatorForge · All rights reserved.
        </div>
      </footer>
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
    <div className="auth-page">
      <header className="border-b border-[var(--border)] py-4 flex items-center justify-between">
        <Logo />
        <ThemeButton />
      </header>
      <main className="auth-layout max-w-5xl mx-auto py-12 px-4">
        <aside className="pr-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text)] mb-3 font-heading">Less scattered.<br />More creative.</h1>
          <p className="text-[var(--muted)] text-base leading-relaxed">A home for your source material and the ideas it inspires.</p>
          <div className="mt-8 rounded-xl overflow-hidden border border-[var(--border)] max-w-sm bg-[var(--surface)] shadow-md">
            <img
              src="/assets/moodboard_photo.jpg"
              alt="Creative studio moodboard"
              className="w-full h-52 object-cover filter brightness-95"
            />
          </div>
          <div className="auth-source-icons flex items-center gap-4 mt-6 text-[var(--muted)]">
            <Image size={20} className="hover:text-[var(--accent)] transition-colors" />
            <AudioLines size={20} className="hover:text-[var(--accent)] transition-colors" />
            <Video size={20} className="hover:text-[var(--accent)] transition-colors" />
            <FileText size={20} className="hover:text-[var(--accent)] transition-colors" />
          </div>
        </aside>

        <section className="auth-form bg-[var(--surface)] border border-[var(--border)] p-8 md:p-10 rounded-2xl shadow-[var(--card-shadow)] relative">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-2 font-heading">{register ? 'Make room for your ideas.' : 'Welcome back.'}</h2>
          <p className="text-[var(--muted)] text-sm mb-6">
            {register
              ? 'Create an account to start your first project.'
              : 'Your projects and creative direction await.'}
          </p>

          <GoogleSignIn
            key={register ? 'register' : 'login'}
            disabled={busy}
            light={auth.light}
            onBusyChange={setGoogleBusy}
            onSuccess={(data) => {
              auth.signIn(data);
              navigate('/dashboard');
            }}
          />

          <form onSubmit={submit} className="mt-4">
            {register && (
              <Field label="Your name">
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={50}
                  placeholder="How should we call you?"
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
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
              {busy ? <LoaderCircle className="spin" size={18} /> : null}
              {register ? 'Create account' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="auth-switch text-center text-xs text-[var(--muted)] mt-6">
            {register ? 'Already have an account?' : 'New to CreatorForge?'}
            <Link to={register ? '/login' : '/register'} className="text-[var(--accent)] hover:underline font-medium ml-1">
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
    <Dialog title={project ? 'Edit project' : 'A new creative direction'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Project name">
          <input
            autoFocus
            name="name"
            required
            maxLength={100}
            defaultValue={project?.name}
            placeholder="e.g. Autumn launch campaign"
          />
        </Field>
        <Field label="Brief" hint="A little context helps shape better content.">
          <textarea
            name="description"
            rows={3}
            maxLength={500}
            defaultValue={project?.description}
            placeholder="What are you creating, and who is it for?"
          />
        </Field>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy && <LoaderCircle className="spin" size={16} />}
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
      <p className="muted">“{name}” and all of its media and chat history will be permanently deleted.</p>
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
  const [category, setCategory] = useState('All Projects');
  const [dialog, setDialog] = useState(null);

  const categories = ['All Projects', 'Video Scripts', 'X Threads', 'Newsletters', 'Brand Kits'];

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
        <div className="page-title flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] mb-2 font-heading">Let's make something, {auth.user.name.split(' ')[0]}.</h1>
            <p className="text-[var(--muted)] text-sm">Every great piece of content starts with a place for your ideas.</p>
          </div>
          <button className="button primary shrink-0" onClick={() => setDialog({ type: 'create' })}>
            <Plus size={18} />New project
          </button>
        </div>

        <CreatorWelcome onCreate={() => setDialog({ type: 'create' })} />

        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <span className="text-xs text-[var(--muted)] font-medium">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </span>

          <label className="search min-w-[240px]">
            <Search size={17} />
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
          <div className="empty-state border border-[var(--border)] rounded-2xl bg-[var(--surface)]">
            <div className="empty-illustration border border-[var(--accent)]/30 bg-[var(--soft)] text-[var(--accent)]">
              <Folder size={42} strokeWidth={1.25} />
              <span className="bg-[var(--accent)] text-[var(--surface)]"><Plus size={17} /></span>
            </div>
            <h2>A blank canvas. A world of possibilities.</h2>
            <p>Create a project, bring in your source material,<br className="desktop-only" /> and give your next idea a home.</p>
            <button className="button primary" onClick={() => setDialog({ type: 'create' })}>
              <Plus size={17} />Create your first project
            </button>
            <div className="supported-formats text-[var(--muted)]">
              <Image size={17} />Images
              <AudioLines size={17} />Audio
              <Video size={17} />Video
              <FileText size={17} />Documents
            </div>
          </div>
        ) : visible.length ? (
          <div className="project-grid">
            {visible.map((project) => (
              <article className="project-card border border-[var(--border)] bg-[var(--surface)] rounded-xl hover:border-[var(--accent)] shadow-sm hover:shadow-md transition-all group" key={project._id}>
                <Link to={`/project/${project._id}`} className="project-main p-5">
                  <div className="project-symbol bg-[var(--elevated)] border border-[var(--border)] text-[var(--accent)] rounded-lg p-2.5 inline-flex mb-3 group-hover:scale-105 transition-transform">
                    <Folder size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors font-heading">{project.name}</h3>
                  <p className="text-[var(--muted)] text-sm line-clamp-2 my-2">{project.description || 'Your project workspace.'}</p>
                  <div className="project-stats text-xs text-[var(--muted)] pt-2 border-t border-[var(--border)]">
                    <span><FileText size={13} className="text-[var(--accent)]" />{project.mediaCount || 0} {project.mediaCount === 1 ? 'source' : 'sources'}</span>
                    <span><MessageSquare size={13} className="text-[var(--muted)]" />{project.messageCount || 0} {project.messageCount === 1 ? 'message' : 'messages'}</span>
                  </div>
                </Link>
                <div className="project-footer px-5 py-3 border-t border-[var(--border)] bg-[var(--elevated)] flex items-center justify-between text-xs text-[var(--muted)]">
                  <span className="font-mono">Updated {new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <div className="flex items-center gap-1">
                    <button
                      className="icon-button hover:text-[var(--text)]"
                      aria-label={`Edit ${project.name}`}
                      onClick={() => setDialog({ type: 'edit', project })}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button hover:text-red-400"
                      aria-label={`Delete ${project.name}`}
                      onClick={() => setDialog({ type: 'delete', project })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted py-8 text-center">No projects match “{search}”.</p>
        )}

        <div className="dashboard-tip border border-[var(--border)] bg-[var(--surface)] rounded-xl my-8 shadow-sm">
          <Palette size={20} className="text-[var(--accent)]" />
          <div>
            <strong>Your voice, in every creation.</strong>
            <p>Set up your brand kit to keep all your AI-generated content on-brand.</p>
          </div>
          <Link to="/settings/brandkit" className="text-[var(--accent)] font-medium hover:underline inline-flex items-center gap-1">
            Set up brand kit <ArrowRight size={16} />
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
        <img className="preview-image" src={url} alt={asset.name} />
      ) : asset.type === 'audio' ? (
        <audio controls src={url} />
      ) : asset.type === 'video' ? (
        <video className="preview-video" controls src={url} />
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
        notify(`${file.name} uploaded.`);
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
      if (active()) notify(failure.name === 'AbortError' ? 'Generation stopped. Your prompt is kept; no partial response was saved.' : errorText(failure), failure.name === 'AbortError' ? 'info' : 'error');
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
      notify('Remix created and saved to your assets.');
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
      notify('Response saved to your source library. Open it to edit or export.');
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
      notify('Clipboard access is unavailable. Select and copy the text instead.', 'error');
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
      <div className="workspace-top border-b border-[var(--border)] bg-[var(--surface)]/95 px-6 py-3 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="breadcrumbs flex items-center gap-2 text-sm text-[var(--muted)]">
            <Link to="/dashboard" className="hover:text-[var(--text)] transition-colors">Projects</Link>
            <ChevronRight size={14} className="text-[var(--muted)]" />
            <strong className="text-[var(--text)] font-medium font-heading">{project.name}</strong>
          </div>
          <button className="icon-button" aria-label="Edit project" onClick={() => setEditProject(true)}>
            <Pencil size={15} />
          </button>
        </div>
      </div>

      <main className="workspace">
        <aside className="media-rail bg-[var(--surface)] border-r border-[var(--border)]">
          <div className="rail-title mb-4">
            <h2>Source library <span className="count">{media.length}</span></h2>
            <span className="muted text-xs">Project files and references</span>
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
            className={`upload-zone ${dragging ? 'dragging' : ''} border border-dashed border-[var(--border-strong)] hover:border-[var(--accent)] transition-colors bg-[var(--elevated)]/50`}
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
            <Upload size={23} className="text-[var(--accent)]" />
            <strong>{uploading ? `Uploading… ${progress}%` : 'Drop your files here'}</strong>
            <span>{uploading ? 'Keeping your sources together' : 'or click to browse'}</span>
            <small>Images, audio, video, PDF & text · 5 MB each</small>
            {uploading && <progress aria-label="Upload progress" value={progress} max="100" />}
          </button>

          <div className="asset-list">
            {media.map((asset) => {
              const Icon = mediaIcons[asset.type] || FileText;
              return (
                <div className="asset border border-[var(--border)] bg-[var(--elevated)] hover:border-[var(--accent)] rounded-lg transition-colors" key={asset._id}>
                  <button className="asset-open" onClick={() => setPreview(asset)}>
                    <span className={`asset-icon ${asset.type} text-[var(--accent)]`}>
                      <Icon size={20} />
                    </span>
                    <span>
                      <strong>{asset.name}</strong>
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
              <FileText size={20} />
              <p>Your source material lives here.<br />Upload a brief or a first idea.</p>
            </div>
          )}

          <div className="context-note border border-[var(--border)] bg-[var(--elevated)] rounded-lg p-3">
            <Sparkles size={15} className="text-[var(--accent)]" />
            <span>Chat uses every asset in this project.<br />Remix focuses on the one you choose.</span>
          </div>
        </aside>

        <section className="creation-panel bg-[var(--bg)]">
          <div className="workspace-tabs border-b border-[var(--border)]" role="tablist" aria-label="Creation tools">
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
              <MessageSquare size={17} />AI chat
            </button>
            <button
              id="remix-tab"
              role="tab"
              aria-controls="creation-content"
              aria-selected={tab === 'remix'}
              className={tab === 'remix' ? 'active' : ''}
              onClick={() => setTab('remix')}
            >
              <WandSparkles size={17} />Content remix
            </button>
            <span className="context-counter font-mono text-xs">
              <FileText size={14} className="text-[var(--accent)]" />{media.length} assets in context
            </span>
          </div>

          {health && !health.aiConfigured && (
            <div className="connection-notice" role="status">
              <span className="warning-dot" />
              <span>
                <strong>{health.aiConfiguration?.keyPresent && health.aiConfiguration?.modelPresent ? 'AI generation is paused.' : 'AI connection needed.'}</strong>{' '}
                {health.aiConfiguration?.keyPresent && health.aiConfiguration?.modelPresent ? 'Key and model are configured. Verify provider access with npm run check:ai before enabling generation.' : 'Your projects and uploads work now. Configure GEMINI_API_KEY and GEMINI_MODEL, then explicitly enable AI generation.'}
              </span>
            </div>
          )}

          {tab === 'chat' && <section className="workspace-skills" aria-label="Project skills">
            <div className="workspace-skills-heading"><h3>Project skills & agents</h3><Link to={`/skills?project=${id}`}>Add skills</Link></div>
            {project.skillIds?.length ? <>
              <label>Active skill<select aria-label="Active project skill" value={selectedSkillId} disabled={busy} onChange={event => setSelectedSkillId(event.target.value)}><option value="">General project chat</option>{project.skillIds.map(identifier => { const skill = skillById(identifier); return skill && <option key={identifier} value={identifier}>{skill.title} · {skill.agent.name}</option>; })}</select></label>
              {selectedSkillId && <><p>{skillById(selectedSkillId)?.description} Source: {skillById(selectedSkillId)?.inputs}. This agent returns text, not rendered media.</p><button className="button secondary" disabled={busy || (skillById(selectedSkillId)?.sourceTypes.length > 0 && !media.some(asset => skillById(selectedSkillId).sourceTypes.includes(asset.type)))} onClick={() => send(null, skillById(selectedSkillId).prompt)}><Sparkles size={15} />Run {skillById(selectedSkillId)?.agent.name}</button></>}
            </> : <p>Add specialist skills to this project, or keep using general chat and remix.</p>}
          </section>}

          <div id="creation-content" role="tabpanel" aria-labelledby={tab === 'chat' ? 'chat-tab' : 'remix-tab'} className="creation-content">
            {tab === 'chat' ? (
              <>
                <div className="chat-scroll">
                  {!messages.length && !pending ? (
                    <div className="chat-welcome">
                      <span className="sparkle-mark bg-[var(--soft)] border border-[var(--accent)]/30 text-[var(--accent)]">
                        <Sparkles size={28} strokeWidth={1.5} />
                      </span>
                      <h1>What are we creating today?</h1>
                      <p>
                        {media.length
                          ? 'Your source material is in context. Ask a question or turn it into something new.'
                          : 'Upload your source material, then ask questions, find the story, or create your next piece of content.'}
                      </p>
                      <div className="prompt-grid">
                        {[
                          ['Find the story', 'Summarize the key ideas across my uploaded assets.', FileText],
                          ['Write a caption', 'Write three Instagram captions based on my project assets.', Image],
                          ['Draft a blog post', 'Create a blog post from the source material in this project.', Pencil],
                          ['Build a video script', 'Turn my source material into a 60-second video script.', Video],
                        ].map(([label, prompt, Icon]) => (
                          <button key={label} onClick={() => setInput(prompt)} className="border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-sm transition-all text-left">
                            <Icon size={19} className="text-[var(--accent)]" />
                            <span>{label}</span>
                            <ArrowRight size={15} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="messages">
                      {messages.map((message) => (
                        <article className={`message ${message.role}`} key={message._id}>
                          <span className={`message-avatar ${message.role === 'model' ? 'bg-[var(--soft)] text-[var(--accent)] border border-[var(--accent)]/30' : 'bg-[var(--elevated)] text-[var(--muted)] border border-[var(--border)]'}`}>
                            {message.role === 'model' ? <Sparkles size={17} /> : 'You'}
                          </span>
                          <div>
                            <header>
                              <strong>{message.role === 'model' ? 'CreatorForge' : 'You'}</strong>
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
                              <header><strong>You</strong></header>
                              <p>{pending}</p>
                            </div>
                          </article>
                          {draftResponse && <article className="message model" aria-label="Response in progress">
                            <span className="message-avatar"><Sparkles size={17} /></span>
                            <div><header><strong>CreatorForge</strong><span>Draft · not saved yet</span></header>
                              <div className="markdown"><Markdown remarkPlugins={[remarkGfm]}>{draftResponse}</Markdown></div>
                            </div>
                          </article>}
                          <div className="generating text-[var(--accent)]" role="status">
                            <LoaderCircle className="spin" size={17} />{draftResponse ? 'Writing your response…' : 'Connecting your sources…'}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>

                <div className="composer-wrap">
                  {/* Channel format selector pills */}
                  <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 text-xs">
                    <span className="text-[11px] font-mono text-[var(--muted)] mr-1 shrink-0">FORMATS:</span>
                    {formats.slice(0, 5).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setInput((prev) => prev ? `${prev}\n\nFormat as ${f}.` : `Write a ${f} based on this project.`)}
                        className="px-2.5 py-1 rounded bg-[var(--surface)] hover:bg-[var(--soft)] hover:text-[var(--accent)] border border-[var(--border)] text-[var(--muted)] font-mono text-[11px] shrink-0 transition-colors"
                      >
                        +{f}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={send} className="composer border border-[var(--border)] bg-[var(--surface)] rounded-xl focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15 shadow-sm">
                    <textarea
                      aria-label="Message CreatorForge"
                      rows={2}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask about your sources, or tell me what to create…"
                      maxLength={10000}
                      disabled={busy}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          send(event);
                        }
                      }}
                    />
                    <div className="composer-footer border-t border-[var(--border)]">
                      <span className="text-[var(--muted)] font-mono text-xs"><Sparkles size={13} className="text-[var(--accent)]" />Project context + calibrated voice</span>
                      {pending ? <button key="stop-generation" type="button" className="send-button" aria-label="Stop generation" title="Stop generation" onClick={(event) => { event.preventDefault(); generation.current?.abort(); }}><span aria-hidden="true">■</span></button> : <button key="send-message" type="submit" className="send-button bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white shadow-md" aria-label="Send message" disabled={busy || !input.trim()}>
                        {busy ? <LoaderCircle className="spin" size={18} /> : <ArrowUp size={19} />}
                      </button>}
                    </div>
                  </form>
                  <p className="composer-note">Creates text and code, not rendered images or videos. Review before publishing.</p>
                </div>
              </>
            ) : (
              <div className="remix-panel">
                <h1 className="text-2xl font-bold text-[var(--text)] mb-1 font-heading">Give your content a second life.</h1>
                <p className="muted">Choose a source, pick a format, and let your brand lead the way.</p>

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
                    <Field label="Create a">
                      <select value={format} onChange={(event) => setFormat(event.target.value)}>
                        {formats.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Creative direction (optional)">
                    <textarea
                      rows={3}
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      maxLength={3000}
                      placeholder="A specific angle, length, or call to action…"
                    />
                  </Field>

                  <button disabled={busy || !source} className="button primary">
                    {busy ? <LoaderCircle className="spin" size={17} /> : <WandSparkles size={17} />}
                    {busy ? 'Creating your remix…' : 'Generate remix'}
                  </button>
                </form>

                {!media.length && <p className="muted">Upload at least one asset to get started.</p>}

                {outputAssetId && (
                  <section className="remix-output">
                    <header>
                      <h2>Your remixed content</h2>
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
      notify('Brand kit saved. Your voice is ready for every generation.');
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <main className="brand-page max-w-6xl mx-auto py-8 px-4 sm:px-6">
        <Link className="back-link inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-6" to="/dashboard">
          <ArrowLeft size={16} />Back to projects
        </Link>
        <div className="page-title flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text)] mb-2 font-heading">Your brand. Your voice.</h1>
            <p className="text-[var(--muted)] text-sm">Give every creation a familiar direction, without repeating yourself.</p>
          </div>
          <span className="brand-emblem flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--soft)] border border-[var(--accent)]/30 text-[var(--accent)] shrink-0">
            <Palette size={28} />
          </span>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <div className="brand-layout grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <form onSubmit={save} className="brand-form bg-[var(--surface)] border border-[var(--border)] p-6 md:p-8 rounded-2xl shadow-sm">
              <div className="mb-6 pb-3 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--text)] font-heading">The essentials</h2>
              </div>

              <Field label="Brand name">
                <input
                  name="name"
                  defaultValue={brand.name}
                  maxLength={100}
                  placeholder="Your brand or studio name"
                />
              </Field>

              <div className="two-columns">
                <Field label="Tone of voice">
                  <input
                    name="tone"
                    defaultValue={brand.tone}
                    maxLength={200}
                    placeholder="Warm, bold, conversational…"
                  />
                </Field>
                <Field label="Audience">
                  <input
                    name="audience"
                    defaultValue={brand.audience}
                    maxLength={500}
                    placeholder="Who are you speaking to?"
                  />
                </Field>
              </div>

              <Field label="Keywords" hint="Separate words or short phrases with commas.">
                <input
                  name="keywords"
                  defaultValue={brand.keywords.join(', ')}
                  placeholder="Thoughtful, independent, sustainable"
                />
              </Field>
              <div>
                <Field label="Brand colors" hint="Hex codes separated by commas, e.g. #FF5E1E, #FF9900, #10B981.">
                  <input
                    name="colors"
                    value={colorInput}
                    onChange={(event) => setColorInput(event.target.value)}
                    placeholder="#FF5E1E, #FF9900, #10B981"
                  />
                </Field>
                <BrandColorPreview colors={colorInput} />
              </div>
              <div className="flex items-center justify-between mt-8 mb-6 pb-3 border-b border-[var(--border)]">
                <h2 className="guidelines-heading text-lg font-semibold text-[var(--text)] font-heading">The creative guardrails</h2>
              </div>

              <Field label="Brand guidelines">
                <textarea
                  name="guidelines"
                  rows={7}
                  defaultValue={brand.guidelines}
                  maxLength={10000}
                  placeholder="What should your content always do? What should it avoid? Add preferred phrases, writing rules, and anything that makes your brand feel like you."
                />
              </Field>

              {error && <p className="inline-error" role="alert">{error}</p>}

              <button disabled={busy} className="button primary mt-4">
                {busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}Save brand kit
              </button>
            </form>

            <aside className="brand-explainer bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl self-start shadow-sm">
              <Sparkles size={22} className="text-[var(--accent)] mb-3" />
              <h2 className="text-xl font-bold text-[var(--text)] mb-2 leading-tight font-heading">One voice.<br />Every project.</h2>
              <p className="text-xs text-[var(--muted)] mb-6 leading-relaxed">Your saved brand kit is included in every AI chat and remix request across your account.</p>
              <div className="space-y-3">
                <div className="brand-rule text-xs text-[var(--text)] flex items-center gap-2"><Check size={15} className="text-emerald-500 shrink-0" />Your tone, not a generic voice</div>
                <div className="brand-rule text-xs text-[var(--text)] flex items-center gap-2"><Check size={15} className="text-emerald-500 shrink-0" />Audience-aware content</div>
                <div className="brand-rule text-xs text-[var(--text)] flex items-center gap-2"><Check size={15} className="text-emerald-500 shrink-0" />Guidelines applied automatically</div>
              </div>
              <p className="brand-footnote text-[11px] text-[var(--muted)] pt-4 border-t border-[var(--border)] mt-6 leading-relaxed">Colors guide the creative brief. CreatorForge generates text, not images or videos.</p>
            </aside>
          </div>
        )}
      </main>
    </Shell>
  );
}
