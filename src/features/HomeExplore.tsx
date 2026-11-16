import React, { useMemo, useState } from 'react';
import { ArrowRight, Copy, Check, AlertCircle, Sparkles, Sliders, ExternalLink } from 'lucide-react';
import { COMMAND_GROUPS } from '@/src/data/commands';
import { buildChatGptUrl } from '@/src/lib/chatgpt';
import { buildSystemInstruction, detectConflicts, estimateTokens, parseMessage } from '@/src/lib/commandEngine';
import { useAllCommands, useAppStore } from '@/src/store/useAppStore';
import { CommandChipButton } from '@/src/components/CommandChipButton';

const SAMPLE_PROMPTS = [
  'I want to open a specialty filter-coffee kiosk near Kochi metro with ₹4 lakh savings.',
  'Explain how database indexing speeds up Postgres queries.',
  'My React useEffect keeps firing API calls twice when the component mounts.',
];

const TRY_FIRST_IDS = [
  {
    id: 'redteam',
    title: 'Stress-test any plan',
    subtitle: 'Find hidden costs, failure modes, and blind spots before spending money.',
    sample: 'We plan to launch an Onam flash-sale campaign with 40% off across all SKUs. /redteam',
  },
  {
    id: 'eli5',
    title: 'Untangle anything confusing',
    subtitle: 'Strip jargon down to one vivid everyday analogy anyone can picture.',
    sample: 'How do zero-knowledge proofs verify something without revealing the secret? /ELI5',
  },
  {
    id: 'tldr',
    title: 'Compress long walls of text',
    subtitle: 'Pull the 3-line bottom line out of dense memos, policies, or articles.',
    sample: 'Summarize what changes for small SaaS founders under the new GST invoicing threshold. /TLDR',
  },
];

