import { useState } from 'react';
import {
  Sparkles,
  AudioLines,
  FileText,
  Image,
  Video,
  Check,
  WandSparkles,
  ArrowRight,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard.jsx';

export function BentoGrid() {
  const [selectedFormat, setSelectedFormat] = useState('X thread');
  const formats = ['X thread', 'LinkedIn post', 'Video script', 'Blog post', 'Summary'];

  return (
    <section className="bento-section py-20 border-t border-white/[0.06]" aria-label="CreatorForge core capabilities">
      <div className="max-w-6xl mx-auto px-6 mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          Everything your content needs in one workspace.
        </h2>
        <p className="text-zinc-400 text-base max-w-2xl leading-relaxed">
          Instead of scattering notes across four different tools, CreatorForge connects your raw source files directly to your writing workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto px-6">
        {/* Cell 1: Multimodal Studio */}
        <SpotlightCard className="md:col-span-7 relative min-h-[360px] flex flex-col justify-between p-8 bg-[#121217] text-white overflow-hidden border border-white/[0.08] rounded-xl hover:border-zinc-700 transition-colors">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src="/assets/creative_studio_art.jpg"
              alt="Creative studio reference"
              className="w-full h-full object-cover object-center opacity-25 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121217] via-[#121217]/80 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 backdrop-blur-md">
              <FileText size={13} className="text-orange-400" /> Source Library
            </span>
          </div>

          <div className="relative z-10 mt-auto pt-12">
            <h3 className="text-xl font-semibold text-white tracking-tight mb-2">
              Every format in one place.
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed max-w-md mb-6">
              Upload moodboard images, audio voice memos, video references, and research documents directly into your project.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Images', icon: Image },
                { label: 'Audio recordings', icon: AudioLines },
                { label: 'Video clips', icon: Video },
                { label: 'Documents & notes', icon: FileText },
              ].map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 backdrop-blur-sm"
                >
                  <Icon size={13} className="text-orange-400" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </SpotlightCard>

        {/* Cell 2: Audio to text */}
        <SpotlightCard className="md:col-span-5 relative min-h-[360px] flex flex-col justify-between p-8 bg-[#15151c] border border-white/[0.08] text-white overflow-hidden rounded-xl hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
              <AudioLines size={13} className="text-orange-400" /> Audio & Voice Memos
            </span>
          </div>

          <div className="my-6 p-4 rounded-xl bg-[#0e0e13] border border-white/[0.06] flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
              <span>founder-interview.m4a</span>
              <span className="font-mono text-zinc-500">3:42</span>
            </div>
            <div className="h-10 flex items-center justify-center gap-1">
              {[30, 48, 25, 75, 52, 90, 65, 38, 80, 100, 58, 30, 65, 42, 22, 60, 40, 72, 45, 25].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.max(15, h)}%` }}
                  className="w-1.5 bg-orange-500/80 rounded-full"
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white mb-2">
              From voice memo to outline.
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Record voice notes on the go. CreatorForge reads your audio directly alongside your other project sources to draft outlines and drafts.
            </p>
          </div>
        </SpotlightCard>

        {/* Cell 3: Brand Kit & Guidelines */}
        <SpotlightCard className="md:col-span-5 relative min-h-[340px] flex flex-col justify-between p-8 bg-[#15151c] border border-white/[0.08] text-white rounded-xl hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
              <Check size={13} className="text-emerald-400" /> Brand Guidelines
            </span>
          </div>

          <div className="my-6 space-y-2.5">
            <div className="p-3 rounded-lg bg-[#0e0e13] border border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-zinc-400">Tone of voice</span>
              <span className="text-xs font-medium text-zinc-200">Conversational and direct</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0e0e13] border border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-zinc-400">Target audience</span>
              <span className="text-xs font-medium text-zinc-200">Designers and founders</span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white mb-1.5">
              Set your voice once.
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Save your tone, audience, and creative guardrails in your Brand Kit. They are automatically applied to every chat and remix.
            </p>
          </div>
        </SpotlightCard>

        {/* Cell 4: 1-Click Multi-Format Remix */}
        <SpotlightCard className="md:col-span-7 relative min-h-[340px] flex flex-col justify-between p-8 bg-[#121217] border border-white/[0.08] text-white overflow-hidden rounded-xl hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
              <WandSparkles size={13} className="text-orange-400" /> Content Remix
            </span>
          </div>

          <div className="my-5 p-4 rounded-xl bg-[#0e0e13] border border-white/[0.06]">
            <div className="flex flex-wrap gap-2 mb-3">
              {formats.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFormat(f)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    selectedFormat === f
                      ? 'bg-orange-500 text-white font-medium'
                      : 'bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="text-xs text-zinc-300 bg-black/40 p-3 rounded border border-white/[0.04] flex items-center justify-between">
              <span>Transform selected asset into a {selectedFormat.toLowerCase()}.</span>
              <ArrowRight size={13} className="text-orange-400 shrink-0 ml-2" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white mb-1.5">
              Turn one piece into many.
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Pick any interview, brief, or document from your library and remix it into a blog post, social post, or video script.
            </p>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}
