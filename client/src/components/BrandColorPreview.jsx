export function BrandColorPreview({ colors = '' }) {
  if (!colors || typeof colors !== 'string') return null;

  const hexList = colors
    .split(',')
    .map((c) => c.trim())
    .filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c));

  if (!hexList.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2" aria-label="Brand color swatches preview">
      <span className="text-xs font-editorial-new text-[var(--muted)] mr-1">Preview:</span>
      {hexList.map((hex, i) => (
        <span
          key={`${hex}-${i}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2.88px] text-xs font-mono border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-sm)]"
        >
          <span
            className="w-3.5 h-3.5 rounded-none border border-[var(--border)]"
            style={{ backgroundColor: hex }}
          />
          <span className="text-[var(--text)]">{hex}</span>
        </span>
      ))}
    </div>
  );
}
