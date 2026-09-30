import { Link } from 'react-router-dom';

export function ShimmerButton({
  children,
  to,
  className = '',
  shimmerColor = '#ffffff',
  shimmerDuration = '3s',
  borderRadius = '8px',
  background = 'rgba(124, 58, 237, 1)',
  onClick,
  disabled,
  type = 'button',
  ...props
}) {
  const content = (
    <span className="relative z-10 flex items-center justify-center gap-2">
      {children}
    </span>
  );

  const sharedClasses = `shimmer-btn group relative z-0 inline-flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-5 py-2.5 font-medium text-white shadow-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${className}`;

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
