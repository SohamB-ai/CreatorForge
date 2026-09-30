export function SpotlightCard({
  children,
  className = '',
  ...props
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[11.52px] border border-[var(--color-ink-black)] bg-[var(--color-bone-cream)] text-[var(--color-ink-black)] p-6 shadow-[var(--shadow-sm)] transition-all duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
