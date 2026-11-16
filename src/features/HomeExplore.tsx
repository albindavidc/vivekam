import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Sliders,
  ExternalLink,
  ShoppingBag,
  Terminal,
} from 'lucide-react';
import { COMMAND_GROUPS, DEAL_CHECK_PROMPT, SALES_DEAL_COMMANDS } from '@/src/data/commands';
import { buildChatGptUrl } from '@/src/lib/chatgpt';
import {
  buildAlwaysOnSetup,
  buildSystemInstruction,
  detectConflicts,
  estimateTokens,
  parseMessage,
} from '@/src/lib/commandEngine';
import { useAllCommands, useAppStore } from '@/src/store/useAppStore';
import { CommandChipButton } from '@/src/components/CommandChipButton';

const NORMAL_SAMPLE_PROMPTS = [
  "I'm planning to start a small whole spices business. /redteam",
  'Explain how database indexing speeds up Postgres queries. /ELI5',
  'My React useEffect keeps firing API calls twice when the component mounts. /debug /no-fluff',
];

const SALES_SAMPLE_PROMPTS = [
  'The sale tile shows iQOO Z11x 5G at ₹23,999 from an MRP of ₹45,999. Is it a good deal? /realitycheck',
  'boAt or Noise ANC earbuds under ₹2,000 in the sale? /decision /no-fluff',
  "I've decided to buy a 55-inch 4K TV in tonight's flash sale. /second-opinion",
];

const NORMAL_HOW_TO_STEPS = [
  'Type your question as usual.',
  'Add a command at the end, for example /redteam.',
  'Send. You can add two at once, like “/brutal /no-fluff”.',
];

const SALES_HOW_TO_STEPS = [
  'Screenshot the deal: the product tile or page with the price and MRP.',
  'Open a new chat, attach the screenshot and ask your question.',
  'Add a command at the end, for example /realitycheck, and send.',
];

const SETUP_PLATFORM_STEPS = [
  {
    name: 'ChatGPT',
    detail: 'Settings → Personalization → Custom instructions. Paste it and save.',
  },
  {
    name: 'Claude',
    detail: 'Settings → Profile, in the personal preferences box. Or paste it into a Project’s instructions.',
  },
  {
    name: 'Gemini',
    detail: 'Settings → Saved info. Or just paste it at the start of a new chat.',
  },
];

const CHECK_BEFORE_PAY_ITEMS = [
  {
    title: 'Variant',
    detail: 'the big price is often for the lowest RAM / storage. Open the product page and confirm.',
  },
  {
    title: 'Small print',
    detail: '“including coupon offer” or “with bank card” means the price you pay may be higher.',
  },
  {
    title: 'Launch price',
    detail: 'compare the sale price with the launch price, not the MRP on the poster.',
  },
  {
    title: 'Return window',
    detail: 'check whether the item can be returned or only replaced.',
  },
];

