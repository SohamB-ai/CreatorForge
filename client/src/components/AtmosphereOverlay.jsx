export function AtmosphereOverlay() {
  return (
    <>
      {/* Dynamic Academic Vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-[9998] transition-opacity duration-500 vignette-overlay"
        aria-hidden="true"
      />

      {/* Tactile Paper Grain Texture */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none z-[9999] paper-noise-overlay transition-opacity duration-500"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <filter id="academia-paper-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#academia-paper-noise)" />
      </svg>
    </>
  );
}
