export function AtmosphereOverlay() {
  return (
    <>
      {/* Fixed Library Vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 55%, rgba(28, 23, 20, 0.45) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Fixed Paper Grain Texture */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none z-[9999] opacity-[0.035] mix-blend-overlay"
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
