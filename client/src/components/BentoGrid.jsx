import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  AudioLines,
  FileText,
  Image,
  Video,
  ArrowRight,
  Feather,
  Scroll,
  WandSparkles,
  Play,
  Pause,
  Volume2,
  Check,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SpotlightCard } from './SpotlightCard.jsx';

gsap.registerPlugin(ScrollTrigger);

const FORMAT_PREVIEWS = {
  'X thread': {
    badge: 'Dispatch Series · 6 Posts',
    text: '1/6 The paradox of modern creation is that ephemeral velocity destroys lasting resonance. When every draft is anchored in primary sources, your scholarship becomes timeless. 🧵',
  },
  'LinkedIn post': {
    badge: 'Monographic Article · Professional Register',
    text: 'Most content creators mistake publishing frequency for intellectual authority. In our archival research across enduring studios, one principle stood unshakeable: context is the catalyst for conviction.',
  },
  'Video script': {
    badge: 'Audiovisual Script · 03:30 Runtime',
    text: '[SCENE: Warm incandescent lamplight over an archival desk with ink and manuscript folios]\nNARRATOR (Reflective): Before algorithms, every recorded sentence bore the permanence of a chisel on stone…',
  },
  'Monograph': {
    badge: 'Scholarly Folio · Chapter Excerpt',
    text: '“Chapter IV: The Preservation of Canon. As substantiated in Folio 02, the fragmentation of research across isolated digital tools creates cognitive leakage, compromising structural integrity.”',
  },
  'Executive Summary': {
    badge: 'Synthesis Brief · High-Density Summary',
    text: 'CORE DIRECTIVE: Complete synthesis of 4 archival plates and 2 voice dictations completed. Voice adherence verified at 99.2%. Actionable takeaways distilled into 3 strategic pillars.',
  },
};

