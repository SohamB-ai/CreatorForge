import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ReactLenis, useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function ScrollToTop() {
  const { pathname } = useLocation();
  const lenis = useLenis();

  useEffect(() => {
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
    ScrollTrigger.refresh();
  }, [pathname, lenis]);

  return null;
}

function GsapLenisSync() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    if (typeof window !== 'undefined') {
      window.lenis = lenis;
    }

    // Connect Lenis scroll events to GSAP ScrollTrigger
    const handleScroll = () => {
      ScrollTrigger.update();
    };
    lenis.on('scroll', handleScroll);

    // Direct GSAP ticker to advance Lenis in lockstep with rendering
    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off('scroll', handleScroll);
      gsap.ticker.remove(updateTicker);
      if (typeof window !== 'undefined' && window.lenis === lenis) {
        delete window.lenis;
      }
    };
  }, [lenis]);

  return null;
}

export function SmoothScroll({ children }) {
  const lenisRef = useRef(null);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      autoRaf={false}
      options={{
        lerp: 0.08,
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
        infinite: false,
        syncTouch: false,
      }}
    >
      <ScrollToTop />
      <GsapLenisSync />
      {children}
    </ReactLenis>
  );
}

