import { useEffect, useRef } from 'react';
import { CheckCircle2, Download, FileUp, SlidersHorizontal } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function HowItWorksSection() {
  const containerRef = useRef(null);
  const stepsRef = useRef([]);

  const steps = [
    {
      num: '01',
      title: 'Deposit Your Sources',
      description:
        'Drop in voice memos, interview audio, reference PDFs, book clippings, or quick bullet points. CreatorForge ingests and indexes every element in your private project archive.',
      icon: FileUp,
      preview: (
        <div className="space-y-1.5 font-body text-xs text-[var(--muted)]">
          <div className="flex items-center justify-between p-2 rounded-[2px] bg-[var(--surface)] border border-[var(--border)]">
            <span className="truncate">interview-recording.m4a</span>
            <span className="text-[var(--accent)] font-mono text-[10px]">Indexed</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-[2px] bg-[var(--surface)] border border-[var(--border)]">
            <span className="truncate">historical-brief.pdf</span>
            <span className="text-[var(--accent)] font-mono text-[10px]">Analyzed</span>
          </div>
        </div>
      ),
    },
    {
      num: '02',
      title: 'Calibrate Voice & Medium',
      description:
        'Select your publishing vehicle (longform essay, newsletter column, X thread, or video essay script). CreatorForge aligns with your custom Brand Lexicon rules.',
      icon: SlidersHorizontal,
      preview: (
        <div className="p-2.5 rounded-[2px] bg-[var(--surface)] border border-[var(--border)] space-y-2 text-xs font-body">
          <div className="flex items-center justify-between border-b border-[var(--border)]/30 pb-1.5 text-[var(--muted)]">
            <span>Target Medium</span>
            <span className="font-medium text-[var(--text)]">Substack Dispatch</span>
          </div>
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span>Voice Style</span>
            <span className="font-medium text-[var(--accent)] italic">Journalistic & Crisp</span>
          </div>
        </div>
      ),
    },
    {
      num: '03',
      title: 'Inscribe & Export',
      description:
        'Stream authoritative drafts with direct footnote citations to your uploaded sources. Make rapid revisions and export to formatted Markdown or clean text with one click.',
      icon: Download,
      preview: (
        <div className="p-2.5 rounded-[2px] bg-[var(--surface)] border border-[var(--border)] text-xs font-body space-y-1.5">
          <div className="flex items-center justify-between text-emerald-700 font-medium">
            <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Canon Draft Ready</span>
            <span className="text-[10px] text-[var(--muted)] font-mono">1,420 words</span>
          </div>
          <p className="text-[var(--muted)] italic text-[11px] truncate">
            “When research fragments across siloed apps, editorial continuity leaks…”
          </p>
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const stepItems = stepsRef.current.filter(Boolean);
      gsap.fromTo(
        stepItems,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
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
      className="how-it-works-section py-20 px-6 max-w-6xl mx-auto"
      aria-label="How CreatorForge works in three simple steps"
    >
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-medium tracking-tight text-[var(--text)] mb-3 leading-tight">
          Three steps from scattered notes to polished work.
        </h2>
        <p className="text-[var(--muted)] font-body text-lg leading-relaxed">
          No complex prompt engineering or lengthy setup. Upload your thinking, calibrate your tone, and publish with conviction.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              ref={(el) => (stepsRef.current[idx] = el)}
              className="p-7 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-sm relative"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="font-heading font-semibold text-3xl text-[var(--accent)] tracking-tight">
                    {step.num}
                  </span>
                  <span className="w-9 h-9 rounded-[3px] border border-[var(--border)] bg-[var(--elevated)] flex items-center justify-center text-[var(--text)]">
                    <Icon size={18} />
                  </span>
                </div>

                <h3 className="font-heading text-xl font-medium text-[var(--text)] mb-2">
                  {step.title}
                </h3>
                <p className="font-body text-sm text-[var(--muted)] leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              <div className="p-3 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)]/60 mt-auto">
                {step.preview}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
