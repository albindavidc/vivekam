import React, { useMemo, useRef, useState } from 'react';
import {
  Search,
  Pin,
  Copy,
  Trash2,
  Download,
  Upload,
  ExternalLink,
  Star,
  Plus,
} from 'lucide-react';
import { useDebounce } from '@/src/hooks/useDebounce';
import { useAllCommands, useAppStore } from '@/src/store/useAppStore';

type LibraryTab = 'all' | 'prompts' | 'answers' | 'custom' | 'favorites';

export const MyLibrary: React.FC = () => {
  const allCommands = useAllCommands();
  const savedPrompts = useAppStore((s) => s.savedPrompts);
  const customCommands = useAppStore((s) => s.customCommands);
  const favoriteCommandIds = useAppStore((s) => s.favoriteCommandIds);

  const duplicateSavedPrompt = useAppStore((s) => s.duplicateSavedPrompt);
  const togglePinSavedPrompt = useAppStore((s) => s.togglePinSavedPrompt);
  const deleteSavedPrompt = useAppStore((s) => s.deleteSavedPrompt);
  const deleteCustomCommand = useAppStore((s) => s.deleteCustomCommand);
  const toggleFavoriteCommand = useAppStore((s) => s.toggleFavoriteCommand);
  const setActiveScreen = useAppStore((s) => s.setActiveScreen);
  const openPromptInChatGpt = useAppStore((s) => s.openPromptInChatGpt);
  const exportAllJson = useAppStore((s) => s.exportAllJson);
  const importAllJson = useAppStore((s) => s.importAllJson);
  const showToast = useAppStore((s) => s.showToast);

  const [tab, setTab] = useState<LibraryTab>('all');
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 150);

  const availableTags = useMemo(() => {
    const s = new Set<string>();
    for (const p of savedPrompts) {
      for (const t of p.tags) s.add(t);
    }
    return Array.from(s);
  }, [savedPrompts]);

  const filteredSaved = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return [...savedPrompts]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
      .filter((item) => {
        if (tab === 'prompts' && item.type !== 'prompt') return false;
        if (tab === 'answers' && item.type !== 'answer') return false;
        if (tagFilter !== 'all' && !item.tags.includes(tagFilter)) return false;
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.commands.some((c) => c.toLowerCase().includes(q))
        );
      });
  }, [savedPrompts, tab, tagFilter, debouncedQuery]);

  const favoriteCommands = useMemo(
    () =>
      allCommands.filter(
        (c) =>
          favoriteCommandIds.includes(c.id) &&
          (!debouncedQuery.trim() ||
            c.slash.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
            c.label.toLowerCase().includes(debouncedQuery.toLowerCase()))
      ),
    [allCommands, favoriteCommandIds, debouncedQuery]
  );

  const handleExport = () => {
    const json = exportAllJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vivekam-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Vivekam data as JSON', 'success');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importAllJson(text);
      showToast('Imported backup data successfully', 'success');
    } catch {
      showToast('Invalid JSON backup file', 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            My Library
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Saved prompts, answers, custom commands, session history, and favourites stored locally on this device.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Import JSON
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'all', label: `All Saved (${savedPrompts.length})` },
              { id: 'prompts', label: 'Prompts' },
              { id: 'answers', label: 'Answers' },
              { id: 'custom', label: `Custom (${customCommands.length})` },
              { id: 'favorites', label: `Favourites (${favoriteCommandIds.length})` },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                tab === item.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'bg-white dark:bg-[#121620] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search library..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs"
            />
          </div>
          {availableTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              aria-label="Filter saved items by tag"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-xs"
            >
              <option value="all">All tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Saved Prompts / Answers View */}
      {(tab === 'all' || tab === 'prompts' || tab === 'answers') && (
        <div className="space-y-3">
          {filteredSaved.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-10 text-center space-y-3">
              <p className="font-display text-base font-semibold">Nothing saved here yet</p>
              <p className="text-sm text-slate-500">
                Save reports from the Feedback Studio or build structured prompts in the Prompt Builder.
              </p>
              <button
                type="button"
                onClick={() => setActiveScreen('builder')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 cursor-pointer"
              >
                Go to Prompt Builder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSaved.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.type} · {new Date(item.updatedAt).toLocaleDateString()}
                          {item.commands.length ? ` · ${item.commands.join(' ')}` : ''}
                        </div>
                        <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white mt-0.5">
                          {item.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePinSavedPrompt(item.id)}
                        aria-label={item.pinned ? 'Unpin item' : 'Pin item'}
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          item.pinned ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400 hover:text-amber-500'
                        }`}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-4 whitespace-pre-wrap leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openPromptInChatGpt(item.content, item.commands)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Try in ChatGPT
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(item.content);
                          showToast('Copied content', 'success');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-white/10 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          duplicateSavedPrompt(item.id);
                          showToast('Duplicated item', 'info');
                        }}
                        className="px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavedPrompt(item.id)}
                        aria-label="Delete saved item"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom Commands Tab */}
      {tab === 'custom' && (
        <div className="space-y-3">
          {customCommands.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-10 text-center space-y-3">
              <p className="font-display text-base font-semibold">No custom commands yet</p>
              <button
                type="button"
                onClick={() => setActiveScreen('custom-commands')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Custom Command
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-semibold text-amber-500">
                      {cmd.slash}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteCustomCommand(cmd.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                      aria-label={`Delete ${cmd.slash}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm font-medium">{cmd.label}</p>
                  <p className="text-xs text-slate-500">{cmd.directive}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favorites Tab */}
      {tab === 'favorites' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {favoriteCommands.map((cmd) => (
            <div
              key={cmd.id}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-amber-500">{cmd.slash}</span>
                <button
                  type="button"
                  onClick={() => toggleFavoriteCommand(cmd.id)}
                  className="text-amber-500 p-1 cursor-pointer"
                  aria-label="Remove favourite"
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
              </div>
              <p className="text-sm font-medium">{cmd.label}</p>
              <p className="text-xs text-slate-500">{cmd.shortDescription}</p>
              <button
                type="button"
                onClick={() => openPromptInChatGpt('', [cmd.slash])}
                className="w-full py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/5 hover:bg-amber-500/15 cursor-pointer"
              >
                Try in ChatGPT
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
