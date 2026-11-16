import React, { useMemo, useState } from 'react';
import { PlusCircle, Trash2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { BUILT_IN_COMMANDS, COMMAND_GROUPS, GROUP_ORDER } from '@/src/data/commands';
import { buildSystemInstruction } from '@/src/lib/commandEngine';
import { useAllCommands, useAppStore } from '@/src/store/useAppStore';
import type { Command, CommandGroupId } from '@/src/types';

export const CustomCommandCreator: React.FC = () => {
  const allCommands = useAllCommands();
  const customCommands = useAppStore((s) => s.customCommands);
  const addCustomCommand = useAppStore((s) => s.addCustomCommand);
  const deleteCustomCommand = useAppStore((s) => s.deleteCustomCommand);
  const openPromptInChatGpt = useAppStore((s) => s.openPromptInChatGpt);
  const showToast = useAppStore((s) => s.showToast);

  const [slug, setSlug] = useState('kerala-context');
  const [group, setGroup] = useState<CommandGroupId>('business');
  const [label, setLabel] = useState('Kerala Market Context');
  const [shortDescription, setShortDescription] = useState(
    'Frame prices in INR and consider Kerala consumer habits and logistics.'
  );
  const [directive, setDirective] = useState(
    'Tailor examples, pricing, and distribution channels to Kerala and Indian market realities. Quote realistic costs in INR, factor in local consumer trust signals, and avoid US-centric SaaS assumptions.'
  );
  const [example, setExample] = useState('How should I price a home-bakery subscription in Calicut? /kerala-context');
  const [malayalamNote, setMalayalamNote] = useState('കേരളത്തിലെ വിപണിയും വിലയും അനുസരിച്ച് ഉത്തരം കിട്ടാൻ.');
  const [conflictsWith, setConflictsWith] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState('How should I price my new D2C coconut snack brand?');

  const cleanSlug = slug.trim().toLowerCase().replace(/^\/+/, '');
  const slugValid = /^[a-z0-9][a-z0-9-]{1,28}$/.test(cleanSlug);
  const formattedSlash = `/${cleanSlug}`;

  const slugCollision = useMemo(
    () => allCommands.some((c) => c.slash.toLowerCase() === formattedSlash.toLowerCase()),
    [allCommands, formattedSlash]
  );

  const previewCommand: Command = useMemo(
    () => ({
      id: 'preview-custom',
      slash: formattedSlash,
      group,
      label: label.trim() || cleanSlug,
      shortDescription: shortDescription.trim(),
      example: example.trim(),
      malayalamNote: malayalamNote.trim(),
      directive: directive.trim(),
      tags: ['custom'],
      conflictsWith,
      isCustom: true,
    }),
    [formattedSlash, group, label, cleanSlug, shortDescription, example, malayalamNote, directive, conflictsWith]
  );

  const previewInstruction = useMemo(
    () => buildSystemInstruction([previewCommand]),
    [previewCommand]
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slugValid) {
      showToast('Use lowercase letters, numbers, and hyphens only (2–29 chars)', 'error');
      return;
    }
    if (slugCollision) {
      showToast(`${formattedSlash} already exists. Pick a unique name.`, 'error');
      return;
    }
    if (!directive.trim() || !shortDescription.trim()) {
      showToast('Description and directive are required', 'warning');
      return;
    }

    addCustomCommand({
      slash: formattedSlash,
      group,
      label: label.trim() || cleanSlug,
      shortDescription: shortDescription.trim(),
      example: example.trim() || `${testMessage} ${formattedSlash}`,
      malayalamNote: malayalamNote.trim() || 'കസ്റ്റം കമാൻഡ്',
      directive: directive.trim(),
      tags: ['custom', group],
      conflictsWith,
    });

    showToast(`Created ${formattedSlash} — now live everywhere!`, 'success');
    setSlug('');
    setLabel('');
    setShortDescription('');
    setDirective('');
    setExample('');
    setMalayalamNote('');
    setConflictsWith([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Custom Command Creator
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Build your own slash commands. Once saved, they immediately appear in the Command Library and Always-On Setup.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleCreate}
          className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 sm:p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="cc-slug" className="text-xs font-semibold">
                Command Slug
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3">
                <span className="font-mono text-sm text-amber-500">/</span>
                <input
                  id="cc-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="my-command"
                  className="w-full bg-transparent py-2 pl-1 text-sm font-mono focus:outline-none"
                />
              </div>
              {slug && !slugValid && (
                <p className="text-[11px] text-rose-500">Use 2–29 lowercase letters, numbers, or hyphens.</p>
              )}
              {slug && slugCollision && (
                <p className="text-[11px] text-rose-500">That command slash already exists.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cc-group" className="text-xs font-semibold">
                Group
              </label>
              <select
                id="cc-group"
                value={group}
                onChange={(e) => setGroup(e.target.value as CommandGroupId)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3 py-2 text-sm"
              >
                {GROUP_ORDER.map((gid) => (
                  <option key={gid} value={gid}>
                    {COMMAND_GROUPS[gid].name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="cc-label" className="text-xs font-semibold">
                Display Label
              </label>
              <input
                id="cc-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Executive Memo"
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cc-ml" className="text-xs font-semibold">
                Malayalam Note (Optional)
              </label>
              <input
                id="cc-ml"
                value={malayalamNote}
                onChange={(e) => setMalayalamNote(e.target.value)}
                placeholder="ചെറിയൊരു മലയാളം കുറിപ്പ്..."
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cc-desc" className="text-xs font-semibold">
              Short Description (Shown in Palette & Setup)
            </label>
            <input
              id="cc-desc"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="One crisp line explaining what this command changes..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cc-directive" className="text-xs font-semibold">
              System Directive (2–4 clear sentences for Gemini)
            </label>
            <textarea
              id="cc-directive"
              rows={4}
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              placeholder="Tell the model exactly how to behave, what to prioritize, and what to avoid..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3.5 py-2.5 text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cc-example" className="text-xs font-semibold">
              Example Usage
            </label>
            <input
              id="cc-example"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="Sample question ending with your slash command..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold">Conflicts With (Optional)</span>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12]">
              {BUILT_IN_COMMANDS.map((c) => {
                const selected = conflictsWith.includes(c.slash);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setConflictsWith((prev) =>
                        selected ? prev.filter((x) => x !== c.slash) : [...prev, c.slash]
                      )
                    }
                    className={`px-2 py-1 rounded-md font-mono text-[11px] cursor-pointer ${
                      selected
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-white dark:bg-[#141923] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {c.slash}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={!slugValid || slugCollision}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 disabled:opacity-40 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Save Custom Command
          </button>
        </form>

        {/* Live Preview */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-4">
            <h3 className="font-display text-base font-semibold">Live Expansion Preview</h3>
            <div className="space-y-1.5">
              <label htmlFor="cc-test-msg" className="text-xs text-slate-500">
                Test message
              </label>
              <input
                id="cc-test-msg"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-3 py-2 text-xs"
              />
            </div>

            <pre className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900 dark:bg-[#0B0D12] text-slate-100 p-3.5 text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto">
              {previewInstruction}
            </pre>
          </div>

          {/* Existing Custom Commands */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-3">
            <h3 className="font-display text-base font-semibold">
              Your Custom Commands ({customCommands.length})
            </h3>
            {customCommands.length === 0 ? (
              <p className="text-xs text-slate-500">
                Save your first custom command on the left to reuse it across Vivekam.
              </p>
            ) : (
              <div className="space-y-2.5">
                {customCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-amber-500">
                          {cmd.slash}
                        </span>
                        <span className="text-xs font-medium truncate">{cmd.label}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{cmd.shortDescription}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openPromptInChatGpt(testMessage, [cmd.slash])}
                        className="p-1.5 text-slate-500 hover:text-amber-500 cursor-pointer"
                        title="Try in ChatGPT"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomCommand(cmd.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                        aria-label={`Delete ${cmd.slash}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
