import { useEffect, useRef } from 'react';
import { Clock, FileCheck, TrendingUp } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function ResultsSection() {
  const containerRef = useRef(null);
  const metricsRef = useRef([]);

  const metrics = [
    {
      value: '4.8 hrs',
      label: 'Saved per weekly dispatch',
      detail: 'From scattered research notes to publication-ready draft.',
      icon: Clock,
    },
    {
      value: '100%',
      label: 'Primary source fidelity',
      detail: 'Every generated claim cites your uploaded source material.',
      icon: FileCheck,
    },
    {
      value: '12,000+',
      label: 'Canonized essays and scripts',
      detail: 'Published across Substacks, broadsheets, and video essays.',
      icon: TrendingUp,
    },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const metricItems = metricsRef.current.filter(Boolean);
      gsap.fromTo(
        metricItems,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 82%',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="results-section py-16 px-6 max-w-6xl mx-auto"
      aria-label="Verified results from independent creators and publications"
    >
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-5xl font-heading font-medium tracking-tight text-[var(--text)] mb-3 leading-tight">
          Anchored in evidence. Proven in publication.
        </h2>
        <p className="text-[var(--muted)] font-body text-lg leading-relaxed">
          Writers, essayists, and researchers spend less time wrestling fragmented apps and more time publishing authoritative work.
        </p>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              ref={(el) => (metricsRef.current[idx] = el)}
              className="p-6 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-heading text-4xl sm:text-5xl font-semibold text-[var(--accent)] tracking-tight">
                  {metric.value}
                </span>
                <span className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--elevated)] flex items-center justify-center text-[var(--accent)]">
                  <Icon size={18} />
                </span>
              </div>
              <div>
                <h3 className="font-heading text-lg font-medium text-[var(--text)] mb-1">
                  {metric.label}
                </h3>
                <p className="font-body text-sm text-[var(--muted)] leading-relaxed">
                  {metric.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
