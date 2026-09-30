import { useRef } from 'react';

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'var(--soft)',
  ...props
}) {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--spotlight-x', `${x}px`);
    containerRef.current.style.setProperty('--spotlight-y', `${y}px`);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`spotlight-card group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] p-6 transition-all duration-200 shadow-[var(--card-shadow)] ${className}`}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at var(--spotlight-x, 0px) var(--spotlight-y, 0px), ${spotlightColor}, transparent 40%)`,
        }}
      />
      {children}
    </div>
  );
}
