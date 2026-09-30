import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function OrnateDivider({ glyph = '✶', className = '' }) {
  const containerRef = useRef(null);
  const lineRef = useRef(null);
  const glyphRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        lineRef.current,
        { scaleX: 0, opacity: 0.3 },
        {
          scaleX: 1,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 92%',
          },
        }
      );

      gsap.fromTo(
        glyphRef.current,
        { scale: 0.5, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          delay: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 92%',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`ornate-divider-container relative my-10 flex items-center justify-center max-w-5xl mx-auto px-6 ${className}`}
      role="separator"
      aria-hidden="true"
    >
      <div
        ref={lineRef}
        className="ornate-divider-line w-full h-[1px] bg-[var(--border)] origin-center will-change-transform"
      />
      <span
        ref={glyphRef}
        className="ornate-divider-glyph absolute bg-[var(--bg)] px-3 text-[var(--color-ember-orange)] text-sm select-none font-editorial-new font-normal will-change-transform"
      >
        {glyph}
      </span>
    </div>
  );
}