export const HomeExplore: React.FC = () => {
  const allCommands = useAllCommands();
  const setActiveScreen = useAppStore((s) => s.setActiveScreen);
  const openPromptInChatGpt = useAppStore((s) => s.openPromptInChatGpt);
  const showToast = useAppStore((s) => s.showToast);
  const language = useAppStore((s) => s.settings.language);
  const commandOverrides = useAppStore((s) => s.settings.commandOverrides);

  const [demoInput, setDemoInput] = useState(
    'I want to open a specialty filter-coffee kiosk near Kochi metro with ₹4 lakh savings.'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(['redteam', 'no-fluff']);
  const [copiedDemo, setCopiedDemo] = useState(false);

  const demoQuickCommands = useMemo(
    () =>
      ['redteam', 'eli5', 'tldr', 'realitycheck', 'no-fluff', 'action-plan']
        .map((id) => allCommands.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [allCommands]
  );

  const activeCommands = useMemo(() => {
    const parsed = parseMessage(demoInput, allCommands);
    const merged = [...parsed.commands];
    for (const id of selectedIds) {
      const cmd = allCommands.find((c) => c.id === id);
      if (cmd && !merged.some((m) => m.id === cmd.id)) {
        merged.push(cmd);
      }
    }
    return merged;
  }, [demoInput, selectedIds, allCommands]);

  const parsedDemo = useMemo(() => parseMessage(demoInput, allCommands), [demoInput, allCommands]);
  const conflicts = useMemo(() => detectConflicts(activeCommands), [activeCommands]);
  const expandedInstruction = useMemo(
    () => buildSystemInstruction(activeCommands, { commandOverrides }),
    [activeCommands, commandOverrides]
  );

  const toggleChip = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCopyExpanded = () => {
    navigator.clipboard?.writeText(
      `SYSTEM INSTRUCTION:\n${expandedInstruction}\n\nUSER MESSAGE:\n${parsedDemo.body || demoInput}`
    );
    setCopiedDemo(true);
    showToast('Expanded prompt copied', 'success');
    setTimeout(() => setCopiedDemo(false), 1800);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-5">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 tracking-wide">
            {language === 'ml'
              ? 'വിവേകം · സ്ലാഷ് കമാൻഡ് പ്രോംപ്റ്റ് സ്റ്റുഡിയോ'
              : 'Vivekam · Slash-Command Prompt Studio'}
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 dark:text-white leading-[1.08] text-balance">
            One word changes the answer.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Add a short slash command like{' '}
            <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-amber-700 dark:text-amber-300">
              /redteam
            </code>{' '}
            or{' '}
            <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-sky-700 dark:text-sky-300">
              /ELI5 /no-fluff
            </code>{' '}
            to any message. Vivekam turns it into a crisp directive so ChatGPT and Gemini answer
            blunter, simpler, or far more structured—in English, Malayalam, or Manglish.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setActiveScreen('library-commands')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 transition whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Browse {allCommands.length} Commands
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen('setup')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              Always-On Setup
            </button>
          </div>
        </div>

        {/* How it works 3-step summary */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-6 space-y-5">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            How it works
          </h3>
          <ol className="space-y-4">
            <li className="flex gap-3.5">
              <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 pt-0.5 tabular-nums">
                01.
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Write normally, add a slash
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Type your question in English, മലയാളം, or Manglish and append one or more commands.
                </p>
              </div>
            </li>
            <li className="flex gap-3.5">
              <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 pt-0.5 tabular-nums">
                02.
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Vivekam compiles the directive
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Commands strip out of your message and expand into an explicit system instruction with honesty and conflict rules.
                </p>
              </div>
            </li>
            <li className="flex gap-3.5">
              <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 pt-0.5 tabular-nums">
                03.
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Use anywhere with Always-On Setup
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Generate a single paste-once instruction block so your slash commands also work in ChatGPT, Claude, and Gemini.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Live Before/After Expansion Demo Box */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08] pb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Live Prompt Expansion Preview
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Type a message and toggle commands to inspect the exact system instruction built locally (zero API calls).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const next =
                  SAMPLE_PROMPTS[
                    (SAMPLE_PROMPTS.indexOf(demoInput) + 1) % SAMPLE_PROMPTS.length
                  ];
                setDemoInput(next);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              Try another sample
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: User Input + Chips */}
          <div className="space-y-4">
            <label htmlFor="explore-demo-input" className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Your message (Before)
            </label>
            <textarea
              id="explore-demo-input"
              rows={4}
              value={demoInput}
              onChange={(e) => setDemoInput(e.target.value)}
              placeholder="Type any question or idea..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 resize-y"
            />

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Toggle commands to apply
              </div>
              <div className="flex flex-wrap gap-2">
                {demoQuickCommands.map((cmd) => (
                  <CommandChipButton
                    key={cmd.id}
                    command={cmd}
                    selected={activeCommands.some((c) => c.id === cmd.id)}
                    onClick={() => toggleChip(cmd.id)}
                  />
                ))}
              </div>
            </div>

            {conflicts.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                {conflicts.map((c) => (
                  <p key={`${c.commandA}-${c.commandB}`}>{c.message}</p>
                ))}
              </div>
            )}

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <a
                href={buildChatGptUrl(
                  parsedDemo.body || demoInput,
                  activeCommands,
                  commandOverrides
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => showToast('Opening ChatGPT with your Vivekam prompt', 'success')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Try in ChatGPT
              </a>
              <button
                type="button"
                onClick={handleCopyExpanded}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedDemo ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedDemo ? 'Copied' : 'Copy assembled prompt'}
              </button>
            </div>
          </div>

          {/* Right: Assembled System Instruction */}
          <div className="space-y-2 flex flex-col">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Assembled System Instruction (After)</span>
              <span className="font-mono tabular-nums">
                ~{estimateTokens(expandedInstruction)} tokens
              </span>
            </div>
            <pre className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900 dark:bg-[#0B0D12] text-slate-100 p-4 text-xs font-mono leading-relaxed overflow-auto max-h-72 whitespace-pre-wrap">
              {expandedInstruction}
            </pre>
          </div>
        </div>
      </section>

      {/* Try First Cards */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            Start with these three
          </h3>
          <button
            type="button"
            onClick={() => setActiveScreen('library-commands')}
            className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            See all {allCommands.length} commands
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TRY_FIRST_IDS.map((item) => {
            const cmd = allCommands.find((c) => c.id === item.id);
            if (!cmd) return null;
            const group = COMMAND_GROUPS[cmd.group];
            return (
              <div
                key={cmd.id}
                className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-white/20 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className={`font-mono font-semibold ${group.accentTextClass}`}>
                      {cmd.slash}
                    </span>
                    <span>{group.name}</span>
                  </div>
                  <h4 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseMessage(item.sample, allCommands);
                    openPromptInChatGpt(parsed.body, parsed.commands.map((c) => c.slash));
                  }}
                  className="inline-flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/[0.05] text-slate-800 dark:text-slate-200 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 transition cursor-pointer"
                >
                  <span>Try {cmd.slash} in ChatGPT</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Studio Shortcuts + Disclaimer */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() => setActiveScreen('feedback-studio')}
          className="text-left rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 hover:border-orange-500/40 transition cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-display font-semibold text-base text-slate-900 dark:text-white">
              Honest Feedback Studio
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Paste a startup pitch, resume, or script and get a structured risk heatmap report.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveScreen('analyzer')}
          className="text-left rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 hover:border-amber-500/40 transition cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-display font-semibold text-base text-slate-900 dark:text-white">
              Prompt Analyzer
            </span>
            <Sparkles className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Score any prompt across 6 dimensions, inspect a word diff, and get slash recommendations.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveScreen('setup')}
          className="text-left rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 hover:border-sky-500/40 transition cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-display font-semibold text-base text-slate-900 dark:text-white">
              Always-On Setup
            </span>
            <Sliders className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Generate a paste-once rule block for ChatGPT, Claude, and Gemini custom instructions.
          </p>
        </button>
      </section>

      {/* Prominent Honest Disclaimer */}
      <section
        aria-label="Important limitation disclaimer"
        className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] dark:bg-amber-500/[0.06] p-5 flex items-start gap-3.5"
      >
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-slate-900 dark:text-white">
            Commands shape style and rigor, not ground truth
          </p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            These are not official buttons. Commands change the style of an answer, not its accuracy. Check facts, numbers and money decisions yourself.
          </p>
        </div>
      </section>
    </div>
  );
};
