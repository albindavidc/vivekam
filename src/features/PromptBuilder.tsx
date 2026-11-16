import React, { useMemo, useState } from 'react';
import { Sparkles, Copy, Bookmark, Terminal, Play, X, Check } from 'lucide-react';
import { PROMPT_TEMPLATES } from '@/src/data/templates';
import { estimateTokens } from '@/src/lib/commandEngine';
import { generateJSON, getFriendlyErrorMessage } from '@/src/lib/gemini';
import {
  IMPROVED_BUILDER_SCHEMA,
  isImprovedBuilderOutput,
  type ImprovedBuilderOutput,
} from '@/src/lib/schemas';
import { useAppStore } from '@/src/store/useAppStore';

export const PromptBuilder: React.FC = () => {
  const settings = useAppStore((s) => s.settings);
  const savePromptItem = useAppStore((s) => s.savePromptItem);
  const sendToWorkbench = useAppStore((s) => s.sendToWorkbench);
  const showToast = useAppStore((s) => s.showToast);

  const [role, setRole] = useState('Senior software architect');
  const [context, setContext] = useState('Building a {{app_type}} for {{audience}}.');
  const [task, setTask] = useState('Review the architecture and highlight the top 3 scaling bottlenecks.');
  const [constraints, setConstraints] = useState('No generic advice. Keep total response under 300 words.');
  const [outputFormat, setOutputFormat] = useState('Numbered list with Issue, Impact, and Concrete Fix.');
  const [tone, setTone] = useState('Direct, practical, calm');
  const [examples, setExamples] = useState('');
  const [attachedCommands, setAttachedCommands] = useState<string[]>(['/no-fluff']);

  const [improving, setImproving] = useState(false);
  const [improveNote, setImproveNote] = useState<string | null>(null);
  const [varModalOpen, setVarModalOpen] = useState(false);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const assembledPrompt = useMemo(() => {
    const parts: string[] = [];
    if (role.trim()) parts.push(`ROLE:\n${role.trim()}`);
    if (context.trim()) parts.push(`CONTEXT:\n${context.trim()}`);
    if (task.trim()) parts.push(`TASK:\n${task.trim()}`);
    if (constraints.trim()) parts.push(`CONSTRAINTS:\n${constraints.trim()}`);
    if (outputFormat.trim()) parts.push(`OUTPUT FORMAT:\n${outputFormat.trim()}`);
    if (tone.trim()) parts.push(`TONE:\n${tone.trim()}`);
    if (examples.trim()) parts.push(`EXAMPLES:\n${examples.trim()}`);
    return parts.join('\n\n');
  }, [role, context, task, constraints, outputFormat, tone, examples]);

  const detectedVariables = useMemo(() => {
    const matches = assembledPrompt.match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g) ?? [];
    const unique = new Set<string>();
    for (const m of matches) {
      unique.add(m.replace(/^\{\{\s*|\s*\}\}$/g, ''));
    }
    return Array.from(unique);
  }, [assembledPrompt]);

  const fillVariablesIntoPrompt = (values: Record<string, string>): string => {
    let out = assembledPrompt;
    for (const key of detectedVariables) {
      const replacement = values[key]?.trim() || `{{${key}}}`;
      out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), replacement);
    }
    return out;
  };

  const applyTemplate = (tplId: string) => {
    const tpl = PROMPT_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    setRole(tpl.role);
    setContext(tpl.context);
    setTask(tpl.task);
    setConstraints(tpl.constraints);
    setOutputFormat(tpl.outputFormat);
    setTone(tpl.tone);
    setExamples(tpl.examples);
    setAttachedCommands(tpl.suggestedCommands);
    setImproveNote(null);
    showToast(`Loaded "${tpl.title}" template`, 'info');
  };

  const handleImproveWithAI = async () => {
    if (!task.trim()) {
      showToast('Add a Task before improving with AI', 'warning');
      return;
    }
    setImproving(true);
    setImproveNote(null);
    try {
      const res = await generateJSON<ImprovedBuilderOutput>({
        model: settings.model,
        contents: `Improve and sharpen this structured prompt while preserving any {{variable}} placeholders:\n\n${assembledPrompt}`,
        systemInstruction:
          'You are an expert prompt engineer. Refine each field to maximize clarity, specificity, verifiable constraints, and crisp output structure. Preserve {{variable}} placeholders intact.',
        responseSchema: IMPROVED_BUILDER_SCHEMA,
        thinkingLevel: settings.thinkingLevel,
        validator: isImprovedBuilderOutput,
      });
      setRole(res.role);
      setContext(res.context);
      setTask(res.task);
      setConstraints(res.constraints);
      setOutputFormat(res.outputFormat);
      setTone(res.tone);
      setImproveNote(res.rationale);
      showToast('Prompt sharpened with Gemini', 'success');
    } catch (err) {
      const f = getFriendlyErrorMessage(err);
      showToast(f.description, 'error');
    } finally {
      setImproving(false);
    }
  };

  const handleRunInWorkbench = () => {
    if (detectedVariables.length > 0) {
      setVarModalOpen(true);
      return;
    }
    sendToWorkbench(assembledPrompt, attachedCommands);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Prompt Builder
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Assemble reusable, structured prompts with role, constraints, few-shot examples, and{' '}
            <code className="font-mono text-xs">{'{{variables}}'}</code>.
          </p>
        </div>
      </div>

      {/* Templates Row */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Start from a template
        </div>
        <div className="flex flex-wrap gap-2">
          {PROMPT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl.id)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-slate-700 dark:text-slate-200 hover:border-amber-500/40 transition cursor-pointer"
            >
              {tpl.title} · <span className="text-slate-400">{tpl.category}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Fields */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="pb-role" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Role
              </label>
              <input
                id="pb-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Who should Gemini act as?"
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3.5 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pb-tone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tone
              </label>
              <input
                id="pb-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. Direct, warm, analytical"
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pb-context" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Context (use {'{{variable}}'} for reusable inputs)
            </label>
            <textarea
              id="pb-context"
              rows={2}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3.5 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pb-task" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Task
            </label>
            <textarea
              id="pb-task"
              rows={3}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3.5 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="pb-constraints" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Constraints
              </label>
              <textarea
                id="pb-constraints"
                rows={3}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3.5 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pb-format" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Output Format
              </label>
              <textarea
                id="pb-format"
                rows={3}
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pb-examples" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Examples / Few-Shot (Optional)
            </label>
            <textarea
              id="pb-examples"
              rows={2}
              value={examples}
              onChange={(e) => setExamples(e.target.value)}
              placeholder="Input -> Ideal Output example..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3.5 py-2 text-sm"
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleImproveWithAI}
              disabled={improving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {improving ? 'Improving…' : 'Improve with AI'}
            </button>
            {improveNote && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {improveNote}
              </span>
            )}
          </div>
        </div>

        {/* Live Assembled Preview */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-4 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Assembled Prompt
            </h3>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {assembledPrompt.length} chars · ~{estimateTokens(assembledPrompt)} tokens
            </span>
          </div>

          {detectedVariables.length > 0 && (
            <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
              Variables detected:{' '}
              <span className="font-mono">{detectedVariables.map((v) => `{{${v}}}`).join(', ')}</span>
            </div>
          )}

          <pre className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900 dark:bg-[#0B0D12] text-slate-100 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
            {assembledPrompt || 'Fill out fields on the left to assemble your prompt.'}
          </pre>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRunInWorkbench}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 cursor-pointer whitespace-nowrap"
            >
              <Terminal className="w-3.5 h-3.5" />
              {detectedVariables.length > 0 ? 'Fill Variables & Run' : 'Run in Workbench'}
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(assembledPrompt);
                setCopied(true);
                showToast('Prompt copied', 'success');
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              Copy
            </button>

            <button
              type="button"
              onClick={() => {
                savePromptItem({
                  title: task.slice(0, 44).trim() || 'Built Prompt',
                  content: assembledPrompt,
                  commands: attachedCommands,
                  tags: ['builder'],
                  pinned: false,
                  type: 'prompt',
                });
                showToast('Saved prompt to My Library', 'success');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Variable Fill-In Modal */}
      {varModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setVarModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Fill Prompt Variables</h3>
              <button type="button" onClick={() => setVarModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {detectedVariables.map((v) => (
                <div key={v} className="space-y-1">
                  <label className="font-mono text-xs text-amber-600 dark:text-amber-400">
                    {`{{${v}}}`}
                  </label>
                  <input
                    value={varValues[v] ?? ''}
                    onChange={(e) => setVarValues((prev) => ({ ...prev, [v]: e.target.value }))}
                    placeholder={`Enter value for ${v}...`}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVarModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const filled = fillVariablesIntoPrompt(varValues);
                  setVarModalOpen(false);
                  sendToWorkbench(filled, attachedCommands);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Open in Workbench
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
