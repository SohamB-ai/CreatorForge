import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function TrustWall() {
  const containerRef = useRef(null);
  const headingRef = useRef(null);
  const logosRef = useRef([]);
  const [activeGuild, setActiveGuild] = useState(null);

  const logos = [
    {
      name: 'Figma',
      role: 'Guild of Visual Cartography',
      svg: (
        <svg className="h-6 w-auto" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="currentColor"/>
          <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="currentColor"/>
          <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="currentColor"/>
          <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="currentColor"/>
          <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="currentColor"/>
        </svg>
      ),
    },
    {
      name: 'Vercel',
      role: 'Athenaeum of Global Distribution',
      svg: (
        <svg className="h-5 w-auto" viewBox="0 0 1155 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M577.346 0L1154.69 1000H0L577.346 0Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: 'GitHub',
      role: 'Great Library of Shared Canon',
      svg: (
        <svg className="h-6 w-auto" viewBox="0 0 98 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.215-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: 'Linear',
      role: 'Chronicle of Disciplined Iteration',
      svg: (
        <svg className="h-6 w-auto" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1.225 61.523c-.783 1.764-.09 3.86 1.583 4.782l34.887 19.234c1.714.945 3.864.444 4.97-1.16l56.11-81.564c1.082-1.572.695-3.714-.887-4.819L62.998.758c-1.66-.889-3.722-.444-4.854 1.054L1.225 61.523z" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: 'Supabase',
      role: 'Vault of Immutable Records',
      svg: (
        <svg className="h-6 w-auto" viewBox="0 0 109 113" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M63.7076 110.284C60.848 113.885 55.0502 111.912 54.9709 107.314L53.7738 37.8174L97.5542 37.8174C104.992 37.8174 109.135 46.3359 104.475 52.1798L63.7076 110.284Z" fill="currentColor" />
          <path d="M45.317 2.71616C48.1766 -0.885149 53.9744 1.08779 54.0537 5.68603L54.4925 75.1826H11.4704C4.03221 75.1826 -0.111245 66.6641 4.54911 60.8202L45.317 2.71616Z" fill="currentColor" opacity="0.75" />
        </svg>
      ),
    },
    {
      name: 'Raycast',
      role: 'Command of Rapid Inscription',
      svg: (
        <svg className="h-6 w-auto" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 12L5 15L12 8L19 15L22 12L12 2Z" fill="currentColor" />
          <path d="M12 14L8 18L10 20L12 18L14 20L16 18L12 14Z" fill="currentColor" opacity="0.6" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 88%',
          },
        }
      );

      const items = logosRef.current.filter(Boolean);
      gsap.fromTo(
        items,
        { opacity: 0, y: 22, scale: 0.92 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="trust-wall-section border-y border-[var(--border)] bg-[var(--surface)]/50 py-12 my-14 transition-colors relative overflow-hidden"
      aria-label="Patrons and Modern Studios"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-8">
          <p
            ref={headingRef}
            className="font-display text-[11px] font-semibold tracking-[0.28em] uppercase text-[var(--accent)] will-change-transform"
          >
            Volume II · Patronage & Creative Guilds
          </p>
          {activeGuild && (
            <span className="inline-block mt-2 font-display text-[10.5px] uppercase tracking-widest text-[var(--accent)] bg-[var(--elevated)]/90 px-3 py-1 rounded-[2px] border border-[var(--border-strong)]/40 shadow-sm animate-fadeIn">
              {activeGuild}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-85 hover:opacity-100 transition-opacity duration-300 text-[var(--text)]">
          {logos.map((logo, idx) => (
            <div
              key={logo.name}
              ref={(el) => (logosRef.current[idx] = el)}
              onMouseEnter={() => setActiveGuild(`${logo.name} · ${logo.role}`)}
              onMouseLeave={() => setActiveGuild(null)}
              title={`${logo.name} — ${logo.role}`}
              aria-label={logo.name}
              className="flex items-center justify-center text-[var(--muted)] hover:text-[var(--accent)] hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(201,169,98,0.45)] transition-all duration-300 cursor-pointer will-change-transform"
            >
              {logo.svg}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

