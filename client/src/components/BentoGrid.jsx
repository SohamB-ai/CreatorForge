import { useState } from 'react';
import {
  Sparkles,
  AudioLines,
  FileText,
  Image,
  Video,
  Check,
  WandSparkles,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard.jsx';

export function BentoGrid() {
  const [selectedFormat, setSelectedFormat] = useState('Instagram caption');
  const formats = ['Instagram caption', 'Blog post', 'Video script', 'Tweet thread', 'LinkedIn post'];

  return (
    <section className="bento-section py-16" aria-label="CreatorForge core capabilities">
      <div className="max-w-6xl mx-auto px-6 mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
          Engineered for complete creative flow.
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 text-base max-w-2xl leading-relaxed">
          One system that unifies your unstructured research, maintains your brand voice, and generates multi-channel creative assets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto px-6">
        {/* Cell 1: Multimodal Studio (col-span-7) */}
        <SpotlightCard className="md:col-span-7 relative min-h-[360px] flex flex-col justify-between p-8 bg-zinc-950 text-white overflow-hidden border-zinc-800">
          <div className="absolute inset-0 z-0">
            <img
              src="/assets/creative_studio_art.jpg"
              alt="Creative studio sculpture"
              className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity scale-105 transition-transform duration-700 hover:scale-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/20" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 backdrop-blur-md">
              <Sparkles size={13} className="text-violet-400" /> Multimodal Engine
            </span>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono tracking-wide">ACTIVE</span>
            </div>
          </div>

          <div className="relative z-10 mt-auto pt-16">
            <h3 className="text-2xl font-semibold text-white tracking-tight mb-2">
              Ingest any creative source.
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed max-w-md mb-6">
              Drop moodboard snapshots, raw voice memos, video reels, and PDF briefs directly into one unified workspace.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Images', icon: Image },
                { label: 'Audio', icon: AudioLines },
                { label: 'Video', icon: Video },
                { label: 'Briefs', icon: FileText },
              ].map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 backdrop-blur-sm"
                >
                  <Icon size={13} className="text-violet-400" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </SpotlightCard>

        {/* Cell 2: Audio & Voice Note Synthesis (col-span-5) */}
        <SpotlightCard className="md:col-span-5 relative min-h-[360px] flex flex-col justify-between p-8 bg-zinc-900/80 dark:bg-zinc-900 border-zinc-800 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <AudioLines size={13} /> Sonic Context
            </span>
          </div>

          <div className="my-8 h-24 px-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center gap-1.5">
            {[24, 45, 30, 68, 48, 85, 60, 40, 75, 95, 52, 34, 62, 44, 20, 58, 38, 70, 48, 28].map((h, i) => (
              <span
                key={i}
                style={{ height: `${Math.max(12, h)}%` }}
                className="w-1.5 bg-gradient-to-t from-amber-600 to-amber-300 rounded-full transition-all duration-300 hover:scale-y-125"
              />
            ))}
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white mb-2">
              Voice notes to structured copy.
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Mumble ideas while walking. CreatorForge listens to voice nuances and turns spontaneous sparks into coherent strategy.
            </p>
          </div>
        </SpotlightCard>

        {/* Cell 3: Brand Kit & Voice Memory (col-span-5) */}
        <SpotlightCard className="md:col-span-5 relative min-h-[340px] flex flex-col justify-between p-8 bg-zinc-900/90 dark:bg-zinc-900 border-zinc-800 text-white">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Check size={13} /> Brand Kit Locked
            </span>
          </div>

          <div className="my-6 space-y-3">
            <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-zinc-400">Tone of voice</span>
              <span className="text-xs font-medium text-zinc-200">Warm & Thoughtful</span>
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-zinc-400">Palette memory</span>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-violet-500 ring-2 ring-violet-400/20" />
                <span className="w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-emerald-400/20" />
                <span className="w-4 h-4 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white mb-1.5">
              Zero repetitive prompt coaching.
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Set tone, audience, and style rules once. Every generation automatically sounds like your studio.
            </p>
          </div>
        </SpotlightCard>

        {/* Cell 4: 1-Click Multi-Format Remix (col-span-7) */}
        <SpotlightCard className="md:col-span-7 relative min-h-[340px] flex flex-col justify-between p-8 bg-gradient-to-br from-zinc-950 to-zinc-900 border-zinc-800 text-white overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <WandSparkles size={13} /> Content Remix
            </span>
          </div>

          <div className="my-6 p-4 rounded-xl bg-zinc-950/80 border border-violet-500/20">
            <div className="flex flex-wrap gap-2 mb-3">
              {formats.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFormat(f)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    selectedFormat === f
                      ? 'bg-violet-600 text-white font-medium shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="text-xs font-mono text-zinc-300 bg-zinc-900/90 p-3 rounded border border-white/5">
              <span className="text-violet-400">&gt; Generating:</span> {selectedFormat} tailored to your audience with key takeaways highlighted.
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white mb-1.5">
              Transform one asset into a full campaign.
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Convert a long-form interview or keynote into punchy carousel slides, thread recaps, or video treatments with one tap.
            </p>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}
