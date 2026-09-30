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
        { scaleX: 0, opacity: 0.2 },
        {
          scaleX: 1,
          opacity: 1,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        }
      );

      gsap.fromTo(
        glyphRef.current,
        { scale: 0.2, rotation: -75, opacity: 0 },
        {
          scale: 1,
          rotation: 0,
          opacity: 1,
          duration: 0.9,
          delay: 0.2,
          ease: 'back.out(2)',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`ornate-divider-container relative my-12 flex items-center justify-center max-w-4xl mx-auto px-6 ${className}`}
      role="separator"
      aria-hidden="true"
    >
      <div
        ref={lineRef}
        className="ornate-divider-line w-full h-[1px] bg-gradient-to-r from-transparent via-[#4A3F35] via-[#C9A962] via-[#4A3F35] to-transparent origin-center will-change-transform"
      />
      <span
        ref={glyphRef}
        className="ornate-divider-glyph absolute bg-[var(--bg)] px-4 text-[#C9A962] text-sm select-none font-display drop-shadow-[0_0_8px_rgba(201,169,98,0.3)] will-change-transform"
      >
        {glyph}
      </span>
    </div>
  );
}

