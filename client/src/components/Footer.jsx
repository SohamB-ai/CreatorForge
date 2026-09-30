import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="landing-footer border-t border-[var(--border)] pt-16 pb-12 mt-20 text-[var(--muted)] font-body text-sm">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[var(--border)]/40">
          {/* Brand Col (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-3 group"
              aria-label="CreatorForge"
            >
              <span className="w-10 h-10 rounded-[4px] border-2 border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] flex items-center justify-center shadow-sm font-canopee text-xl font-bold tracking-tight">
                CF
              </span>
              <span className="font-heading text-xl font-bold tracking-tight text-[var(--text)]">
                CreatorForge
              </span>
            </Link>
            <p className="font-body text-sm text-[var(--muted)] leading-relaxed max-w-sm">
              A sanctuary for source preservation and scholarly craft. Transform scattered voice notes, research folios, and photographic proofs into timeless manuscripts.
            </p>
            <div className="pt-2 font-editorial-new text-xs uppercase tracking-wider text-[var(--accent)]">
              Crafted for discerning writers and essayists.
            </div>
          </div>

          {/* Product Col (2 cols) */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-heading font-medium text-[var(--text)] text-sm uppercase tracking-wider">
              Studio
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/register" className="hover:text-[var(--text)] transition-colors">
                  Source Vaults
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[var(--text)] transition-colors">
                  Voice Dictation
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[var(--text)] transition-colors">
                  Brand Lexicon
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[var(--text)] transition-colors">
                  Cross-Format Remix
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[var(--text)] transition-colors">
                  Source Grounding
                </Link>
              </li>
            </ul>
          </div>

          {/* Workflows Col (2 cols) */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-heading font-medium text-[var(--text)] text-sm uppercase tracking-wider">
              Workflows
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/register" className="hover:text-[var(--text)] transition-colors">
                  For Essayists
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[var(--text)] transition-colors">
                  For Newsletters
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[var(--text)] transition-colors">
                  For Researchers
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[var(--text)] transition-colors">
                  For Video Essays
                </Link>
              </li>
            </ul>
          </div>

          {/* Standards Col (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-heading font-medium text-[var(--text)] text-sm uppercase tracking-wider">
              Standards
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-[var(--text)] font-medium">Zero-Training Policy:</span> Your words remain strictly your own.
              </li>
              <li>
                <span className="text-[var(--text)] font-medium">Storage Safety:</span> Encrypted user vaults with zero public leakage.
              </li>
              <li>
                <span className="text-[var(--text)] font-medium">Markdown Native:</span> Full export portability across all platforms.
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted)]">
          <div className="font-editorial-new tracking-widest uppercase">
            Anno Domini MMXXVI · CreatorForge · All rights reserved.
          </div>
          <div className="flex items-center gap-6 font-body">
            <Link to="/login" className="hover:text-[var(--text)] transition-colors">
              Access Archives
            </Link>
            <Link to="/register" className="hover:text-[var(--text)] transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