export function BentoGrid() {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef([]);
  const parallaxImgRef = useRef(null);
  const imgContainerRef = useRef(null);

  const [selectedFormat, setSelectedFormat] = useState('X thread');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(14);
  const [waveHeights, setWaveHeights] = useState([
    25, 42, 28, 65, 48, 85, 58, 34, 75, 95, 52, 28, 60, 38, 20, 55, 36, 68, 40, 22,
  ]);

  const formats = ['X thread', 'LinkedIn post', 'Video script', 'Monograph', 'Executive Summary'];

  // Audio simulation timer and animated wave bars
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

  // GSAP ScrollTrigger Animations
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      // Header entrance
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 85%',
          },
        }
      );

      // Staggered cards entrance
      const validCards = cardsRef.current.filter(Boolean);
      gsap.fromTo(
        validCards,
        { opacity: 0, y: 48 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
          },
        }
      );

      // Parallax scroll on archival plate image inside Discipline I
      if (parallaxImgRef.current && imgContainerRef.current) {
        gsap.fromTo(
          parallaxImgRef.current,
          { yPercent: -12 },
          {
            yPercent: 12,
            ease: 'none',
            scrollTrigger: {
              trigger: imgContainerRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }
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
      className="bento-section py-24 border-t border-[var(--border)] relative transition-colors"
      aria-label="CreatorForge core capabilities"
    >
      <div ref={headerRef} className="max-w-6xl mx-auto px-6 mb-14 text-center will-change-transform">
        <span className="font-display text-[11px] font-semibold tracking-[0.3em] uppercase text-[var(--accent)] block mb-3">
          Volume III · Core Disciplines
        </span>
        <h2 className="text-3xl md:text-5xl font-heading font-medium tracking-tight text-[var(--text)] mb-4">
          The Scholar’s Toolkit: From Raw Source to Masterpiece
        </h2>
        <p className="text-[var(--muted)] font-body text-lg max-w-2xl mx-auto leading-relaxed">
          Rather than scattering thoughts across disconnected modern tools, CreatorForge gathers every note, recording, and reference into a unified, scholarly scriptorium.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-7 max-w-6xl mx-auto px-6">
        {/* Cell 1: The Source Archive */}
        <div ref={(el) => (cardsRef.current[0] = el)} className="md:col-span-7 will-change-transform">
          <SpotlightCard className="corner-flourish relative min-h-[380px] h-full flex flex-col justify-between p-8 bg-[var(--surface)] text-[var(--text)] overflow-hidden border border-[var(--border)] rounded-[4px] hover:border-[var(--accent)]/50 transition-colors shadow-lg">
            <div ref={imgContainerRef} className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <img
                ref={parallaxImgRef}
                src="/assets/creative_studio_art.jpg"
                alt="Archival creative references"
                className="w-full h-[125%] -top-[12%] absolute object-cover object-center opacity-25 dark:opacity-30 dark:mix-blend-luminosity sepia-reveal will-change-transform"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/85 to-transparent" />
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-[3px] border border-[var(--accent)]/30 bg-[var(--elevated)]/90 px-3 py-1 font-display text-[10.5px] uppercase tracking-[0.18em] text-[var(--accent)] backdrop-blur-md shadow-sm">
                <Scroll size={13} className="text-[var(--accent)]" /> Discipline I · Archival Library
              </span>
            </div>

            <div className="relative z-10 mt-auto pt-14">
              <h3 className="text-2xl font-heading font-medium text-[var(--text)] tracking-normal mb-2.5">
                Every source preserved in context.
              </h3>
              <p className="text-[var(--muted)] font-body text-base leading-relaxed max-w-lg mb-6">
                Deposit research manuscripts, voice dictations, photographic plates, and historical references directly into your project's repository.
              </p>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { label: 'Plate Imagery', icon: Image },
                  { label: 'Vocal Dictations', icon: AudioLines },
                  { label: 'Moving Film', icon: Video },
                  { label: 'Manuscripts & Notes', icon: FileText },
                ].map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--border)] bg-[var(--elevated)] px-2.5 py-1 text-xs text-[var(--text)] font-body backdrop-blur-sm shadow-sm hover:border-[var(--accent)]/50 transition-colors"
                  >
                    <Icon size={13} className="text-[var(--accent)]" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Cell 2: Audio to text */}
        <div ref={(el) => (cardsRef.current[1] = el)} className="md:col-span-5 will-change-transform">
          <SpotlightCard className="corner-flourish relative min-h-[380px] h-full flex flex-col justify-between p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] overflow-hidden rounded-[4px] hover:border-[var(--accent)]/50 transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-[3px] border border-[var(--accent)]/30 bg-[var(--elevated)]/90 px-3 py-1 font-display text-[10.5px] uppercase tracking-[0.18em] text-[var(--accent)]">
                <AudioLines size={13} className="text-[var(--accent)]" /> Discipline II · Vocal Records
              </span>
              <button
                type="button"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[10.5px] font-display uppercase tracking-wider bg-[var(--elevated)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--accent)] transition-all cursor-pointer shadow-sm active:scale-95"
                title={isPlayingAudio ? 'Pause playback' : 'Listen to dictation sample'}
              >
                {isPlayingAudio ? (
                  <>
                    <Pause size={12} className="text-[var(--accent)] animate-pulse" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={12} className="text-[var(--accent)]" />
                    <span>Audition</span>
                  </>
                )}
              </button>
            </div>

            <div className="my-6 p-4 rounded-[4px] bg-[var(--elevated)] border border-[var(--border)] flex flex-col justify-center shadow-inner relative group">
              <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-3 font-display">
                <span className="tracking-wide flex items-center gap-1.5">
                  <Volume2 size={12} className={isPlayingAudio ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
                  folio-lecture-notes.m4a
                </span>
                <span className="font-mono text-[var(--accent)]">{formatTimer(audioSeconds)} / 04:18</span>
              </div>
              <div
                className="h-10 flex items-center justify-center gap-1 cursor-pointer py-1"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                title="Click to toggle dictation playback"
              >
                {waveHeights.map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${Math.max(14, h)}%` }}
                    className={`w-1.5 rounded-[1px] transition-all duration-150 ${
                      isPlayingAudio
                        ? 'bg-gradient-to-t from-[var(--accent)] to-[#FFE680] shadow-[0_0_6px_rgba(201,169,98,0.5)]'
                        : 'bg-[var(--accent)] opacity-70 group-hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
              {isPlayingAudio && (
                <div className="mt-3 pt-2.5 border-t border-[var(--border)]/60 text-xs font-body italic text-[var(--text)] leading-relaxed animate-fadeIn">
                  “...hypothesizing that early parchment manuscripts preserved context better than fragmented digital notes…”
                </div>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-heading font-medium tracking-normal text-[var(--text)] mb-2">
                From verbal contemplation to structured prose.
              </h3>
              <p className="text-[var(--muted)] font-body text-base leading-relaxed">
                Dictate your deepest thoughts while in motion. CreatorForge transcribes and synthesizes speech alongside your documents into coherent dissertations.
              </p>
            </div>
          </SpotlightCard>
        </div>

        {/* Cell 3: Brand Kit & Guidelines */}
        <div ref={(el) => (cardsRef.current[2] = el)} className="md:col-span-5 will-change-transform">
          <SpotlightCard className="corner-flourish relative min-h-[350px] h-full flex flex-col justify-between p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-[4px] hover:border-[var(--accent)]/50 transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-[3px] border border-[var(--accent)]/30 bg-[var(--elevated)]/90 px-3 py-1 font-display text-[10.5px] uppercase tracking-[0.18em] text-[var(--accent)]">
                <Feather size={13} className="text-[var(--accent)]" /> Discipline III · The Brand Lexicon
              </span>
            </div>

            <div className="my-6 space-y-2.5">
              <div className="p-3 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)] flex items-center justify-between font-body shadow-sm hover:border-[var(--accent)]/40 transition-colors">
                <span className="text-sm text-[var(--muted)]">Tone & Register</span>
                <span className="text-sm font-medium text-[var(--text)] italic">Scholarly, authoritative, yet inviting</span>
              </div>
              <div className="p-3 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)] flex items-center justify-between font-body shadow-sm hover:border-[var(--accent)]/40 transition-colors">
                <span className="text-sm text-[var(--muted)]">Target Audience</span>
                <span className="text-sm font-medium text-[var(--text)] italic">Curators, researchers & thinkers</span>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-heading font-medium tracking-normal text-[var(--text)] mb-1.5">
                Establish your intellectual signature.
              </h3>
              <p className="text-[var(--muted)] font-body text-base leading-relaxed">
                Inscribe your distinctive voice, rhetoric, and rules of engagement once. Every generated draft adheres strictly to your canon.
              </p>
            </div>
          </SpotlightCard>
        </div>

        {/* Cell 4: 1-Click Multi-Format Remix with Wax Seal */}
        <div ref={(el) => (cardsRef.current[3] = el)} className="md:col-span-7 will-change-transform">
          <SpotlightCard className="corner-flourish relative min-h-[350px] h-full flex flex-col justify-between p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] overflow-hidden rounded-[4px] hover:border-[var(--accent)]/50 transition-colors shadow-lg">
            {/* Authentic Crimson Wax Seal Badge */}
            <div
              className="wax-seal -top-3 right-6 cursor-pointer hover:rotate-6 transition-transform duration-300 shadow-md"
              title="Official Scholarly Seal"
            >
              <Sparkles size={18} className="text-[#F5EFEB]" />
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-[3px] border border-[var(--accent)]/30 bg-[var(--elevated)]/90 px-3 py-1 font-display text-[10.5px] uppercase tracking-[0.18em] text-[var(--accent)]">
                <WandSparkles size={13} className="text-[var(--accent)]" /> Discipline IV · Transmutation
              </span>
            </div>

            <div className="my-5 p-4 rounded-[4px] bg-[var(--elevated)] border border-[var(--border)] shadow-inner">
              <div className="flex flex-wrap gap-2 mb-3">
                {formats.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFormat(f)}
                    className={`px-3 py-1 font-display text-[11px] uppercase tracking-wider rounded-[3px] transition-all cursor-pointer ${
                      selectedFormat === f
                        ? 'bg-gradient-to-b from-[#C49E4A] via-[#A27B2B] to-[#87621B] text-[#FCFAF6] font-semibold shadow-sm scale-105'
                        : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 shadow-sm'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Dynamic live sample preview card */}
              <div className="text-sm font-body text-[var(--text)] bg-[var(--surface)] p-3.5 rounded-[3px] border border-[var(--border)] shadow-sm space-y-1.5 transition-all">
                <div className="flex items-center justify-between text-[11px] font-display uppercase tracking-widest text-[var(--accent)] pb-1.5 border-b border-[var(--border)]/60">
                  <span className="flex items-center gap-1.5">
                    <Check size={12} className="text-[var(--accent)]" />
                    {FORMAT_PREVIEWS[selectedFormat].badge}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">Voice: Verified</span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text)] font-body leading-relaxed whitespace-pre-line italic pt-1">
                  {FORMAT_PREVIEWS[selectedFormat].text}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-heading font-medium tracking-normal text-[var(--text)] mb-1.5">
                Turn a single insight into a scholarly canon.
              </h3>
              <p className="text-[var(--muted)] font-body text-base leading-relaxed">
                Repurpose any foundational thesis or lecture into concise dispatches, monograph chapters, or video scripts in your voice.
              </p>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}

