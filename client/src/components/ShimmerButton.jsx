import { Link } from 'react-router-dom';

export function ShimmerButton({
  children,
  to,
  className = '',
  shimmerColor = '#FDF6E2',
  shimmerDuration = '3.5s',
  borderRadius = '4px',
  background = 'var(--brass-gradient)',
  onClick,
  disabled,
  type = 'button',
  ...props
}) {
  const content = (
    <span className="relative z-10 flex items-center justify-center gap-2 font-display text-xs uppercase tracking-[0.18em] font-semibold text-[#1C1714] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
      {children}
    </span>
  );

  const sharedClasses = `shimmer-btn group relative z-0 inline-flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/20 px-6 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.25)] hover:brightness-108 hover:shadow-[0_4px_16px_var(--soft)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`;

  if (to) {
    return (
      <Link
        to={to}
        style={{ borderRadius, background }}
        className={sharedClasses}
        {...props}
      >
        <span
          className="shimmer-effect absolute inset-0 pointer-events-none"
          style={{ '--shimmer-duration': shimmerDuration, '--shimmer-color': shimmerColor }}
        />
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ borderRadius, background }}
      className={sharedClasses}
      {...props}
    >
      <span
        className="shimmer-effect absolute inset-0 pointer-events-none"
        style={{ '--shimmer-duration': shimmerDuration, '--shimmer-color': shimmerColor }}
      />
      {content}
    </button>
  );
}
