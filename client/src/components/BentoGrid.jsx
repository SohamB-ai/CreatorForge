import { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  FileText,
  Image,
  Video,
  Feather,
  WandSparkles,
  Play,
  Pause,
  Volume2,
  Check,
  FileSpreadsheet,
  ShieldCheck,
  BookmarkCheck,
  Lock,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SpotlightCard } from './SpotlightCard.jsx';

gsap.registerPlugin(ScrollTrigger);

const FORMAT_PREVIEWS = {
  'X thread': {
    badge: 'Editorial Dispatch (6 Posts)',
    text: '1/6 Modern publishing rewards velocity over resonance. But when every draft is anchored in primary field notes and transcripts, your reporting holds enduring weight.',
  },
  'LinkedIn post': {
    badge: 'Analysis Column (Broadsheet Register)',
    text: 'Most creators mistake volume for authority. Across leading independent publications, one principle stands out: context is the catalyst for conviction.',
  },
  'Video script': {
    badge: 'Video Essay Script (03:30 Runtime)',
    text: '[SCENE: Daylight on an editorial drafting desk with proofs, audio recorder, and source clippings]\nHOST (Direct to camera): Before algorithmic feeds, every headline was weighed for permanence on paper…',
  },
  'Monograph': {
    badge: 'Long-form Feature (Chapter Proof)',
    text: 'Section IV: The Living Archive. When research fragments across siloed apps, editorial continuity leaks away. The studio must operate from a single source of truth.',
  },
  'Executive Summary': {
    badge: 'Briefing Note (Condensed Summary)',
    text: 'CORE DIRECTIVE: Synthesis of 4 editorial plates and 2 recorded memos complete. Tone consistency verified. Key insights structured into 3 actionable columns.',
  },
};

