import { useEffect, useRef } from 'react';
import { AlertCircle, Layers, Unlink, XCircle } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function ProblemSection() {
  const containerRef = useRef(null);
  const cardsRef = useRef([]);

  const pains = [
    {
      title: 'The Scattered Archive',
      impact: 'Up to 6 hours lost weekly searching across fragmented apps.',
      description:
        'Voice memos saved on your phone, reference PDFs in downloads, screenshots in photo libraries, and half-formed outlines in Apple Notes. When you sit down to write, half your creative fuel is spent simply finding your evidence.',
      icon: Layers,
    },
    {
      title: 'The Generic Voice Trap',
      impact: 'Output flattened into robotic, forgettable corporate filler.',
      description:
        'Feeding raw notes into standard chatbots strips away your distinctive cadence. You get generic platitudes, hallucinated claims, and cliché buzzwords that destroy reader trust and require endless manual rewriting.',
      icon: Unlink,
    },
    {
      title: 'The Format Burnout',
      impact: 'Transforming one thesis into multiple channels stalls output.',
      description:
        'Adapting one long-form argument into an X thread, a LinkedIn dispatch, and a video essay script means starting from zero each time. Great ideas die in your drafts folder because repackaging takes too much friction.',
      icon: AlertCircle,
    },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const cardList = cardsRef.current.filter(Boolean);
      gsap.fromTo(
        cardList,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="problem-section py-20 px-6 max-w-6xl mx-auto"
      aria-label="The cost of fragmented creative workflows"
    >
      <div className="text-center max-w-3xl mx-auto mb-14">
        <span className="font-editorial-new text-xs uppercase tracking-wider text-[var(--accent)] block mb-3 font-semibold">
          The Creative Fragmentation Tax
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-medium tracking-tight text-[var(--text)] mb-4 leading-tight">
          Your best ideas should not die in note graveyards.
        </h2>
        <p className="text-[var(--muted)] font-body text-lg leading-relaxed">
          Writers and researchers rarely struggle from a lack of insight. They struggle because their research, voice recordings, and publishing channels are split across disconnected tools.
        </p>
      </div>

      {/* 3 Core Pain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {pains.map((pain, idx) => {
          const Icon = pain.icon;
          return (
            <div
              key={pain.title}
              ref={(el) => (cardsRef.current[idx] = el)}
              className="p-7 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-sm relative overflow-hidden"
            >
              <div className="mb-4">
                <div className="w-10 h-10 rounded-[3px] border border-[var(--border)] bg-[var(--elevated)] flex items-center justify-center text-[var(--accent)] mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-heading text-xl font-medium text-[var(--text)] mb-2">
                  {pain.title}
                </h3>
                <p className="font-body text-sm text-[var(--muted)] leading-relaxed mb-4">
                  {pain.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border)]/30 font-body text-xs text-[var(--accent)] font-medium flex items-center gap-1.5">
                <XCircle size={14} className="shrink-0" />
                <span>{pain.impact}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Reality Check Box */}
      <div className="rounded-[4px] border border-[var(--border)] bg-[var(--elevated)] p-6 md:p-8 shadow-sm">
        <h3 className="font-heading text-xl md:text-2xl font-medium text-[var(--text)] text-center mb-6">
          The Reality Check: Disjointed Stack vs. The Unified Scriptorium
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-body text-sm">
          {/* Old way */}
          <div className="p-5 rounded-[3px] border border-[var(--border)] bg-[var(--surface)]/80">
            <h4 className="font-heading font-semibold text-base text-[var(--muted)] mb-3 pb-2 border-b border-[var(--border)]/30">
              The Disjointed Stack (Chaos)
            </h4>
            <ul className="space-y-2.5 text-[var(--muted)]">
              <li className="flex items-start gap-2">
                <span className="text-red-700 font-bold shrink-0">✕</span>
                <span>Voice notes stuck in mobile recorder without transcripts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-700 font-bold shrink-0">✕</span>
                <span>Generic AI copy with hallucinated facts and bland tone.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-700 font-bold shrink-0">✕</span>
                <span>Manually retyping the same premise across 4 social formats.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-700 font-bold shrink-0">✕</span>
                <span>Unpublished drafts lost across abandoned Notion documents.</span>
              </li>
            </ul>
          </div>

          {/* New way */}
          <div className="p-5 rounded-[3px] border border-[var(--accent)]/60 bg-[var(--surface)]">
            <h4 className="font-heading font-semibold text-base text-[var(--accent)] mb-3 pb-2 border-b border-[var(--accent)]/30">
              The CreatorForge Scriptorium (Canon)
            </h4>
            <ul className="space-y-2.5 text-[var(--text)]">
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold shrink-0">✓</span>
                <span>Audio, visual proofs, and PDFs consecrated in one project archive.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold shrink-0">✓</span>
                <span>House style rules strictly eliminate robotic clichés.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold shrink-0">✓</span>
                <span>1-click remix into threads, scripts, essays, and briefs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold shrink-0">✓</span>
                <span>Every claim cited directly to your authentic source material.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
