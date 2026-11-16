import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send,
  Square,
  Copy,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  Columns2,
  Bookmark,
  Download,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Edit3,
  Check,
  History,
  X,
  Sliders,
} from 'lucide-react';
import { COMMAND_GROUPS, GROUP_ORDER } from '@/src/data/commands';
import {
  buildSystemInstruction,
  detectConflicts,
  estimateTokens,
  fuzzyMatchCommands,
  parseMessage,
} from '@/src/lib/commandEngine';
import { getFriendlyErrorMessage, streamChat } from '@/src/lib/gemini';
import { useAllCommands, useAppStore } from '@/src/store/useAppStore';
import { CommandChipButton } from '@/src/components/CommandChipButton';
import { MarkdownRenderer } from '@/src/components/MarkdownRenderer';
import type { Command, Message } from '@/src/types';

function makeMsgId(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const Workbench: React.FC = () => {
  const allCommands = useAllCommands();
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const settings = useAppStore((s) => s.settings);
  const workbenchDraft = useAppStore((s) => s.workbenchDraft);

  const createConversation = useAppStore((s) => s.createConversation);
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const renameConversation = useAppStore((s) => s.renameConversation);
  const deleteConversation = useAppStore((s) => s.deleteConversation);
  const addMessage = useAppStore((s) => s.addMessage);
  const updateMessage = useAppStore((s) => s.updateMessage);
  const removeMessagesFrom = useAppStore((s) => s.removeMessagesFrom);
  const clearWorkbenchDraft = useAppStore((s) => s.clearWorkbenchDraft);
  const savePromptItem = useAppStore((s) => s.savePromptItem);
  const showToast = useAppStore((s) => s.showToast);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  // Composer state
  const [input, setInput] = useState('');
  const [selectedSlashes, setSelectedSlashes] = useState<string[]>(settings.defaultCommands);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSlashesB, setCompareSlashesB] = useState<string[]>(['/ELI5']);

  // Preview & Advanced mode
  const [showPreview, setShowPreview] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');

  // History drawer & rename
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  // Slash autocomplete state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [activePaletteIdx, setActivePaletteIdx] = useState(0);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<ReturnType<typeof getFriendlyErrorMessage> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Compare mode results
  const [compareState, setCompareState] = useState<{
    prompt: string;
    leftText: string;
    rightText: string;
    leftLoading: boolean;
    rightLoading: boolean;
    leftError?: string;
    rightError?: string;
  } | null>(null);

  // "Run again with another command" inline popover
  const [rerunMessageId, setRerunMessageId] = useState<string | null>(null);

  // Sync incoming draft from Explore / Library / Builder
  useEffect(() => {
    if (!workbenchDraft) return;
    setInput(workbenchDraft.text);
    const merged = Array.from(
      new Set([...settings.defaultCommands, ...workbenchDraft.commandSlashes])
    );
    setSelectedSlashes(merged);
    clearWorkbenchDraft();
    setTimeout(() => textareaRef.current?.focus(), 60);
  }, [workbenchDraft, clearWorkbenchDraft, settings.defaultCommands]);

  // Ensure an active conversation exists if none yet
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation('New Session');
    } else if (!activeConversationId) {
      setActiveConversation(conversations[0].id);
    }
  }, [conversations, activeConversationId, createConversation, setActiveConversation]);

  // Parse input commands combined with chip selection
  const parsedInput = useMemo(() => parseMessage(input, allCommands), [input, allCommands]);

  const activeCommandsA = useMemo(() => {
    const map = new Map<string, Command>();
    for (const slash of selectedSlashes) {
      const cmd = allCommands.find((c) => c.slash.toLowerCase() === slash.toLowerCase());
      if (cmd) map.set(cmd.id, cmd);
    }
    for (const cmd of parsedInput.commands) {
      map.delete(cmd.id);
      map.set(cmd.id, cmd);
    }
    return Array.from(map.values());
  }, [selectedSlashes, parsedInput.commands, allCommands]);

  const activeCommandsB = useMemo(() => {
    return compareSlashesB
      .map((s) => allCommands.find((c) => c.slash.toLowerCase() === s.toLowerCase()))
      .filter((c): c is Command => Boolean(c));
  }, [compareSlashesB, allCommands]);

  const conflictsA = useMemo(() => detectConflicts(activeCommandsA), [activeCommandsA]);

  const generatedSystemInstruction = useMemo(
    () =>
      buildSystemInstruction(activeCommandsA, {
        commandOverrides: settings.commandOverrides,
        maxOutputTokens: settings.maxOutputTokens,
      }),
    [activeCommandsA, settings.commandOverrides, settings.maxOutputTokens]
  );

  useEffect(() => {
    if (!advancedMode) {
      setCustomSystemPrompt(generatedSystemInstruction);
    }
  }, [generatedSystemInstruction, advancedMode]);

  const paletteMatches = useMemo(() => {
    const enabled = allCommands.filter((c) => !settings.disabledCommands.includes(c.id));
    return fuzzyMatchCommands(slashQuery, enabled).slice(0, 14);
  }, [slashQuery, allCommands, settings.disabledCommands]);

  useEffect(() => {
    setActivePaletteIdx(0);
  }, [slashQuery, paletteOpen]);

  const handleInputChange = (val: string, cursorPos?: number) => {
    setInput(val);
    const pos = cursorPos ?? val.length;
    const beforeCursor = val.slice(0, pos);
    const match = beforeCursor.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
    if (match) {
      setSlashQuery(match[1]);
      setPaletteOpen(true);
    } else {
      setPaletteOpen(false);
      setSlashQuery('');
    }
  };

  const insertCommandFromPalette = (cmd: Command) => {
    const el = textareaRef.current;
    const pos = el?.selectionStart ?? input.length;
    const before = input.slice(0, pos);
    const after = input.slice(pos);
    const replacedBefore = before.replace(/(^|\s)\/[a-zA-Z0-9_-]*$/, '$1').trimEnd();
    const nextText = [replacedBefore, after.trimStart()].filter(Boolean).join(' ');
    setInput(nextText);
    setSelectedSlashes((prev) =>
      prev.some((s) => s.toLowerCase() === cmd.slash.toLowerCase()) ? prev : [...prev, cmd.slash]
    );
    setPaletteOpen(false);
    setSlashQuery('');
    setTimeout(() => textareaRef.current?.focus(), 20);
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (paletteOpen && paletteMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePaletteIdx((i) => (i + 1) % paletteMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePaletteIdx((i) => (i - 1 + paletteMatches.length) % paletteMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertCommandFromPalette(paletteMatches[activePaletteIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setPaletteOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        if (compareMode) handleRunCompare();
        else handleSend();
      }
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const runAssistantTurn = async (
    convId: string,
    historyMessages: Message[],
    userBody: string,
    commandsUsed: Command[],
    systemInst: string
  ) => {
    const assistantId = makeMsgId();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      text: '',
      commandsUsed: commandsUsed.map((c) => c.slash),
      model: settings.model,
      createdAt: Date.now(),
      systemInstructionSnapshot: systemInst,
    };
    addMessage(convId, assistantMsg);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    setStreamError(null);

    const trimmedHistory = historyMessages.slice(-settings.historyWindow);
    const contents = [
      ...trimmedHistory.map((m) => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.text }],
      })),
      { role: 'user' as const, parts: [{ text: userBody }] },
    ];

    try {
      await streamChat({
        model: settings.model,
        contents,
        systemInstruction: systemInst,
        thinkingLevel: settings.thinkingLevel,
        maxOutputTokens: settings.maxOutputTokens,
        signal: controller.signal,
        onChunk: (_chunk, fullText) => {
          updateMessage(convId, assistantId, { text: fullText });
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        },
      });
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      if (friendly.kind !== 'aborted') {
        setStreamError(friendly);
        updateMessage(convId, assistantId, { error: friendly.description });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleSend = async () => {
    const body = parsedInput.body.trim();
    if (!body) {
      showToast('Type a message before sending', 'warning');
      return;
    }

    const convId = activeConversation?.id ?? createConversation('New Session');
    const currentHistory = activeConversation?.messages ?? [];

    const effectiveSystemInst = advancedMode ? customSystemPrompt : generatedSystemInstruction;
    const userMsg: Message = {
      id: makeMsgId(),
      role: 'user',
      text: body,
      commandsUsed: activeCommandsA.map((c) => c.slash),
      createdAt: Date.now(),
    };

    addMessage(convId, userMsg);
    setInput('');
    setPaletteOpen(false);

    await runAssistantTurn(convId, currentHistory, body, activeCommandsA, effectiveSystemInst);
  };

  const handleRegenerate = async (assistantMsg: Message, overrideCommands?: Command[]) => {
    if (!activeConversation || isStreaming) return;
    const idx = activeConversation.messages.findIndex((m) => m.id === assistantMsg.id);
    if (idx <= 0) return;

    // Find preceding user message
    let userIdx = idx - 1;
    while (userIdx >= 0 && activeConversation.messages[userIdx].role !== 'user') {
      userIdx--;
    }
    if (userIdx < 0) return;

    const userMsg = activeConversation.messages[userIdx];
    const priorHistory = activeConversation.messages.slice(0, userIdx);
    const cmds =
      overrideCommands ??
      userMsg.commandsUsed
        .map((s) => allCommands.find((c) => c.slash.toLowerCase() === s.toLowerCase()))
        .filter((c): c is Command => Boolean(c));

    const sysInst = buildSystemInstruction(cmds, {
      commandOverrides: settings.commandOverrides,
      maxOutputTokens: settings.maxOutputTokens,
    });

    removeMessagesFrom(activeConversation.id, assistantMsg.id);
    setRerunMessageId(null);
    await runAssistantTurn(activeConversation.id, priorHistory, userMsg.text, cmds, sysInst);
  };

  const handleRunCompare = async () => {
    const body = parsedInput.body.trim();
    if (!body) {
      showToast('Enter a prompt to compare side-by-side', 'warning');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    setCompareState({
      prompt: body,
      leftText: '',
      rightText: '',
      leftLoading: true,
      rightLoading: true,
    });

    const sysA = buildSystemInstruction(activeCommandsA, {
      commandOverrides: settings.commandOverrides,
      maxOutputTokens: settings.maxOutputTokens,
    });
    const sysB = buildSystemInstruction(activeCommandsB, {
      commandOverrides: settings.commandOverrides,
      maxOutputTokens: settings.maxOutputTokens,
    });

    await Promise.allSettled([
      streamChat({
        model: settings.model,
        contents: body,
        systemInstruction: sysA,
        thinkingLevel: settings.thinkingLevel,
        signal: controller.signal,
        onChunk: (_c, fullText) =>
          setCompareState((prev) => (prev ? { ...prev, leftText: fullText } : prev)),
      })
        .catch((err) => {
          const f = getFriendlyErrorMessage(err);
          setCompareState((prev) => (prev ? { ...prev, leftError: f.description } : prev));
        })
        .finally(() =>
          setCompareState((prev) => (prev ? { ...prev, leftLoading: false } : prev))
        ),
      streamChat({
        model: settings.model,
        contents: body,
        systemInstruction: sysB,
        thinkingLevel: settings.thinkingLevel,
        signal: controller.signal,
        onChunk: (_c, fullText) =>
          setCompareState((prev) => (prev ? { ...prev, rightText: fullText } : prev)),
      })
        .catch((err) => {
          const f = getFriendlyErrorMessage(err);
          setCompareState((prev) => (prev ? { ...prev, rightError: f.description } : prev));
        })
        .finally(() =>
          setCompareState((prev) => (prev ? { ...prev, rightLoading: false } : prev))
        ),
    ]);

    setIsStreaming(false);
    abortRef.current = null;
  };

  const exportConversation = (format: 'md' | 'json') => {
    if (!activeConversation) return;
    let content = '';
    let filename = `${activeConversation.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    if (format === 'json') {
      content = JSON.stringify(activeConversation, null, 2);
      filename += '.json';
    } else {
      content = [
        `# ${activeConversation.title}`,
        '',
        ...activeConversation.messages.map((m) => {
          const cmds = m.commandsUsed.length ? ` (${m.commandsUsed.join(' ')})` : '';
          return `## ${m.role === 'user' ? 'User' : 'Srishti'}${cmds}\n\n${m.text}\n`;
        }),
      ].join('\n');
      filename += '.md';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported session as ${format.toUpperCase()}`, 'success');
  };

  const totalCharCount = input.length;
  const totalTokenEst = estimateTokens(input + generatedSystemInstruction);

  return (
    <div className="h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)] flex relative overflow-hidden">
      {/* Conversation History Sidebar (Desktop) */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 flex-col border-r border-slate-200 dark:border-white/[0.08] bg-white/60 dark:bg-[#0E1118]">
        <div className="p-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Sessions</span>
          <button
            type="button"
            onClick={() => createConversation('New Session')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => {
            const active = conv.id === activeConversation?.id;
            return (
              <div
                key={conv.id}
                className={`group rounded-xl px-3 py-2 text-xs transition flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-slate-900/5 dark:bg-white/[0.08] text-slate-950 dark:text-white font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                {editingTitleId === conv.id ? (
                  <form
                    className="flex-1 flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      renameConversation(conv.id, titleDraft);
                      setEditingTitleId(null);
                    }}
                  >
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={() => {
                        renameConversation(conv.id, titleDraft);
                        setEditingTitleId(null);
                      }}
                      className="w-full bg-white dark:bg-[#0B0D12] border border-amber-500 rounded px-1.5 py-0.5 text-xs"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveConversation(conv.id)}
                    className="flex-1 text-left truncate cursor-pointer"
                  >
                    {conv.title}
                  </button>
                )}

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTitleId(conv.id);
                      setTitleDraft(conv.title);
                    }}
                    aria-label="Rename session"
                    className="p-1 rounded hover:text-amber-500 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConversation(conv.id)}
                    aria-label="Delete session"
                    className="p-1 rounded hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Workbench Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0D12]/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10"
            >
              <History className="w-3.5 h-3.5" />
              Sessions
            </button>

            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setCompareMode(false)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  !compareMode
                    ? 'bg-white dark:bg-[#181D2A] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setCompareMode(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  compareMode
                    ? 'bg-white dark:bg-[#181D2A] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                Compare
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                showPreview
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Prompt Preview
            </button>

            {activeConversation && activeConversation.messages.length > 0 && (
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => exportConversation('md')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  title="Export Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  MD
                </button>
                <button
                  type="button"
                  onClick={() => exportConversation('json')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  title="Export JSON"
                >
                  JSON
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages or Compare Viewport */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {compareMode ? (
            <div className="max-w-5xl mx-auto space-y-5">
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Set A (uses your active composer commands)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCommandsA.length > 0 ? (
                      activeCommandsA.map((c) => (
                        <CommandChipButton key={c.id} command={c} selected size="sm" />
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Default (no slash commands)</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Set B (comparison lens)
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {activeCommandsB.map((c) => (
                      <CommandChipButton
                        key={c.id}
                        command={c}
                        size="sm"
                        onRemove={() =>
                          setCompareSlashesB((prev) =>
                            prev.filter((s) => s.toLowerCase() !== c.slash.toLowerCase())
                          )
                        }
                      />
                    ))}
                    <select
                      aria-label="Add command to Set B"
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !compareSlashesB.includes(val)) {
                          setCompareSlashesB((prev) => [...prev, val]);
                        }
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] text-xs font-mono"
                    >
                      <option value="">+ Add command</option>
                      {allCommands.map((c) => (
                        <option key={c.id} value={c.slash}>
                          {c.slash} — {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {compareState ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-white/[0.06] pb-2">
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                        Set A · {activeCommandsA.map((c) => c.slash).join(' ') || 'Default'}
                      </span>
                      {compareState.leftLoading && <span>Streaming…</span>}
                    </div>
                    {compareState.leftError ? (
                      <p className="text-sm text-rose-500">{compareState.leftError}</p>
                    ) : (
                      <MarkdownRenderer content={compareState.leftText || 'Waiting for response…'} />
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-white/[0.06] pb-2">
                      <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                        Set B · {activeCommandsB.map((c) => c.slash).join(' ') || 'Default'}
                      </span>
                      {compareState.rightLoading && <span>Streaming…</span>}
                    </div>
                    {compareState.rightError ? (
                      <p className="text-sm text-rose-500">{compareState.rightError}</p>
                    ) : (
                      <MarkdownRenderer content={compareState.rightText || 'Waiting for response…'} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  Type a message below and press Send to compare Set A and Set B side by side.
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6" aria-live="polite">
              {(!activeConversation || activeConversation.messages.length === 0) && (
                <div className="py-12 text-center space-y-4">
                  <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    Type anything. Add a <span className="text-amber-500">/command</span>.
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Type <code className="font-mono">/</code> in the box below to open the command palette, or start with a quick prompt.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {[
                      {
                        label: 'Stress-test a business idea (/redteam)',
                        text: 'I want to start a subscription tiffin service for IT park employees in Kakkanad.',
                        cmds: ['/redteam', '/no-fluff'],
                      },
                      {
                        label: 'Explain cleanly (/ELI5)',
                        text: 'How do HTTPS certificates prove a website is authentic?',
                        cmds: ['/ELI5'],
                      },
                      {
                        label: 'Debug code (/debug)',
                        text: 'Why does React state inside setInterval read stale values?',
                        cmds: ['/debug', '/examples'],
                      },
                    ].map((starter) => (
                      <button
                        key={starter.label}
                        type="button"
                        onClick={() => {
                          setInput(starter.text);
                          setSelectedSlashes(starter.cmds);
                          textareaRef.current?.focus();
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-slate-700 dark:text-slate-300 hover:border-amber-500/40 transition cursor-pointer"
                      >
                        {starter.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeConversation?.messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {isUser ? (
                      <div className="max-w-[88%] rounded-2xl border border-amber-500/25 bg-amber-500/10 dark:bg-amber-500/[0.08] px-4 py-3 space-y-1.5">
                        <p className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                          {msg.text}
                        </p>
                        {msg.commandsUsed.length > 0 && (
                          <div className="text-xs font-mono text-amber-700 dark:text-amber-300">
                            {msg.commandsUsed.join(' · ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Srishti · {msg.model ?? settings.model}
                            {msg.commandsUsed.length > 0 ? ` · ${msg.commandsUsed.join(' ')}` : ''}
                          </span>
                          <span className="font-mono tabular-nums">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {msg.error ? (
                          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
                            <span>{msg.error}</span>
                            <button
                              type="button"
                              onClick={() => handleRegenerate(msg)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 text-white shrink-0 cursor-pointer"
                            >
                              Retry
                            </button>
                          </div>
                        ) : msg.text ? (
                          <MarkdownRenderer content={msg.text} />
                        ) : (
                          <div className="space-y-2 py-2 animate-pulse">
                            <div className="h-3.5 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
                            <div className="h-3.5 bg-slate-200 dark:bg-white/10 rounded w-5/6" />
                            <div className="h-3.5 bg-slate-200 dark:bg-white/10 rounded w-1/2" />
                          </div>
                        )}

                        {msg.text && !isStreaming && (
                          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(msg.text);
                                  showToast('Answer copied', 'success');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegenerate(msg)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Regenerate
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRerunMessageId((prev) => (prev === msg.id ? null : msg.id))
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                Run with another command
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  savePromptItem({
                                    title: msg.text.slice(0, 48).replace(/[#*\n]/g, '').trim() || 'Saved Answer',
                                    content: msg.text,
                                    commands: msg.commandsUsed,
                                    tags: ['workbench'],
                                    pinned: false,
                                    type: 'answer',
                                  });
                                  showToast('Saved answer to My Library', 'success');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                                Save
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                aria-label="Thumbs up"
                                onClick={() =>
                                  activeConversation &&
                                  updateMessage(activeConversation.id, msg.id, {
                                    rating: msg.rating === 'up' ? undefined : 'up',
                                  })
                                }
                                className={`p-1.5 rounded-lg cursor-pointer ${
                                  msg.rating === 'up'
                                    ? 'text-emerald-500 bg-emerald-500/10'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label="Thumbs down"
                                onClick={() =>
                                  activeConversation &&
                                  updateMessage(activeConversation.id, msg.id, {
                                    rating: msg.rating === 'down' ? undefined : 'down',
                                  })
                                }
                                className={`p-1.5 rounded-lg cursor-pointer ${
                                  msg.rating === 'down'
                                    ? 'text-rose-500 bg-rose-500/10'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {rerunMessageId === msg.id && (
                          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-slate-500 mr-1">Re-run using:</span>
                            {['redteam', 'eli5', 'tldr', 'brutal', 'action-plan', 'senior-engineer'].map(
                              (cid) => {
                                const cmd = allCommands.find((c) => c.id === cid);
                                if (!cmd) return null;
                                return (
                                  <CommandChipButton
                                    key={cmd.id}
                                    command={cmd}
                                    size="sm"
                                    onClick={() => handleRegenerate(msg, [cmd])}
                                  />
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {streamError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm space-y-1">
                  <p className="font-semibold text-rose-700 dark:text-rose-300">{streamError.title}</p>
                  <p className="text-rose-600 dark:text-rose-200">{streamError.description}</p>
                  <p className="text-xs text-rose-500 dark:text-rose-300/80">{streamError.suggestion}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Live Prompt Preview Drawer */}
        {showPreview && (
          <div className="border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0E1118] px-4 sm:px-6 py-4 max-h-64 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Prompt Preview (System Instruction)
                </span>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedMode}
                    onChange={(e) => setAdvancedMode(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Advanced edit mode
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Hide
              </button>
            </div>
            {advancedMode ? (
              <textarea
                rows={4}
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                className="w-full rounded-xl border border-amber-500/40 bg-white dark:bg-[#0B0D12] p-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            ) : (
              <pre className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0D12] p-3 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {generatedSystemInstruction}
              </pre>
            )}
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0F1219] px-4 sm:px-6 py-3 relative">
          {/* Slash Autocomplete Palette */}
          {paletteOpen && (
            <div
              id="slash-command-listbox"
              role="listbox"
              aria-label="Slash commands"
              className="absolute bottom-full left-4 right-4 sm:left-6 sm:right-auto sm:w-[440px] mb-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#141923] shadow-2xl p-2 z-40"
            >
              {paletteMatches.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-500 text-center">
                  No command matches “/{slashQuery}”
                </div>
              ) : (
                GROUP_ORDER.map((groupId) => {
                  const groupItems = paletteMatches.filter((c) => c.group === groupId);
                  if (groupItems.length === 0) return null;
                  const meta = COMMAND_GROUPS[groupId];
                  return (
                    <div key={groupId} className="mb-2 last:mb-0">
                      <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {meta.name}
                      </div>
                      {groupItems.map((cmd) => {
                        const flatIdx = paletteMatches.findIndex((p) => p.id === cmd.id);
                        const active = flatIdx === activePaletteIdx;
                        return (
                          <button
                            key={cmd.id}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setActivePaletteIdx(flatIdx)}
                            onClick={() => insertCommandFromPalette(cmd)}
                            className={`w-full text-left px-3 py-2 rounded-xl flex items-start justify-between gap-3 transition cursor-pointer ${
                              active
                                ? 'bg-amber-500/15 text-slate-950 dark:text-white'
                                : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-xs font-semibold ${meta.accentTextClass}`}>
                                  {cmd.slash}
                                </span>
                                <span className="text-xs font-medium truncate">{cmd.label}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {cmd.shortDescription}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-2.5">
            {/* Conflict Warnings */}
            {conflictsA.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {conflictsA.map((c) => (
                  <div
                    key={`${c.commandA}-${c.commandB}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{c.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Command Chips */}
            {activeCommandsA.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeCommandsA.map((cmd) => (
                  <CommandChipButton
                    key={cmd.id}
                    command={cmd}
                    size="sm"
                    onRemove={() => {
                      setSelectedSlashes((prev) =>
                        prev.filter((s) => s.toLowerCase() !== cmd.slash.toLowerCase())
                      );
                      // Also strip from textarea if typed inline
                      setInput((prev) =>
                        prev.replace(new RegExp(`(^|\\s)${cmd.slash.replace('/', '\\/')}(?=\\s|$)`, 'gi'), '$1').trim()
                      );
                    }}
                  />
                ))}
              </div>
            )}

            <div className="flex items-end gap-2.5">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value, e.target.selectionStart)}
                  onKeyDown={handleComposerKeyDown}
                  role="combobox"
                  aria-expanded={paletteOpen}
                  aria-controls="slash-command-listbox"
                  aria-autocomplete="list"
                  placeholder="Ask anything or paste text… type / for commands (e.g. /redteam /no-fluff)"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 resize-none max-h-40"
                />
              </div>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  aria-label="Stop generation"
                  className="h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={compareMode ? handleRunCompare : handleSend}
                  disabled={!parsedInput.body.trim()}
                  className="h-11 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 disabled:opacity-40 cursor-pointer hover:brightness-105 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  {compareMode ? 'Compare' : 'Send'}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>Type / for commands · Enter to send · Shift+Enter for newline</span>
                {parsedInput.unknown.length > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    Unknown: {parsedInput.unknown.join(', ')}
                  </span>
                )}
              </div>
              <span className="font-mono tabular-nums">
                {totalCharCount} chars · ~{totalTokenEst} tokens
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile History Sheet */}
      {historyOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-start"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-white dark:bg-[#121620] p-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
              <span className="font-display font-semibold">Sessions</span>
              <button type="button" onClick={() => setHistoryOpen(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                createConversation('New Session');
                setHistoryOpen(false);
              }}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950"
            >
              + New Session
            </button>
            <div className="flex-1 overflow-y-auto space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveConversation(conv.id);
                      setHistoryOpen(false);
                    }}
                    className="flex-1 text-left text-xs truncate"
                  >
                    {conv.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConversation(conv.id)}
                    aria-label="Delete session"
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