export function BentoGrid() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef([]);

  const [selectedFormat, setSelectedFormat] = useState('X thread');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(14);
  const [waveHeights, setWaveHeights] = useState([
    25, 42, 28, 65, 48, 85, 58, 34, 75, 95, 52, 28, 60, 38, 20, 55, 36, 68, 40, 22,
  ]);

  const formats = ['X thread', 'LinkedIn post', 'Video script', 'Monograph', 'Executive Summary'];

  useEffect(() => {
    let interval;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioSeconds((sec) => (sec >= 258 ? 0 : sec + 1));
        setWaveHeights((prev) =>
          prev.map(() => Math.floor(Math.random() * 75) + 20)
        );
      }, 180);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 85%',
          },
        }
      );

      const validCards = cardsRef.current.filter(Boolean);
      gsap.fromTo(
        validCards,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `0${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <section
      ref={sectionRef}
      className="bento-section py-20 px-6 max-w-6xl mx-auto relative transition-colors"
      aria-label="CreatorForge core capabilities and feature suite"
    >
      <div ref={headerRef} className="mb-14 text-center max-w-3xl mx-auto will-change-transform">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-medium tracking-tight text-[var(--text)] mb-3 leading-tight">
          A better way: Raw material to finished canon.
        </h2>
        <p className="text-[var(--muted)] font-body text-lg leading-relaxed">
          Six integrated pillars engineered for writers, researchers, and studio directors who refuse to compromise on authenticity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Feature 1: The Source Library (7 cols) */}
        <div ref={(el) => (cardsRef.current[0] = el)} className="md:col-span-7 will-change-transform">
          <SpotlightCard className="relative min-h-[380px] h-full flex flex-col justify-between p-7 md:p-8 bg-[var(--surface)] text-[var(--text)] overflow-hidden border border-[var(--border)] rounded-[4px]">
            <div className="flex items-center justify-between relative z-10 mb-4">
              <span className="inline-flex items-center gap-2 rounded-[2.88px] border border-[var(--border)] bg-[var(--elevated)] px-3 py-1 font-editorial-new text-xs uppercase tracking-wider text-[var(--text)]">
                <FileSpreadsheet size={13} className="text-[var(--accent)]" /> Feature 01 · Primary Source Vault
              </span>
              <span className="text-xs font-mono font-medium text-[var(--accent)]">CONTEXT PRESERVED</span>
            </div>

            <div className="relative z-10 my-4">
              <div className="arch-top overflow-hidden border border-[var(--border)] bg-[var(--elevated)] mb-4 relative max-h-48">
                <img
                  src="/assets/creative_studio_art.jpg"
                  alt="Archival study and creative references"
                  className="w-full h-44 object-cover object-center filter brightness-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)]/90 via-transparent to-transparent opacity-80" />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Photographic Proofs', icon: Image },
                  { label: 'Audio Interviews', icon: AudioLines },
                  { label: 'Video Footage', icon: Video },
                  { label: 'Briefs & Manuscripts', icon: FileText },
                ].map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-[2.88px] border border-[var(--border)] bg-[var(--elevated)] px-2.5 py-1 text-xs text-[var(--text)] font-body"
                  >
                    <Icon size={13} className="text-[var(--accent)]" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 pt-2 border-t border-[var(--border)]/30">
              <h3 className="text-xl sm:text-2xl font-heading font-medium text-[var(--text)] mb-1">
                Every reference preserved in context.
              </h3>
              <p className="text-[var(--muted)] font-body text-sm leading-relaxed">
                <strong className="text-[var(--text)] font-medium">Concrete Benefit:</strong> Deposit audio, proofs, briefs, and notes into one consecrated study so your drafts cite factual evidence instead of hallucinated filler.
              </p>
            </div>
          </SpotlightCard>
        </div>

        {/* Feature 2: Audio to text (5 cols) */}
        <div ref={(el) => (cardsRef.current[1] = el)} className="md:col-span-5 will-change-transform">
          <SpotlightCard className="relative min-h-[380px] h-full flex flex-col justify-between p-7 md:p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-[4px]">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-2 rounded-[2.88px] border border-[var(--border)] bg-[var(--elevated)] px-3 py-1 font-editorial-new text-xs uppercase tracking-wider text-[var(--text)]">
                <AudioLines size={13} className="text-[var(--accent)]" /> Feature 02 · Spoken Dictation
              </span>
              <button
                type="button"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2.88px] text-xs font-body uppercase tracking-wider bg-[var(--text)] text-[var(--bg)] border border-[var(--border)] hover:bg-[var(--accent)] transition-all cursor-pointer shadow-sm"
                title={isPlayingAudio ? 'Pause playback' : 'Listen to dictation sample'}
              >
                {isPlayingAudio ? (
                  <>
                    <Pause size={12} />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={12} />
                    <span>Listen</span>
                  </>
                )}
              </button>
            </div>

            <div className="my-4 p-4 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)] flex flex-col justify-center relative">
              <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-2 font-body">
                <span className="flex items-center gap-1.5">
                  <Volume2 size={13} className={isPlayingAudio ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
                  field-interview-notes.m4a
                </span>
                <span className="font-mono text-xs text-[var(--text)]">{formatTimer(audioSeconds)} / 04:18</span>
              </div>
              <div
                className="h-8 flex items-center justify-center gap-1 cursor-pointer py-1"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                title="Click to toggle dictation playback"
              >
                {waveHeights.map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${Math.max(15, h)}%` }}
                    className={`w-1 rounded-none transition-all duration-150 ${
                      isPlayingAudio
                        ? 'bg-[var(--accent)]'
                        : 'bg-[var(--text)] opacity-60'
                    }`}
                  />
                ))}
              </div>
              {isPlayingAudio && (
                <div className="mt-2.5 pt-2 border-t border-[var(--border)]/20 text-xs font-body italic text-[var(--text)] leading-relaxed">
                  “Observing how vintage broadsheets structured their stories with layered headlines and distinct columns…”
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[var(--border)]/30">
              <h3 className="text-xl font-heading font-medium text-[var(--text)] mb-1">
                From voice dictation to structured copy.
              </h3>
              <p className="text-[var(--muted)] font-body text-sm leading-relaxed">
                <strong className="text-[var(--text)] font-medium">Concrete Benefit:</strong> Record ideas on the move. CreatorForge transcribes and synthesizes your speech alongside your research into publication-ready copy.
              </p>
            </div>
          </SpotlightCard>
        </div>

        {/* Feature 3: Brand Kit & Guidelines (5 cols) */}
        <div ref={(el) => (cardsRef.current[2] = el)} className="md:col-span-5 will-change-transform">
          <SpotlightCard className="relative min-h-[350px] h-full flex flex-col justify-between p-7 md:p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-[4px]">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-2 rounded-[2.88px] border border-[var(--border)] bg-[var(--elevated)] px-3 py-1 font-editorial-new text-xs uppercase tracking-wider text-[var(--text)]">
                <Feather size={13} className="text-[var(--accent)]" /> Feature 03 · Editorial Lexicon
              </span>
            </div>

            <div className="my-4 space-y-2.5">
              <div className="p-3 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)] flex items-center justify-between font-body text-sm">
                <span className="text-[var(--muted)]">Tonal Register</span>
                <span className="font-medium text-[var(--text)] italic">Authoritative, journalistic</span>
              </div>
              <div className="p-3 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)] flex items-center justify-between font-body text-sm">
                <span className="text-[var(--muted)]">Forbidden Terms</span>
                <span className="font-mono text-xs text-red-700 bg-red-100 dark:bg-red-950/40 px-2 py-0.5 rounded-[2px]">unleash, delve, tapestry</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)]/30">
              <h3 className="text-xl font-heading font-medium text-[var(--text)] mb-1">
                Establish your immutable house voice.
              </h3>
              <p className="text-[var(--muted)] font-body text-sm leading-relaxed">
                <strong className="text-[var(--text)] font-medium">Concrete Benefit:</strong> Define your style manual, prohibited clichés, and audience once. Every article, tweet, and script strictly maintains your cadence.
              </p>
            </div>
          </SpotlightCard>
        </div>

        {/* Feature 4: 1-Click Multi-Format Remix (7 cols) */}
        <div ref={(el) => (cardsRef.current[3] = el)} className="md:col-span-7 will-change-transform">
          <SpotlightCard className="relative min-h-[350px] h-full flex flex-col justify-between p-7 md:p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] overflow-hidden rounded-[4px]">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-2 rounded-[2.88px] border border-[var(--border)] bg-[var(--elevated)] px-3 py-1 font-editorial-new text-xs uppercase tracking-wider text-[var(--text)]">
                <WandSparkles size={13} className="text-[var(--accent)]" /> Feature 04 · Cross-Format Remix
              </span>
              <span className="text-xs font-mono font-medium text-[var(--accent)]">1-CLICK PRESS</span>
            </div>

            <div className="my-3 p-4 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)]">
              <div className="flex flex-wrap gap-2 mb-3">
                {formats.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFormat(f)}
                    className={`px-3 py-1 font-body text-xs rounded-[2.88px] transition-all cursor-pointer border ${
                      selectedFormat === f
                        ? 'bg-[var(--text)] text-[var(--bg)] border-[var(--border)] font-medium'
                        : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--elevated)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="text-sm font-body text-[var(--text)] bg-[var(--surface)] p-3.5 rounded-[3px] border border-[var(--border)] space-y-1">
                <div className="flex items-center justify-between text-xs font-body uppercase tracking-wider text-[var(--accent)] pb-1 border-b border-[var(--border)]/30">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Check size={13} />
                    {FORMAT_PREVIEWS[selectedFormat].badge}
                  </span>
                  <span className="text-xs text-[var(--muted)]">Style Verified</span>
                </div>
                <p className="text-sm text-[var(--text)] font-body leading-relaxed whitespace-pre-line italic pt-1">
                  {FORMAT_PREVIEWS[selectedFormat].text}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)]/30">
              <h3 className="text-xl sm:text-2xl font-heading font-medium text-[var(--text)] mb-1">
                Turn one thesis into a multi-channel campaign.
              </h3>
              <p className="text-[var(--muted)] font-body text-sm leading-relaxed">
                <strong className="text-[var(--text)] font-medium">Concrete Benefit:</strong> Repurpose foundational interviews and essays into dispatches, threads, columns, or video scripts without losing nuance.
              </p>
            </div>
          </SpotlightCard>
        </div>

        {/* Feature 5: Grounded Citations & Anti-Hallucination (6 cols) */}
        <div ref={(el) => (cardsRef.current[4] = el)} className="md:col-span-6 will-change-transform">
          <SpotlightCard className="relative min-h-[300px] h-full flex flex-col justify-between p-7 md:p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-[4px]">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-2 rounded-[2.88px] border border-[var(--border)] bg-[var(--elevated)] px-3 py-1 font-editorial-new text-xs uppercase tracking-wider text-[var(--text)]">
                <BookmarkCheck size={13} className="text-[var(--accent)]" /> Feature 05 · Source Grounding
              </span>
              <span className="text-xs font-mono text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-[2px] font-semibold">100% CITED</span>
            </div>

            <div className="my-3 p-4 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-xs font-body text-[var(--text)] pb-2 mb-2 border-b border-[var(--border)]/30">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Traceable Citation Anchor</span>
              </div>
              <p className="text-xs font-body text-[var(--muted)] leading-relaxed italic">
                “Synthesized from <span className="underline decoration-[var(--accent)] text-[var(--text)] font-medium">interview-transcript-p4.pdf</span> and <span className="underline decoration-[var(--accent)] text-[var(--text)] font-medium">field-recording-02.m4a</span>. No speculative claims added.”
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--border)]/30">
              <h3 className="text-xl font-heading font-medium text-[var(--text)] mb-1">
                Zero hallucination, verified citations.
              </h3>
              <p className="text-[var(--muted)] font-body text-sm leading-relaxed">
                <strong className="text-[var(--text)] font-medium">Concrete Benefit:</strong> Publish with complete confidence knowing every paragraph directly traces back to your uploaded notes, eliminating embarrassing factual blunders.
              </p>
            </div>
          </SpotlightCard>
        </div>

        {/* Feature 6: Private Vault & Non-Training Guarantee (6 cols) */}
        <div ref={(el) => (cardsRef.current[5] = el)} className="md:col-span-6 will-change-transform">
          <SpotlightCard className="relative min-h-[300px] h-full flex flex-col justify-between p-7 md:p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-[4px]">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-2 rounded-[2.88px] border border-[var(--border)] bg-[var(--elevated)] px-3 py-1 font-editorial-new text-xs uppercase tracking-wider text-[var(--text)]">
                <Lock size={13} className="text-[var(--accent)]" /> Feature 06 · Private Scriptorium
              </span>
              <span className="text-xs font-mono text-[var(--accent)] font-semibold">NO AI TRAINING</span>
            </div>

            <div className="my-3 p-4 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)] flex items-center gap-3">
              <ShieldCheck size={28} className="text-[var(--accent)] shrink-0" />
              <div className="text-xs font-body text-[var(--muted)]">
                <strong className="block text-[var(--text)] font-medium mb-0.5">Zero Data Leakage Boundary</strong>
                Your drafts, audio transcripts, and proprietary archives are never used to train public models.
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)]/30">
              <h3 className="text-xl font-heading font-medium text-[var(--text)] mb-1">
                Your intellectual property stays yours.
              </h3>
              <p className="text-[var(--muted)] font-body text-sm leading-relaxed">
                <strong className="text-[var(--text)] font-medium">Concrete Benefit:</strong> Safely craft unreleased books, private investigative journalism, and sensitive client strategies in an isolated studio.
              </p>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}
