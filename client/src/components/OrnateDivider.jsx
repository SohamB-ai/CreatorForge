export function OrnateDivider({ glyph = '✶', className = '' }) {
  return (
    <div className={`ornate-divider ${className}`} role="separator" aria-hidden="true">
      <span className="ornate-divider-glyph">{glyph}</span>
    </div>
  );
}
