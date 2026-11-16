import React, { useMemo, useRef, useState } from 'react';
import { ShieldAlert, Flame, CheckCircle2, HelpCircle, ArrowRight, Bookmark, RotateCcw, Square, ExternalLink } from 'lucide-react';
import { buildSystemInstruction } from '@/src/lib/commandEngine';
import { generateJSON, getFriendlyErrorMessage } from '@/src/lib/gemini';
import { FEEDBACK_REPORT_SCHEMA, isFeedbackReport } from '@/src/lib/schemas';
import { useAllCommands, useAppStore } from '@/src/store/useAppStore';
import type { FeedbackReport } from '@/src/types';

const LENS_IDS = ['brutal', 'redteam', 'devilsadvocate', 'realitycheck', 'steelman', 'challenge'];

const SAMPLE_IDEAS = [
  {
    label: 'Kochi Cloud Kitchen',
    text: 'I want to launch a healthy Kerala sadya & meal-bowl cloud kitchen in Kakkanad targeting IT park employees at ₹169/bowl, breaking even in month 2 with ₹3 lakh capital.',
  },
  {
    label: 'Creator Reel Script',
    text: 'Hook: "Stop learning React in 2026!" Body: Explain why AI writes UI now, sell my ₹999 prompt pack in the bio.',
  },
  {
    label: 'Career Switch Plan',
    text: 'I have 3 years of manual QA experience. I plan to quit my job next month, study AI engineering full-time for 45 days, and apply for ₹24 LPA remote roles.',
  },
];

