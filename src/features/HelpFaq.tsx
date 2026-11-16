import React, { useState } from 'react';
import { ChevronDown, Star, Download, Send } from 'lucide-react';
import { useAppStore } from '@/src/store/useAppStore';

const FAQ_ITEMS = [
  {
    q: 'Do I need a paid plan to use Srishti or slash commands?',
    a: 'No. Srishti runs on the fast Gemini model by default, and the Always-On Setup prompt works on free tiers of ChatGPT, Claude, and Gemini too. Only optional heavy-reasoning models in Settings require a paid billing key.',
  },
  {
    q: 'Can I write in Malayalam or Manglish?',
    a: 'Yes! You can write your full message in Malayalam script (മലയാളം) or Manglish (for example: "Ee startup idea sherikkum work aakumo? /redteam"). Srishti instructs Gemini to reply in the language you wrote in while keeping slash command words in English.',
  },
  {
    q: 'Which command should I try first?',
    a: 'Try /redteam on any plan you are excited about, /ELI5 on a technical concept that feels foggy, or /TLDR when you paste a long email or policy document. Adding /no-fluff alongside any command strips polite filler immediately.',
  },
  {
    q: 'Why was my command ignored or only partially followed?',
    a: 'Two common reasons: (1) If you typed a slash inside a URL or file path without a space before it, Srishti intentionally ignores it so file paths are not broken. (2) If you combined two conflicting commands like /TLDR and /deepdive, Srishti follows the one appearing last.',
  },
  {
    q: 'Should I trust the answer fully for medical, legal, or money decisions?',
    a: 'Never blindly. Commands change the tone, structure, and critical lens of an answer—not its underlying factual accuracy. Always verify numbers, tax/GST figures, legal rules, and investment decisions with primary sources or qualified professionals.',
  },
];

export const HelpFaq: React.FC = () => {
  const userFeedback = useAppStore((s) => s.userFeedback);
  const addUserFeedback = useAppStore((s) => s.addUserFeedback);
  const showToast = useAppStore((s) => s.showToast);

  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      showToast('Please write a short note before submitting', 'warning');
      return;
    }
    addUserFeedback(rating, comment);
    setComment('');
    showToast('Feedback saved locally — thank you!', 'success');
  };

  const handleExportFeedback = () => {
    const blob = new Blob([JSON.stringify(userFeedback, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'srishti-feedback.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Feedback exported as JSON', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Help & FAQ
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Answers to common questions about slash commands, Malayalam support, and accuracy boundaries.
        </p>
      </div>

      {/* FAQ Accordion */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] divide-y divide-slate-100 dark:divide-white/[0.06]">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.q}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition"
              >
                <span className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* In-App Feedback Form */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">Send Feedback</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Saved locally in your browser so you can track notes or export them anytime.
            </p>
          </div>
          {userFeedback.length > 0 && (
            <button
              type="button"
              onClick={handleExportFeedback}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Feedback ({userFeedback.length})
            </button>
          )}
        </div>

        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mr-1">
              Rating:
            </span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`Rate ${star} out of 5`}
                className="p-1 cursor-pointer"
              >
                <Star
                  className={`w-5 h-5 ${
                    star <= rating ? 'text-amber-500 fill-current' : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Which command worked well, or what new command should we add?"
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-4 py-3 text-sm"
          />

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Save Feedback
          </button>
        </form>

        {userFeedback.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
            {userFeedback.map((fb) => (
              <div
                key={fb.id}
                className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-[#0B0D12] p-3.5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-slate-500 font-mono">
                  <span>Rating: {fb.rating}/5</span>
                  <span>{new Date(fb.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200">{fb.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
