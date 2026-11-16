import React, { useMemo, useRef, useState } from 'react';
import { Copy, Check, Play, Square, Info } from 'lucide-react';
import { COMMAND_GROUPS, GROUP_ORDER } from '@/src/data/commands';
import { buildAlwaysOnSetup, estimateTokens } from '@/src/lib/commandEngine';
import { getFriendlyErrorMessage, streamChat } from '@/src/lib/gemini';
import { useAllCommands, useAppStore } from '@/src/store/useAppStore';
import { MarkdownRenderer } from '@/src/components/MarkdownRenderer';

const PLATFORM_CARDS = [
  {
    name: 'ChatGPT',
    steps: [
      'Open Settings > Personalization > Custom instructions.',
      'Paste the Vivekam setup block into "How would you like ChatGPT to respond?".',
      'Save. Now any message ending with /redteam or /ELI5 follows those rules.',
    ],
  },
  {
    name: 'Claude',
    steps: [
      'Open Settings > Profile > Personal preferences (or open a specific Project > Project instructions).',
      'Paste the setup block there and save.',
      'Use any slash command at the end of your prompt in new chats.',
    ],
  },
  {
    name: 'Gemini',
    steps: [
      'Open Settings > Saved info (or Instructions for Gemini) and add the setup block.',
      'Alternatively, create a Gem and paste the setup text into its Instructions field.',
      'Fallback anywhere: paste the block as the very first message of a new chat.',
    ],
  },
];

export const AlwaysOnSetup: React.FC = () => {
  const allCommands = useAllCommands();
  const settings = useAppStore((s) => s.settings);
  const toggleCommandEnabled = useAppStore((s) => s.toggleCommandEnabled);
  const setGroupEnabled = useAppStore((s) => s.setGroupEnabled);
  const showToast = useAppStore((s) => s.showToast);

  const [style, setStyle] = useState<'compact' | 'detailed'>('compact');
  const [copied, setCopied] = useState(false);

  // Test-it state
  const [testPrompt, setTestPrompt] = useState(
    'I want to charge ₹2,500/month for an AI-assisted Kerala tax filing tool for freelancers. /redteam /no-fluff'
  );
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const enabledCommands = useMemo(
    () => allCommands.filter((c) => !settings.disabledCommands.includes(c.id)),
    [allCommands, settings.disabledCommands]
  );

  const setupText = useMemo(
    () => buildAlwaysOnSetup(enabledCommands, style, settings.commandOverrides),
    [enabledCommands, style, settings.commandOverrides]
  );

  const handleCopySetup = () => {
    navigator.clipboard?.writeText(setupText);
    setCopied(true);
    showToast('Always-On Setup copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 1800);
  };

  const handleRunTest = async () => {
    if (!testPrompt.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setTesting(true);
    setTestOutput('');
    setTestError(null);

    try {
      await streamChat({
        model: settings.model,
        contents: testPrompt,
        systemInstruction: setupText,
        thinkingLevel: settings.thinkingLevel,
        signal: controller.signal,
        onChunk: (_c, full) => setTestOutput(full),
      });
    } catch (err) {
      const f = getFriendlyErrorMessage(err);
      if (f.kind !== 'aborted') setTestError(f.description);
    } finally {
      setTesting(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Always-On Setup
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Generate a single paste-once instruction block so your enabled slash commands—including custom ones—work in ChatGPT, Claude, and Gemini.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Command Toggle Matrix */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">
              Included Commands ({enabledCommands.length}/{allCommands.length})
            </h3>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setStyle('compact')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  style === 'compact'
                    ? 'bg-white dark:bg-[#181D2A] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => setStyle('detailed')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  style === 'detailed'
                    ? 'bg-white dark:bg-[#181D2A] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Detailed
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {GROUP_ORDER.map((groupId) => {
              const groupMeta = COMMAND_GROUPS[groupId];
              const groupCmds = allCommands.filter((c) => c.group === groupId);
              if (groupCmds.length === 0) return null;
              const allOn = groupCmds.every((c) => !settings.disabledCommands.includes(c.id));

              return (
                <div key={groupId} className="space-y-2 pb-3 border-b border-slate-100 dark:border-white/[0.06] last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${groupMeta.dotClass}`} />
                      {groupMeta.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setGroupEnabled(
                          groupCmds.map((c) => c.id),
                          !allOn
                        )
                      }
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      {allOn ? 'Disable group' : 'Enable group'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {groupCmds.map((cmd) => {
                      const enabled = !settings.disabledCommands.includes(cmd.id);
                      return (
                        <label
                          key={cmd.id}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                            enabled
                              ? 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] text-slate-900 dark:text-slate-100'
                              : 'border-transparent text-slate-400 opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleCommandEnabled(cmd.id)}
                            className="accent-amber-500"
                          />
                          <span className="font-mono truncate">{cmd.slash}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Generated Setup Output + Test Sandbox */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-semibold">Generated Setup Prompt</h3>
                <p className="text-xs text-slate-500 font-mono tabular-nums">
                  {setupText.length} characters · ~{estimateTokens(setupText)} tokens
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySetup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Setup Block'}
              </button>
            </div>

            <pre className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900 dark:bg-[#0B0D12] text-slate-100 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
              {setupText}
            </pre>
          </div>

          {/* Live Test It Box */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="font-display text-base font-semibold">Test Your Setup Block Live</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Runs the generated setup prompt above as Gemini’s system instruction against your sample message.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                aria-label="Sample message with slash commands"
                className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3.5 py-2.5 text-sm"
              />
              {testing ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 text-white shrink-0 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRunTest}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-950 shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Test it
                </button>
              )}
            </div>

            {testError && <p className="text-xs text-rose-500">{testError}</p>}
            {testOutput && (
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] p-4">
                <MarkdownRenderer content={testOutput} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Installation Cards */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold">Where to paste it</h3>
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Menu labels occasionally change between app versions — if you cannot find Settings, paste it as the first message of any new chat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLATFORM_CARDS.map((card) => (
            <div
              key={card.name}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-3"
            >
              <h4 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {card.name}
              </h4>
              <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-decimal pl-4 leading-relaxed">
                {card.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