export const HonestFeedbackStudio: React.FC = () => {
  const allCommands = useAllCommands();
  const settings = useAppStore((s) => s.settings);
  const savePromptItem = useAppStore((s) => s.savePromptItem);
  const openPromptInChatGpt = useAppStore((s) => s.openPromptInChatGpt);
  const showToast = useAppStore((s) => s.showToast);

  const [draft, setDraft] = useState(SAMPLE_IDEAS[0].text);
  const [selectedLensId, setSelectedLensId] = useState('redteam');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [error, setError] = useState<ReturnType<typeof getFriendlyErrorMessage> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const lensCommands = useMemo(
    () =>
      LENS_IDS.map((id) => allCommands.find((c) => c.id === id)).filter(
        (c): c is NonNullable<typeof c> => Boolean(c)
      ),
    [allCommands]
  );

  const activeLens = useMemo(
    () => lensCommands.find((c) => c.id === selectedLensId) ?? lensCommands[0],
    [lensCommands, selectedLensId]
  );

  const runAnalysis = async () => {
    if (!draft.trim()) {
      showToast('Paste an idea, plan, resume, or script first', 'warning');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const baseInstruction = buildSystemInstruction(activeLens ? [activeLens] : [], {
      commandOverrides: settings.commandOverrides,
    });

    const systemInstruction = `${baseInstruction}\n\nSTRUCTURED STUDIO TASK: Return a thorough, candid evaluation strictly matching the JSON schema. Identify realistic failure modes, rate each risk's severity (high/medium/low) and likelihood (high/medium/low), uncover hidden assumptions, acknowledge genuine strengths only if earned, and provide concrete next steps.`;

    try {
      const result = await generateJSON<FeedbackReport>({
        model: settings.model,
        contents: `Evaluate this submission using the ${activeLens?.slash ?? '/redteam'} lens:\n\n${draft}`,
        systemInstruction,
        responseSchema: FEEDBACK_REPORT_SCHEMA,
        thinkingLevel: settings.thinkingLevel,
        signal: controller.signal,
        validator: isFeedbackReport,
      });
      setReport(result);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      if (friendly.kind !== 'aborted') {
        setError(friendly);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  // Build 3x3 Severity x Likelihood matrix counts
  const heatmapGrid = useMemo(() => {
    const levels: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    if (!report) return null;
    return levels.map((sev) =>
      levels.map((lik) => ({
        severity: sev,
        likelihood: lik,
        items: report.biggestRisks.filter((r) => r.severity === sev && r.likelihood === lik),
      }))
    );
  }, [report]);

  const verdictStyle = (vt: FeedbackReport['verdictType']) => {
    switch (vt) {
      case 'strong':
      case 'proceed':
        return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      case 'rethink':
        return 'border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300';
      default:
        return 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Honest Feedback Studio
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paste any startup idea, career plan, resume section, or reel script. Choose a critical lens for a structured risk & reality report.
        </p>
      </div>

      {/* Input & Lens Selector */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Choose feedback lens
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_IDEAS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => setDraft(sample.text)}
                className="px-2.5 py-1 rounded-lg text-xs border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                Sample: {sample.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {lensCommands.map((lens) => {
            const active = lens.id === selectedLensId;
            return (
              <button
                key={lens.id}
                type="button"
                onClick={() => setSelectedLensId(lens.id)}
                className={`text-left rounded-xl border p-3 transition cursor-pointer ${
                  active
                    ? 'border-orange-500/60 bg-orange-500/10 text-slate-950 dark:text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">
                  {lens.slash}
                </div>
                <div className="text-xs font-medium mt-1 truncate">{lens.label}</div>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <label htmlFor="feedback-studio-input" className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Paste your idea, plan, resume, or script
          </label>
          <textarea
            id="feedback-studio-input"
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Describe your plan with numbers, timeline, and assumptions for sharpest feedback..."
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Active lens: <span className="font-mono text-orange-600 dark:text-orange-400">{activeLens?.slash}</span> — {activeLens?.shortDescription}
          </p>
          <div className="flex items-center gap-2">
            {loading ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 text-white cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={runAnalysis}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 transition cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                Run {activeLens?.slash} Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((k) => (
            <div
              key={k}
              className="h-40 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-3"
            >
              <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/3" />
              <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-5/6" />
              <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-rose-700 dark:text-rose-300">{error.title}</p>
            <p className="text-rose-600 dark:text-rose-200">{error.description}</p>
            <p className="text-xs text-rose-500">{error.suggestion}</p>
          </div>
          {error.retryable && (
            <button
              type="button"
              onClick={runAnalysis}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Structured Report */}
      {report && !loading && (
        <div className="space-y-6">
          {/* Verdict + Confidence Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className={`lg:col-span-2 rounded-2xl border p-5 space-y-2 ${verdictStyle(report.verdictType)}`}>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                <span>Verdict · {report.verdictType}</span>
                <span className="font-mono">{activeLens?.slash}</span>
              </div>
              <p className="text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                {report.verdict}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-2">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Confidence Level
              </div>
              <div className="font-display text-2xl font-bold capitalize text-slate-900 dark:text-white">
                {report.confidence}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {report.confidenceReason}
              </p>
            </div>
          </div>

          {/* Severity Heatmap + Risks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Risk Severity Heatmap
                </h3>
                <span className="text-xs text-slate-500 tabular-nums">
                  {report.biggestRisks.length} risks mapped
                </span>
              </div>

              {heatmapGrid && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1.5 text-[11px] text-slate-500 text-center">
                    <div />
                    <div>High Lik.</div>
                    <div>Med Lik.</div>
                    <div>Low Lik.</div>
                  </div>
                  {heatmapGrid.map((row, rIdx) => {
                    const rowLabel = ['High Sev.', 'Med Sev.', 'Low Sev.'][rIdx];
                    return (
                      <div key={rowLabel} className="grid grid-cols-4 gap-1.5 items-center">
                        <div className="text-[11px] font-medium text-slate-500 pr-1">{rowLabel}</div>
                        {row.map((cell) => {
                          const count = cell.items.length;
                          const isHot =
                            (cell.severity === 'high' && cell.likelihood !== 'low') ||
                            (cell.severity === 'medium' && cell.likelihood === 'high');
                          const cellStyle =
                            count === 0
                              ? 'bg-slate-100 dark:bg-white/[0.03] text-slate-400 border-slate-200/70 dark:border-white/[0.05]'
                              : isHot
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35';
                          return (
                            <div
                              key={`${cell.severity}-${cell.likelihood}`}
                              title={cell.items.map((i) => i.risk).join('\n')}
                              className={`h-14 rounded-xl border flex flex-col items-center justify-center font-mono tabular-nums ${cellStyle}`}
                            >
                              <span className="text-base font-bold">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Biggest Risks & Mitigations
                </h3>
              </div>
              <div className="space-y-3">
                {report.biggestRisks.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-[#0B0D12] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {r.risk}
                      </p>
                      <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0">
                        Sev: {r.severity} · Lik: {r.likelihood}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Mitigation:{' '}
                      </span>
                      {r.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assumptions, Strengths, Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <h3 className="font-display text-base font-semibold">Hidden Assumptions</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-4">
                {report.hiddenAssumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="font-display text-base font-semibold">What Is Actually Good</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-4">
                {report.whatIsGood.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-sky-500" />
                <h3 className="font-display text-base font-semibold">What To Do Next</h3>
              </div>
              <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-decimal pl-4">
                {report.nextSteps.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                savePromptItem({
                  title: `Feedback (${activeLens?.slash}): ${draft.slice(0, 36)}`,
                  content: `VERDICT: ${report.verdict}\n\nRISKS:\n${report.biggestRisks.map((r) => `- ${r.risk} (Mitigation: ${r.mitigation})`).join('\n')}\n\nNEXT STEPS:\n${report.nextSteps.map((n, idx) => `${idx + 1}. ${n}`).join('\n')}`,
                  commands: activeLens ? [activeLens.slash] : [],
                  tags: ['feedback-report'],
                  pinned: false,
                  type: 'answer',
                });
                showToast('Saved report to My Library', 'success');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Save Report to Library
            </button>

            <button
              type="button"
              onClick={() =>
                openPromptInChatGpt(
                  `Follow up on this evaluation (${report.verdict}):\n\nOriginal plan:\n${draft}`,
                  [activeLens?.slash ?? '/redteam', '/action-plan']
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 cursor-pointer"
            >
              Continue in ChatGPT
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
