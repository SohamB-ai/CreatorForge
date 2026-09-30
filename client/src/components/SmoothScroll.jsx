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
  const lenis = useLenis(() => {
    ScrollTrigger.update();
  });

  useEffect(() => {
    if (!lenis) return;

    // Direct GSAP ticker to advance Lenis in lockstep
    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateTicker);
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
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
        infinite: false,
        autoRaf: false,
      }}
    >
      <ScrollToTop />
      <GsapLenisSync />
      {children}
    </ReactLenis>
  );
}

