import { useState } from 'react';
import {
  Sparkles,
  AudioLines,
  FileText,
  Image,
  Video,
  ArrowRight,
  Feather,
  Scroll,
  WandSparkles,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard.jsx';

export function BentoGrid() {
  const [selectedFormat, setSelectedFormat] = useState('X thread');
  const formats = ['X thread', 'LinkedIn post', 'Video script', 'Monograph', 'Executive Summary'];

  return (
    <section className="bento-section py-24 border-t border-[var(--border)] relative transition-colors" aria-label="CreatorForge core capabilities">
      <div className="max-w-6xl mx-auto px-6 mb-14 text-center">
        <span className="font-display text-[11px] font-semibold tracking-[0.3em] uppercase text-[var(--accent)] block mb-3">
          Volume III · Core Disciplines
        </span>
        <h2 className="text-3xl md:text-5xl font-heading font-medium tracking-tight text-[var(--text)] mb-4">
          The Scholar’s Toolkit: From Raw Source to Masterpiece
        </h2>
        <p className="text-[var(--muted)] font-body text-lg max-w-2xl mx-auto leading-relaxed">
          Rather than scattering thoughts across disconnected modern tools, CreatorForge gathers every note, recording, and reference into a unified, scholarly scriptorium.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-7 max-w-6xl mx-auto px-6">
        {/* Cell 1: The Source Archive */}
        <SpotlightCard className="md:col-span-7 corner-flourish relative min-h-[380px] flex flex-col justify-between p-8 bg-[var(--surface)] text-[var(--text)] overflow-hidden border border-[var(--border)] rounded-[4px] hover:border-[var(--accent)]/50 transition-colors shadow-lg">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src="/assets/creative_studio_art.jpg"
              alt="Archival creative references"
              className="w-full h-full object-cover object-center opacity-25 dark:opacity-30 dark:mix-blend-luminosity sepia-reveal"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/85 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-[3px] border border-[var(--accent)]/30 bg-[var(--elevated)]/90 px-3 py-1 font-display text-[10.5px] uppercase tracking-[0.18em] text-[var(--accent)] backdrop-blur-md">
              <Scroll size={13} className="text-[var(--accent)]" /> Discipline I · Archival Library
            </span>
          </div>

          <div className="relative z-10 mt-auto pt-14">
            <h3 className="text-2xl font-heading font-medium text-[var(--text)] tracking-normal mb-2.5">
              Every source preserved in context.
            </h3>
            <p className="text-[var(--muted)] font-body text-base leading-relaxed max-w-lg mb-6">
              Deposit research manuscripts, voice dictations, photographic plates, and historical references directly into your project's repository.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {[
                { label: 'Plate Imagery', icon: Image },
                { label: 'Vocal Dictations', icon: AudioLines },
                { label: 'Moving Film', icon: Video },
                { label: 'Manuscripts & Notes', icon: FileText },
              ].map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--border)] bg-[var(--elevated)] px-2.5 py-1 text-xs text-[var(--text)] font-body backdrop-blur-sm shadow-sm"
                >
                  <Icon size={13} className="text-[var(--accent)]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </SpotlightCard>

        {/* Cell 2: Audio to text */}
        <SpotlightCard className="md:col-span-5 corner-flourish relative min-h-[380px] flex flex-col justify-between p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] overflow-hidden rounded-[4px] hover:border-[var(--accent)]/50 transition-colors shadow-lg">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-[3px] border border-[var(--accent)]/30 bg-[var(--elevated)]/90 px-3 py-1 font-display text-[10.5px] uppercase tracking-[0.18em] text-[var(--accent)]">
              <AudioLines size={13} className="text-[var(--accent)]" /> Discipline II · Vocal Records
            </span>
          </div>

          <div className="my-6 p-4 rounded-[4px] bg-[var(--elevated)] border border-[var(--border)] flex flex-col justify-center shadow-inner">
            <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-3 font-display">
              <span className="tracking-wide">folio-lecture-notes.m4a</span>
              <span className="font-mono text-[var(--accent)]">04:18</span>
            </div>
            <div className="h-10 flex items-center justify-center gap-1">
              {[25, 42, 28, 65, 48, 85, 58, 34, 75, 95, 52, 28, 60, 38, 20, 55, 36, 68, 40, 22].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.max(15, h)}%` }}
                  className="w-1.5 bg-[var(--accent)] rounded-[1px] opacity-80"
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-heading font-medium tracking-normal text-[var(--text)] mb-2">
              From verbal contemplation to structured prose.
            </h3>
            <p className="text-[var(--muted)] font-body text-base leading-relaxed">
              Dictate your deepest thoughts while in motion. CreatorForge transcribes and synthesizes speech alongside your documents into coherent dissertations.
            </p>
          </div>
        </SpotlightCard>

        {/* Cell 3: Brand Kit & Guidelines */}
        <SpotlightCard className="md:col-span-5 corner-flourish relative min-h-[350px] flex flex-col justify-between p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-[4px] hover:border-[var(--accent)]/50 transition-colors shadow-lg">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-[3px] border border-[var(--accent)]/30 bg-[var(--elevated)]/90 px-3 py-1 font-display text-[10.5px] uppercase tracking-[0.18em] text-[var(--accent)]">
              <Feather size={13} className="text-[var(--accent)]" /> Discipline III · The Brand Lexicon
            </span>
          </div>

          <div className="my-6 space-y-2.5">
            <div className="p-3 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)] flex items-center justify-between font-body shadow-sm">
              <span className="text-sm text-[var(--muted)]">Tone & Register</span>
              <span className="text-sm font-medium text-[var(--text)] italic">Scholarly, authoritative, yet inviting</span>
            </div>
            <div className="p-3 rounded-[3px] bg-[var(--elevated)] border border-[var(--border)] flex items-center justify-between font-body shadow-sm">
              <span className="text-sm text-[var(--muted)]">Target Audience</span>
              <span className="text-sm font-medium text-[var(--text)] italic">Curators, researchers & thinkers</span>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-heading font-medium tracking-normal text-[var(--text)] mb-1.5">
              Establish your intellectual signature.
            </h3>
            <p className="text-[var(--muted)] font-body text-base leading-relaxed">
              Inscribe your distinctive voice, rhetoric, and rules of engagement once. Every generated draft adheres strictly to your canon.
            </p>
          </div>
        </SpotlightCard>

        {/* Cell 4: 1-Click Multi-Format Remix with Wax Seal */}
        <SpotlightCard className="md:col-span-7 corner-flourish relative min-h-[350px] flex flex-col justify-between p-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] overflow-hidden rounded-[4px] hover:border-[var(--accent)]/50 transition-colors shadow-lg">
          {/* Authentic Crimson Wax Seal Badge */}
          <div className="wax-seal -top-3 right-6" title="Official Seal of Quality">
            <Sparkles size={18} className="text-[#F5EFEB]" />
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-[3px] border border-[var(--accent)]/30 bg-[var(--elevated)]/90 px-3 py-1 font-display text-[10.5px] uppercase tracking-[0.18em] text-[var(--accent)]">
              <WandSparkles size={13} className="text-[var(--accent)]" /> Discipline IV · Transmutation
            </span>
          </div>

          <div className="my-5 p-4 rounded-[4px] bg-[var(--elevated)] border border-[var(--border)] shadow-inner">
            <div className="flex flex-wrap gap-2 mb-3">
              {formats.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFormat(f)}
                  className={`px-3 py-1 font-display text-[11px] uppercase tracking-wider rounded-[3px] transition-all ${
                    selectedFormat === f
                      ? 'bg-gradient-to-b from-[#C49E4A] via-[#A27B2B] to-[#87621B] text-[#FCFAF6] font-semibold shadow-sm'
                      : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 shadow-sm'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="text-sm font-body text-[var(--text)] bg-[var(--surface)] p-3 rounded-[3px] border border-[var(--border)] flex items-center justify-between shadow-sm">
              <span>Transmute selected source material into an authentic {selectedFormat.toLowerCase()}.</span>
              <ArrowRight size={14} className="text-[var(--accent)] shrink-0 ml-2" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-heading font-medium tracking-normal text-[var(--text)] mb-1.5">
              Turn a single insight into a scholarly canon.
            </h3>
            <p className="text-[var(--muted)] font-body text-base leading-relaxed">
              Repurpose any foundational thesis or lecture into concise dispatches, monograph chapters, or video scripts in your voice.
            </p>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}
