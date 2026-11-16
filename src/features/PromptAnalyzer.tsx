import React, { useMemo, useState } from 'react';
import { Gauge, Copy, Check, Terminal, ArrowRight, RotateCcw } from 'lucide-react';
import { generateJSON, getFriendlyErrorMessage } from '@/src/lib/gemini';
import { ANALYZER_RESULT_SCHEMA, isAnalyzerResult } from '@/src/lib/schemas';
import { useAppStore } from '@/src/store/useAppStore';
import type { AnalyzerResult } from '@/src/types';

function computeLineDiff(beforeText: string, afterText: string) {
  const beforeLines = beforeText.split('\n');
  const afterLines = afterText.split('\n');
  const beforeSet = new Set(beforeLines.map((l) => l.trim()));
  const afterSet = new Set(afterLines.map((l) => l.trim()));

  return {
    removed: beforeLines.filter((l) => l.trim() && !afterSet.has(l.trim())),
    added: afterLines.filter((l) => l.trim() && !beforeSet.has(l.trim())),
    unchangedCount: afterLines.filter((l) => l.trim() && beforeSet.has(l.trim())).length,
  };
}

export const PromptAnalyzer: React.FC = () => {
  const settings = useAppStore((s) => s.settings);
  const sendToWorkbench = useAppStore((s) => s.sendToWorkbench);
  const showToast = useAppStore((s) => s.showToast);

  const [promptInput, setPromptInput] = useState(
    'Tell me about marketing for my new clothing brand in Kerala and give me a plan.'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzerResult | null>(null);
  const [error, setError] = useState<ReturnType<typeof getFriendlyErrorMessage> | null>(null);
  const [copiedRewrite, setCopiedRewrite] = useState(false);

  const runAnalyzer = async () => {
    if (!promptInput.trim()) {
      showToast('Paste a prompt to analyze', 'warning');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const data = await generateJSON<AnalyzerResult>({
        model: settings.model,
        contents: `Analyze and score this user prompt:\n\n"""\n${promptInput}\n"""`,
        systemInstruction:
          'You are a principal prompt engineer. Score the user prompt from 0 to 10 on Clarity, Context, Specificity, Constraints, OutputFormat, and Safety. Identify concrete issues with exact fixes, write an improved version of the prompt, and recommend 1 to 3 Srishti slash commands from: /ELI5, /TLDR, /deepdive, /examples, /stepbystep, /brutal, /redteam, /realitycheck, /no-fluff, /debug, /code-review, /senior-engineer, /startup-mode, /validate-idea, /ROI, /rewrite, /hooks, /decision, /action-plan, /80-20.',
        responseSchema: ANALYZER_RESULT_SCHEMA,
        thinkingLevel: settings.thinkingLevel,
        validator: isAnalyzerResult,
      });
      setResult(data);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const diff = useMemo(() => {
    if (!result) return null;
    return computeLineDiff(promptInput, result.improvedPrompt);
  }, [promptInput, result]);

  const scoreEntries = result
    ? [
        { label: 'Clarity', value: result.scores.clarity },
        { label: 'Context', value: result.scores.context },
        { label: 'Specificity', value: result.scores.specificity },
        { label: 'Constraints', value: result.scores.constraints },
        { label: 'Output Format', value: result.scores.outputFormat },
        { label: 'Safety', value: result.scores.safety },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Prompt Analyzer
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paste any prompt to score it across 6 dimensions, inspect fixes, compare a diff rewrite, and get slash-command suggestions.
        </p>
      </div>

      {/* Input Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-4">
        <label htmlFor="analyzer-input" className="block text-xs font-medium text-slate-500 dark:text-slate-400">
          Prompt to evaluate
        </label>
        <textarea
          id="analyzer-input"
          rows={5}
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          placeholder="Paste your draft prompt here..."
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={runAnalyzer}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 disabled:opacity-50 cursor-pointer"
          >
            <Gauge className="w-4 h-4" />
            {loading ? 'Analyzing Prompt…' : 'Analyze & Improve'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 flex items-center justify-between gap-4">
          <div className="text-sm space-y-1">
            <p className="font-semibold text-rose-700 dark:text-rose-300">{error.title}</p>
            <p className="text-rose-600 dark:text-rose-200">{error.description}</p>
          </div>
          {error.retryable && (
            <button
              type="button"
              onClick={runAnalyzer}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      )}

      {result && !loading && (
        <div className="space-y-6">
          {/* Scores Grid */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  Diagnostic Scorecard
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{result.summary}</p>
              </div>
              <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                {result.overallScore}/10
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {scoreEntries.map((s) => (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
                    <span className="font-mono font-semibold tabular-nums">{s.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        s.value >= 7.5
                          ? 'bg-emerald-500'
                          : s.value >= 5
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${(s.value / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Commands + Issues */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-4">
              <h3 className="font-display text-base font-semibold">Suggested Slash Commands</h3>
              <div className="space-y-3">
                {result.suggestedCommands.map((cmd, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0D12] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {cmd.slash}
                      </span>
                      <button
                        type="button"
                        onClick={() => sendToWorkbench(result.improvedPrompt, [cmd.slash])}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-amber-500 cursor-pointer"
                      >
                        Try
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{cmd.reason}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  sendToWorkbench(
                    result.improvedPrompt,
                    result.suggestedCommands.map((c) => c.slash)
                  )
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                Open Rewrite + All Suggested Commands
              </button>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-4">
              <h3 className="font-display text-base font-semibold">Issues & Concrete Fixes</h3>
              <div className="space-y-3">
                {result.issues.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0D12] p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.area}
                      </span>
                      <span
                        className={`font-mono ${
                          item.severity === 'high'
                            ? 'text-rose-500'
                            : item.severity === 'medium'
                            ? 'text-amber-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{item.issue}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Fix: {item.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Diff View & Improved Rewrite */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-base font-semibold">
                Original vs Improved Rewrite (Diff View)
              </h3>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(result.improvedPrompt);
                  setCopiedRewrite(true);
                  showToast('Improved prompt copied', 'success');
                  setTimeout(() => setCopiedRewrite(false), 1500);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 cursor-pointer"
              >
                {copiedRewrite ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Copy improved prompt
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-4 space-y-2">
                <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Original ({diff?.removed.length ?? 0} changed lines)
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                  {promptInput}
                </pre>
              </div>

              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4 space-y-2">
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Improved Rewrite ({diff?.added.length ?? 0} added lines)
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap text-slate-900 dark:text-slate-100 leading-relaxed">
                  {result.improvedPrompt}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
