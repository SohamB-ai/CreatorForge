export function BrandColorPreview({ colors = '' }) {
  if (!colors || typeof colors !== 'string') return null;

  const hexList = colors
    .split(',')
    .map((c) => c.trim())
    .filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c));

  if (!hexList.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2" aria-label="Brand color swatches preview">
      <span className="text-[11px] font-medium text-zinc-400 mr-1">Preview:</span>
      {hexList.map((hex, i) => (
        <span
          key={`${hex}-${i}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shadow-sm"
        >
          <span
            className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-inner"
            style={{ backgroundColor: hex }}
          />
          <span className="text-zinc-700 dark:text-zinc-300">{hex}</span>
        </span>
      ))}
    </div>
  );
}