export const HomeExplore: React.FC = () => {
  const allCommands = useAllCommands();
  const exploreMode = useAppStore((s) => s.exploreMode);
  const setExploreMode = useAppStore((s) => s.setExploreMode);
  const setActiveScreen = useAppStore((s) => s.setActiveScreen);
  const setCommandFilter = useAppStore((s) => s.setCommandFilter);
  const showToast = useAppStore((s) => s.showToast);
  const settings = useAppStore((s) => s.settings);

  const [normalDemoInput, setNormalDemoInput] = useState(
    "I'm planning to start a small whole spices business."
  );
  const [normalSelectedIds, setNormalSelectedIds] = useState<string[]>(['redteam', 'no-fluff']);

  const [salesDemoInput, setSalesDemoInput] = useState(
    'The sale tile shows iQOO Z11x 5G at ₹23,999 from an MRP of ₹45,999. Is it a good deal?'
  );
  const [salesSelectedIds, setSalesSelectedIds] = useState<string[]>(['sales-realitycheck', 'sales-no-fluff']);

  const [copiedDemo, setCopiedDemo] = useState(false);
  const [copiedAlwaysWork, setCopiedAlwaysWork] = useState(false);
  const [copiedDealPrompt, setCopiedDealPrompt] = useState(false);
  const [copiedSlash, setCopiedSlash] = useState<string | null>(null);

  const demoInput = exploreMode === 'normal' ? normalDemoInput : salesDemoInput;
  const setDemoInput = exploreMode === 'normal' ? setNormalDemoInput : setSalesDemoInput;
  const selectedIds = exploreMode === 'normal' ? normalSelectedIds : salesSelectedIds;
  const setSelectedIds = exploreMode === 'normal' ? setNormalSelectedIds : setSalesSelectedIds;

  const demoQuickCommands = useMemo(() => {
    const targetIds =
      exploreMode === 'normal'
        ? ['redteam', 'eli5', 'tldr', 'brutal', 'no-fluff', 'debug', 'action-plan']
        : [
            'sales-realitycheck',
            'sales-pros-cons',
            'sales-decision',
            'sales-second-opinion',
            'sales-redteam',
            'sales-no-fluff',
            'sales-opportunity-cost',
          ];
    return targetIds
      .map((id) => allCommands.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [allCommands, exploreMode]);

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
    () => buildSystemInstruction(activeCommands, { commandOverrides: settings.commandOverrides }),
    [activeCommands, settings.commandOverrides]
  );

  const enabledCommands = useMemo(
    () => allCommands.filter((c) => !settings.disabledCommands.includes(c.id)),
    [allCommands, settings.disabledCommands]
  );

  const compactAlwaysOnBlock = useMemo(
    () => buildAlwaysOnSetup(enabledCommands, 'compact', settings.commandOverrides),
    [enabledCommands, settings.commandOverrides]
  );

  const redteamCommand = useMemo(
    () => allCommands.find((c) => c.id === 'redteam'),
    [allCommands]
  );

  const dealCheckCommand = useMemo(
    () => allCommands.find((c) => c.id === 'sales-realitycheck') ?? allCommands.find((c) => c.id === 'realitycheck'),
    [allCommands]
  );

  const toggleChip = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCopyAlwaysWork = () => {
    navigator.clipboard?.writeText(compactAlwaysOnBlock);
    setCopiedAlwaysWork(true);
    showToast('One-time setup copied to clipboard', 'success');
    setTimeout(() => setCopiedAlwaysWork(false), 1800);
  };

  const handleCopyDealPrompt = () => {
    navigator.clipboard?.writeText(DEAL_CHECK_PROMPT);
    setCopiedDealPrompt(true);
    showToast('Deal check prompt copied', 'success');
    setTimeout(() => setCopiedDealPrompt(false), 1800);
  };

  const handleCopySlash = (slash: string) => {
    navigator.clipboard?.writeText(slash);
    setCopiedSlash(slash);
    showToast(`Copied ${slash}`, 'success');
    setTimeout(() => setCopiedSlash((prev) => (prev === slash ? null : prev)), 1500);
  };

  const handleCopyExpanded = () => {
    navigator.clipboard?.writeText(
      `SYSTEM INSTRUCTION:\n${expandedInstruction}\n\nUSER MESSAGE:\n${parsedDemo.body || demoInput}`
    );
    setCopiedDemo(true);
    showToast('Expanded prompt copied', 'success');
    setTimeout(() => setCopiedDemo(false), 1800);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openSalesCommands = () => {
    setCommandFilter('sales');
    setActiveScreen('library-commands');
  };

  const openAllCommands = () => {
    setCommandFilter('all');
    setActiveScreen('library-commands');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
      {/* Top Mode Switcher: Normal vs Sales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {settings.language === 'ml'
              ? 'വിവേകം · സ്ലാഷ് കമാൻഡ് പ്രോംപ്റ്റ് സ്റ്റുഡിയോ'
              : 'Vivekam · Slash-Command Studio'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Switch between everyday AI commands and the online sale deal-check playbook.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Explore playbooks"
          className="inline-flex p-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={exploreMode === 'normal'}
            onClick={() => setExploreMode('normal')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              exploreMode === 'normal'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Normal Commands
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={exploreMode === 'sales'}
            onClick={() => setExploreMode('sales')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              exploreMode === 'sales'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Sales & Deal Check
          </button>
        </div>
      </div>

      {exploreMode === 'normal' ? (
        /* ==================== NORMAL EXPLORE ==================== */
        <div className="space-y-12">
          {/* Normal Hero */}
          <section className="space-y-5">
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 dark:text-white leading-[1.08] text-balance">
              48+ AI commands. One word changes the answer.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              Add a short command like{' '}
              <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-amber-700 dark:text-amber-300">
                /redteam
              </code>{' '}
              or{' '}
              <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-sky-700 dark:text-sky-300">
                /ELI5
              </code>{' '}
              to the end of your message and ChatGPT, Claude, or Gemini answers in a different way: simpler, more honest, shorter, or more critical.
            </p>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed border-l-[3px] border-amber-500 pl-3.5">
              ചോദിക്കേണ്ട രീതിയിൽ ചോദിച്ചാലേ correct മറുപടി കിട്ടൂ. Message-ന്റെ അവസാനം ഈ commands ഒന്ന് add ചെയ്ത് നോക്കൂ.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={buildChatGptUrl(
                  "I'm planning to start a small whole spices business.",
                  redteamCommand ? [redteamCommand] : [],
                  settings.commandOverrides
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => showToast('Opening /redteam in ChatGPT', 'success')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                Try /redteam in ChatGPT
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => scrollToSection('make-always-work')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                Make them always work
              </button>
              <button
                type="button"
                onClick={openAllCommands}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                Browse {allCommands.length} Commands
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* START HERE: How to use them (Image 1) */}
          <section className="space-y-5 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                Start Here
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                How to use them
              </h3>
            </div>

            <ol className="space-y-3">
              {NORMAL_HOW_TO_STEPS.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {idx + 1}
                  </span>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                    {idx === 1 ? (
                      <>
                        Add a command at the end, for example{' '}
                        <strong className="font-mono text-slate-950 dark:text-white">/redteam</strong>.
                      </>
                    ) : (
                      step
                    )}
                  </p>
                </li>
              ))}
            </ol>

            {/* EXAMPLE card (Image 1) */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-5 space-y-2 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Example
              </p>
              <p className="text-sm sm:text-base font-semibold text-slate-950 dark:text-white">
                I’m planning to start a small whole spices business.{' '}
                <span className="font-mono text-rose-600 dark:text-rose-400">/redteam</span>
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Instead of “good idea!”, the AI looks for what could go wrong: why customers would pick you, hidden costs, cash stuck in stock.
              </p>
            </div>

            {/* THESE AREN'T OFFICIAL BUTTONS card (Image 1) */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 border-l-4 border-l-amber-500 bg-white dark:bg-[#121620] p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                These Aren’t Official Buttons
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                ChatGPT, Claude and Gemini don’t have a built-in <code className="font-mono">/redteam</code> feature. They understand what the word means, so it usually works as it is. For answers that are the same every time, paste the setup in{' '}
                <button
                  type="button"
                  onClick={() => scrollToSection('make-always-work')}
                  className="font-semibold underline underline-offset-2 text-slate-950 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                >
                  Make them always work
                </button>{' '}
                once.
              </p>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-l-[3px] border-amber-500 pl-3.5">
              ഇതൊന്നും official button അല്ല. AI-ക്ക് word-ന്റെ അർത്ഥം മനസ്സിലാകും, അതുകൊണ്ടാണ് work ആകുന്നത്.
            </p>
          </section>

          {/* ONE-TIME SETUP: Make them always work (Image 2) */}
          <section
            id="make-always-work"
            className="space-y-5 pt-2 border-t border-slate-200 dark:border-white/[0.08]"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                  One-Time Setup
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                  Make them always work
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                  Paste this once into your AI’s settings. After that, every command on this page gives the same kind of answer every time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveScreen('setup')}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Customize in Always-On Setup →
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#14171D] dark:bg-[#0E1118] text-slate-100 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-slate-400">
                  {enabledCommands.length} active commands · ~{estimateTokens(compactAlwaysOnBlock)} tokens
                </span>
                <button
                  type="button"
                  onClick={handleCopyAlwaysWork}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition cursor-pointer"
                >
                  {copiedAlwaysWork ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedAlwaysWork ? 'Copied' : 'Copy'}
                </button>
              </div>

              <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-slate-100 max-h-80 overflow-y-auto">
                {compactAlwaysOnBlock}
              </pre>
            </div>

            <ol className="space-y-3">
              {SETUP_PLATFORM_STEPS.map((p, idx) => (
                <li key={p.name} className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {idx + 1}
                  </span>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-950 dark:text-white">{p.name}:</strong> {p.detail}
                  </p>
                </li>
              ))}
            </ol>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 border-l-4 border-l-sky-500 bg-white dark:bg-[#121620] p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                Note
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Menu names change between app versions. If you can’t find the setting, paste the text as the first message of a new chat.
              </p>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-l-[3px] border-amber-500 pl-3.5">
              ഒരു തവണ settings-ൽ paste ചെയ്താൽ മതി. പിന്നെ എല്ലാ chat-ലും commands ശരിയായി work ആകും.
            </p>
          </section>
        </div>
      ) : (
        /* ==================== SALES & DEAL CHECK EXPLORE ==================== */
        <div className="space-y-12">
          {/* Sales Hero */}
          <section className="space-y-5">
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 dark:text-white leading-[1.08] text-balance">
              Before you hit Buy Now. One word changes the answer.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              Ask ChatGPT “is it a good deal?” and it usually says yes. Add{' '}
              <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-sky-700 dark:text-sky-300">
                /realitycheck
              </code>{' '}
              to the same question and it starts looking for the catch: inflated MRP, coupon-only prices, and the wrong variant. Here are the 7 commands for sales plus a copy-paste deal check you can use in any sale.
            </p>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed border-l-[3px] border-amber-500 pl-3.5">
              Sale-ൽ 50% off കണ്ട് ഉടനെ വാങ്ങരുത്. Buy Now-ന് മുൻപ് ഈ commands ഒന്ന് അടിച്ചു നോക്കൂ, cash പോകില്ല.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleCopyDealPrompt}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedDealPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedDealPrompt ? 'Deal check copied!' : 'Copy the deal check'}
              </button>
              <button
                type="button"
                onClick={openSalesCommands}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-teal-500/35 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/15 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                7 Sales Commands
              </button>
              <button
                type="button"
                onClick={openAllCommands}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                All {allCommands.length} Commands
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Start Here: How to use them for Sales (Screenshot 1) */}
          <section className="space-y-5 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                Start Here
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                How to use them
              </h3>
            </div>

            <ol className="space-y-3">
              {SALES_HOW_TO_STEPS.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {idx + 1}
                  </span>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                    {idx === 2 ? (
                      <>
                        Add a command at the end, for example{' '}
                        <code className="font-mono font-semibold text-slate-950 dark:text-white">
                          /realitycheck
                        </code>
                        , and send.
                      </>
                    ) : (
                      step
                    )}
                  </p>
                </li>
              ))}
            </ol>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 border-l-4 border-l-sky-500 bg-white dark:bg-[#121620] p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                Use a New Chat
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                If you add the command in the same chat, the AI may just tweak its first answer. A fresh chat with the same screenshot and the same question gives a fair comparison.
              </p>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-l-[3px] border-amber-500 pl-3.5">
              ഒരേ chat-ൽ അല്ല, new chat-ൽ ഇതേ screenshot, ഇതേ ചോദ്യം, അവസാനം command add ചെയ്യൂ.
            </p>
          </section>

          {/* Real Comparison Test (Screenshot 2) */}
          <section className="space-y-5 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                Side-by-Side Test
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                Our test: iQOO Z11x in the Amazon sale
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                The Amazon sale tile showed the iQOO Z11x 5G at <strong className="text-slate-950 dark:text-white">₹23,999</strong>, down from an MRP of ₹45,999. We asked ChatGPT the same question twice, in two new chats.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-5 space-y-2.5 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Plain Question
                </p>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  is it a good deal ?
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  “Decent deal... worth considering.” Battery and performance praised. It also misread the price on the screenshot.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-500/30 bg-white dark:bg-[#121620] p-5 space-y-2.5 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                  With /realitycheck
                </p>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  is it a good deal ?{' '}
                  <span className="font-mono text-sky-600 dark:text-sky-400">/realitycheck</span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  “The deal isn’t as amazing as the poster makes it look.” Called the ₹45,999 MRP misleading, said it launched lower, and at ₹23,999 suggested comparing alternatives first.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 border-l-4 border-l-amber-500 bg-white dark:bg-[#121620] p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Check the Numbers Yourself
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                The AI can misread a screenshot or quote an old price. In our first try it read ₹23,999 as ₹21,999. Use the commands to find what to question, then confirm launch price, variant and coupon terms on the brand or store page.
              </p>
            </div>
          </section>

          {/* The List: 7 Commands for Sales (PDF) */}
          <section className="space-y-5 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                  The List
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                  7 commands for sales
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Each one changes how the AI answers. Write the question in English, Malayalam or Manglish and put the command at the end.
                </p>
              </div>
              <button
                type="button"
                onClick={openSalesCommands}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Inspect all 7 in Commands
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {SALES_DEAL_COMMANDS.map((item) => {
                const cmd = allCommands.find((c) => c.id === item.commandId);
                if (!cmd) return null;
                const group = COMMAND_GROUPS[cmd.group] ?? COMMAND_GROUPS.sales;
                const cleanExamplePrompt = item.dealExample.replace(
                  new RegExp(`\\s*${cmd.slash.replace('/', '\\/')}$`, 'i'),
                  ''
                );

                return (
                  <div
                    key={item.commandId}
                    className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-4 sm:p-5 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-lg border ${group.accentBgClass} ${group.accentTextClass} ${group.accentBorderClass}`}
                        >
                          {cmd.slash}
                        </span>
                        <span className="text-sm font-semibold text-slate-950 dark:text-white">
                          {item.dealSummary}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        e.g. {item.dealExample}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopySlash(cmd.slash)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                      >
                        {copiedSlash === cmd.slash ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedSlash === cmd.slash ? 'Copied' : 'Copy'}
                      </button>
                      <a
                        href={buildChatGptUrl(cleanExamplePrompt, [cmd], settings.commandOverrides)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => showToast(`Opening ${cmd.slash} in ChatGPT`, 'success')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Try
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-l-[3px] border-amber-500 pl-3.5">
              Phone-ന്റെ ഗുണവും ദോഷവും വേണോ? <code className="font-mono">/pros-cons</code>. boAt-ഓ Noise-ഓ എന്ന് confusion ആണോ? <code className="font-mono">/decision</code>. Deal ശരിക്കും നല്ലതാണോ? <code className="font-mono">/realitycheck</code>.
            </p>
          </section>

          {/* Copy-Paste: The Deal Check Prompt (Screenshot 3) */}
          <section id="deal-check-prompt" className="space-y-5 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                Copy-Paste
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                The deal check prompt
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Attach the deal screenshot, paste this, and send. It covers the catches we keep seeing in sale listings.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#14171D] dark:bg-[#0E1118] text-slate-100 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-slate-400">
                  deal-check.prompt · ends with /realitycheck
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDealPrompt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition cursor-pointer"
                  >
                    {copiedDealPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedDealPrompt ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={buildChatGptUrl(
                      DEAL_CHECK_PROMPT.replace(/\s*\/realitycheck$/i, ''),
                      dealCheckCommand ? [dealCheckCommand] : [],
                      settings.commandOverrides
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => showToast('Opening Deal Check prompt in ChatGPT', 'success')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:brightness-105 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Try in ChatGPT
                  </a>
                </div>
              </div>

              <pre className="text-xs sm:text-sm font-mono leading-relaxed whitespace-pre-wrap text-slate-100 overflow-x-auto">
                {DEAL_CHECK_PROMPT}
              </pre>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-l-[3px] border-amber-500 pl-3.5">
              Screenshot attach ചെയ്ത് ഇത് paste ചെയ്താൽ മതി. Launch price, MRP, coupon, variant എല്ലാം ഒറ്റയടിക്ക് check ചെയ്യും.
            </p>
          </section>

          {/* Last Step: Check Before You Pay (Screenshot 3) */}
          <section className="space-y-5 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                Last Step
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                Check before you pay
              </h3>
            </div>

            <ol className="space-y-3">
              {CHECK_BEFORE_PAY_ITEMS.map((item, idx) => (
                <li key={item.title} className="flex items-start gap-3.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {idx + 1}
                  </span>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-950 dark:text-white">{item.title}:</strong> {item.detail}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}

      {/* Shared Interactive Live Expansion Preview */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08] pb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Live Prompt Expansion Preview
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Type a {exploreMode === 'sales' ? 'deal check' : 'question'} and toggle commands to inspect the exact directive built locally.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const list = exploreMode === 'normal' ? NORMAL_SAMPLE_PROMPTS : SALES_SAMPLE_PROMPTS;
                const next = list[(list.indexOf(demoInput) + 1) % list.length];
                setDemoInput(next);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              Try another sample
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label htmlFor="explore-demo-input" className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Your message (Before)
            </label>
            <textarea
              id="explore-demo-input"
              rows={4}
              value={demoInput}
              onChange={(e) => setDemoInput(e.target.value)}
              placeholder="Type any question or deal check..."
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
                  settings.commandOverrides
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
            Paste a pitch, deal, or plan and get a structured risk heatmap report.
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
