import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function ScrollProgress() {
  const barRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respect user motion preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const trigger = ScrollTrigger.create({
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${self.progress})`;
        }
        if (glowRef.current) {
          glowRef.current.style.left = `${self.progress * 100}%`;
          glowRef.current.style.opacity = self.progress > 0.005 ? '1' : '0';
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <div
      className="scroll-progress-container fixed top-0 left-0 right-0 h-[2.5px] z-[999] pointer-events-none bg-[#4A3F35]/30 backdrop-blur-[1px]"
      aria-hidden="true"
    >
      <div
        ref={barRef}
        className="scroll-progress-bar h-full w-full bg-gradient-to-r from-[#8B2635] via-[#C9A962] to-[#FFE680] origin-left shadow-[0_0_10px_rgba(201,169,98,0.85)] will-change-transform"
        style={{ transform: 'scaleX(0)' }}
      />
      <div
        ref={glowRef}
        className="scroll-progress-glow absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#FFE680] shadow-[0_0_12px_#FFE680,0_0_6px_#C9A962] opacity-0 transition-opacity duration-200"
        style={{ left: '0%' }}
      />
    </div>
  );
}
