import { Link } from 'react-router-dom';

export function ShimmerButton({
  children,
  to,
  className = '',
  onClick,
  disabled,
  type = 'button',
  ...props
}) {
  const content = (
    <span className="relative z-10 flex items-center justify-center gap-2 font-body text-base font-normal tracking-[-0.01em]">
      {children}
    </span>
  );

  const sharedClasses = `inline-flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap rounded-[2.88px] border border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 transition-all duration-150 hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${className}`;

  if (to) {
    return (
      <Link
        to={to}
        className={sharedClasses}
        {...props}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={sharedClasses}
      {...props}
    >
      {content}
    </button>
  );
}
