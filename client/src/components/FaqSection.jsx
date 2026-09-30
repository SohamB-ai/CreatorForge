import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function FaqSection() {
  const containerRef = useRef(null);
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: 'How does CreatorForge prevent generic or robotic AI phrasing?',
      answer:
        'Standard chatbots default to bland corporate clichés because they lack your specific context. CreatorForge strictly grounds every draft in your uploaded primary sources, voice memos, and PDFs. Additionally, our Brand Lexicon lets you enforce custom voice registers, cadence rules, and prohibited buzzword lists.',
    },
    {
      question: 'What source file formats can I deposit into a project archive?',
      answer:
        'You can upload vocal dictations and interview recordings (M4A, MP3, WAV up to 5MB), research PDFs, photographic proofs and visual references (JPG, PNG, WEBP), and markdown or plain text notes. Everything is indexed and referenced simultaneously.',
    },
    {
      question: 'Are my unpublished drafts and private research used to train models?',
      answer:
        'Never. Your project archives, voice recordings, and generated manuscripts remain strictly private to your account. We maintain an ironclad zero-training boundary; your intellectual property and confidential research are never fed into public foundation models.',
    },
    {
      question: 'How do I export my completed manuscripts to Substack or Notion?',
      answer:
        'Every completed draft can be copied to your clipboard with clean typography or exported directly as a raw Markdown file. It is formatted to paste cleanly into Substack, Medium, Ghost, Notion, or your personal CMS without messy HTML artifacts.',
    },
    {
      question: 'Do I need a credit card to begin crafting projects?',
      answer:
        'No. You can register an account, set up your Brand Lexicon, upload your first research materials, and start crafting drafts immediately without entering credit card details.',
    },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <section
      ref={containerRef}
      className="faq-section py-20 px-6 max-w-4xl mx-auto"
      aria-label="Frequently Asked Questions"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-medium tracking-tight text-[var(--text)] mb-3 leading-tight">
          Answers to common inquiries.
        </h2>
        <p className="text-[var(--muted)] font-body text-lg leading-relaxed">
          Everything you need to know about source preservation, voice guardrails, and data isolation.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.question}
              className="rounded-[4px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--elevated)]/60 transition-colors"
              >
                <span className="font-heading text-lg sm:text-xl font-medium text-[var(--text)] leading-snug">
                  {faq.question}
                </span>
                <span
                  className={`w-7 h-7 rounded-full border border-[var(--border)] bg-[var(--elevated)] flex items-center justify-center shrink-0 text-[var(--accent)] transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                >
                  <ChevronDown size={16} />
                </span>
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-6 pt-1 text-[var(--muted)] font-body text-base leading-relaxed border-t border-[var(--border)]/20 animate-fadeIn">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
