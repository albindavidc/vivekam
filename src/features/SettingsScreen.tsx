import React, { useState } from 'react';
import { Trash2, Keyboard, Sun, Moon, Monitor } from 'lucide-react';
import { useAllCommands, useAppStore } from '@/src/store/useAppStore';
import type { Settings, ThinkingPreset } from '@/src/types';

const MODEL_OPTIONS: Array<{
  id: Settings['model'];
  name: string;
  note: string;
}> = [
  {
    id: 'gemini-4-hydrogen',
    name: 'gemini-4-hydrogen (Recommended Fast)',
    note: 'Default fast Gemini 4 model — ideal balance of speed, coding, and reasoning.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'gemini-3.1-flash-lite',
    note: 'Ultra-lightweight model for instant low-latency replies.',
  },
  {
    id: 'gemini-4-argon',
    name: 'gemini-4-argon (Complex Reasoning · Paid Key)',
    note: 'Deep reasoning for hard architecture and STEM tasks (requires paid billing key).',
  },
  {
    id: 'gemini-4-carbon',
    name: 'gemini-4-carbon (Max Depth · Paid Key)',
    note: 'Highest reasoning depth for root-cause auditing (requires paid billing key).',
  },
];

const SHORTCUTS = [
  { keys: '/', desc: 'Open slash-command palette inside Workbench composer' },
  { keys: '↑ / ↓', desc: 'Navigate commands in the autocomplete palette' },
  { keys: 'Enter / Tab', desc: 'Insert highlighted slash command' },
  { keys: 'Esc', desc: 'Close autocomplete palette' },
  { keys: 'Enter', desc: 'Send message in Workbench' },
  { keys: 'Shift + Enter', desc: 'Insert newline without sending' },
];

export const SettingsScreen: React.FC = () => {
  const allCommands = useAllCommands();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const clearAllData = useAppStore((s) => s.clearAllData);
  const showToast = useAppStore((s) => s.showToast);

  const [confirmClear, setConfirmClear] = useState(false);

  const toggleDefaultCommand = (slash: string) => {
    const exists = settings.defaultCommands.includes(slash);
    const next = exists
      ? settings.defaultCommands.filter((s) => s !== slash)
      : [...settings.defaultCommands, slash];
    updateSettings({ defaultCommands: next });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Settings
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Configure Gemini model defaults, default slash commands, appearance, and keyboard shortcuts.
        </p>
      </div>

      {/* Model & Generation */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-5">
        <h3 className="font-display text-base font-semibold">Model & Generation</h3>

        <div className="space-y-2">
          <label htmlFor="settings-model" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Gemini Model
          </label>
          <select
            id="settings-model"
            value={settings.model}
            onChange={(e) => updateSettings({ model: e.target.value as Settings['model'] })}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3.5 py-2.5 text-sm"
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {MODEL_OPTIONS.find((m) => m.id === settings.model)?.note}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reasoning Depth (Thinking Level)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['LOW', 'MEDIUM', 'HIGH'] as ThinkingPreset[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => updateSettings({ thinkingLevel: lvl })}
                  className={`py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                    settings.thinkingLevel === lvl
                      ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Max Output Tokens</span>
              <span className="font-mono tabular-nums">{settings.maxOutputTokens}</span>
            </div>
            <input
              type="range"
              min={512}
              max={8192}
              step={256}
              value={settings.maxOutputTokens}
              onChange={(e) => updateSettings({ maxOutputTokens: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Temperature Preference</span>
              <span className="font-mono tabular-nums">{settings.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={settings.temperature}
              onChange={(e) => updateSettings({ temperature: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Top-P Preference</span>
              <span className="font-mono tabular-nums">{settings.topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={settings.topP}
              onChange={(e) => updateSettings({ topP: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Note: Gemini 4 series models manage sampling automatically via Thinking Level rather than manual temperature/top-p parameters.
        </p>

        <div className="space-y-2 pt-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Conversation Context Window (messages kept)
            </span>
            <span className="font-mono tabular-nums">{settings.historyWindow}</span>
          </div>
          <input
            type="range"
            min={2}
            max={24}
            step={2}
            value={settings.historyWindow}
            onChange={(e) => updateSettings({ historyWindow: Number(e.target.value) })}
            className="w-full accent-amber-500"
          />
        </div>
      </section>

      {/* Default Always-Applied Commands */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-3">
        <div>
          <h3 className="font-display text-base font-semibold">Default Commands</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automatically pre-selected whenever you open a fresh Workbench prompt (e.g. /no-fluff).
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
          {allCommands.map((cmd) => {
            const active = settings.defaultCommands.includes(cmd.slash);
            return (
              <button
                key={cmd.id}
                type="button"
                onClick={() => toggleDefaultCommand(cmd.slash)}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs border cursor-pointer transition ${
                  active
                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cmd.slash}
              </button>
            );
          })}
        </div>
      </section>

      {/* Appearance & Language */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-5">
        <h3 className="font-display text-base font-semibold">Appearance & Accessibility</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Theme</span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'system', label: 'System', icon: Monitor },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateSettings({ theme: id })}
                  className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                    settings.theme === id
                      ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              UI Language
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateSettings({ language: 'en' })}
                className={`py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                  settings.language === 'en'
                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ language: 'ml' })}
                className={`py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                  settings.language === 'ml'
                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                }`}
              >
                മലയാളം (Key labels)
              </button>
            </div>
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 pt-1 cursor-pointer">
          <div>
            <p className="text-sm font-medium">Reduce Motion</p>
            <p className="text-xs text-slate-500">
              Disables transitions and micro-animations across the interface.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
            className="w-4 h-4 accent-amber-500"
          />
        </label>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-amber-500" />
          <h3 className="font-display text-base font-semibold">Keyboard Shortcuts</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="py-2.5 flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-600 dark:text-slate-300">{s.desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0B0D12] font-mono text-[11px] whitespace-nowrap shrink-0">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone: Clear Local Data */}
      <section className="rounded-2xl border border-rose-500/25 bg-white dark:bg-[#121620] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold text-rose-600 dark:text-rose-400">
            Clear Local Data
          </h3>
          <p className="text-xs text-slate-500">
            Deletes all conversations, saved prompts, custom commands, and resets settings in this browser.
          </p>
        </div>

        {confirmClear ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-white/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                clearAllData();
                setConfirmClear(false);
                showToast('All local data cleared', 'info');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white cursor-pointer"
            >
              Confirm Delete
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset All Data
          </button>
        )}
      </section>
    </div>
  );
};
