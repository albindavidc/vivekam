import React, { useMemo, useState } from 'react';
import { Copy, Star, ExternalLink, SlidersHorizontal, Search, X, RotateCcw, Check, ChevronDown, ShoppingBag } from 'lucide-react';
import { COMMAND_GROUPS, GROUP_ORDER } from '@/src/data/commands';
import { buildChatGptUrl } from '@/src/lib/chatgpt';
import { useDebounce } from '@/src/hooks/useDebounce';
import { useAllCommands, useAppStore } from '@/src/store/useAppStore';
import type { Command } from '@/src/types';

export const CommandLibrary: React.FC = () => {
  const allCommands = useAllCommands();
  const favoriteCommandIds = useAppStore((s) => s.favoriteCommandIds);
  const toggleFavoriteCommand = useAppStore((s) => s.toggleFavoriteCommand);
  const commandOverrides = useAppStore((s) => s.settings.commandOverrides);
  const setCommandOverride = useAppStore((s) => s.setCommandOverride);
  const activeGroup = useAppStore((s) => s.commandFilter);
  const setActiveGroup = useAppStore((s) => s.setCommandFilter);
  const setActiveScreen = useAppStore((s) => s.setActiveScreen);
  const setExploreMode = useAppStore((s) => s.setExploreMode);
  const showToast = useAppStore((s) => s.showToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const [detailCommand, setDetailCommand] = useState<Command | null>(null);
  const [directiveDraft, setDirectiveDraft] = useState('');

  const toggleExpandCard = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const debouncedQuery = useDebounce(searchQuery, 150);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cmd of allCommands) {
      for (const t of cmd.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [allCommands]);

  const salesCount = useMemo(
    () => allCommands.filter((cmd) => cmd.group === 'sales').length,
    [allCommands]
  );

  const filteredCommands = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return allCommands.filter((cmd) => {
      if (activeGroup === 'favorites' && !favoriteCommandIds.includes(cmd.id)) return false;
      if (activeGroup !== 'all' && activeGroup !== 'favorites' && cmd.group !== activeGroup) {
        return false;
      }
      if (selectedTag !== 'all' && !cmd.tags.includes(selectedTag)) return false;
      if (!q) return true;
      return (
        cmd.slash.toLowerCase().includes(q) ||
        cmd.label.toLowerCase().includes(q) ||
        cmd.shortDescription.toLowerCase().includes(q) ||
        cmd.malayalamNote.toLowerCase().includes(q) ||
        cmd.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [allCommands, activeGroup, favoriteCommandIds, selectedTag, debouncedQuery]);

  const handleCopyCommand = (cmd: Command) => {
    navigator.clipboard?.writeText(cmd.slash);
    setCopiedId(cmd.id);
    showToast(`Copied ${cmd.slash}`, 'success');
    setTimeout(() => setCopiedId((prev) => (prev === cmd.id ? null : prev)), 1500);
  };

  const openDetail = (cmd: Command) => {
    setDetailCommand(cmd);
    setDirectiveDraft(commandOverrides[cmd.id] ?? cmd.directive);
  };

  const handleSaveOverride = () => {
    if (!detailCommand) return;
    if (directiveDraft.trim() === detailCommand.directive.trim()) {
      setCommandOverride(detailCommand.id, null);
      showToast(`Reset ${detailCommand.slash} to default directive`, 'info');
    } else {
      setCommandOverride(detailCommand.id, directiveDraft);
      showToast(`Updated directive for ${detailCommand.slash}`, 'success');
    }
    setDetailCommand(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Command Library
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {allCommands.length} behavior shortcuts across {GROUP_ORDER.length} groups. Tap any command to copy or tune its underlying directive.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search slash, tag, or Malayalam note..."
              aria-label="Search commands"
              className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
            />
          </div>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            aria-label="Filter by tag"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
          >
            <option value="all">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sticky Group Tab Bar */}
      <div className="sticky top-14 md:top-16 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-2.5 bg-[#F7F8FA]/95 dark:bg-[#0B0D12]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveGroup('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeGroup === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                : 'bg-white dark:bg-[#121620] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            All ({allCommands.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveGroup('favorites')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeGroup === 'favorites'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-white dark:bg-[#121620] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Favourites ({favoriteCommandIds.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveGroup('sales')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeGroup === 'sales'
                ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/35'
                : 'bg-white dark:bg-[#121620] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Sales & Deals ({salesCount})
          </button>
          {GROUP_ORDER.filter((groupId) => groupId !== 'sales').map((groupId) => {
            const g = COMMAND_GROUPS[groupId];
            const active = activeGroup === groupId;
            return (
              <button
                key={groupId}
                type="button"
                onClick={() => setActiveGroup(groupId)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition cursor-pointer ${
                  active
                    ? `${g.accentBgClass} ${g.accentTextClass} border ${g.accentBorderClass}`
                    : 'bg-white dark:bg-[#121620] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${g.dotClass}`} aria-hidden="true" />
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

      {activeGroup === 'sales' && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              7 Commands for Sales & Deal Checks
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Use these when checking online sale tiles, inflated MRPs, variant catches, or comparing products before paying. Expand any card below for deal-check examples.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setExploreMode('sales');
              setActiveScreen('explore');
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 whitespace-nowrap shrink-0 cursor-pointer"
          >
            View Deal-Check Guide
          </button>
        </div>
      )}

      {/* Results */}
      {filteredCommands.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121620] p-10 text-center space-y-3">
          <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
            No matching commands
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Try clearing your search or switching back to All commands.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedTag('all');
              setActiveGroup('all');
            }}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-500 text-slate-950 cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {filteredCommands.map((cmd) => {
            const group = COMMAND_GROUPS[cmd.group] ?? COMMAND_GROUPS.learn;
            const isFav = favoriteCommandIds.includes(cmd.id);
            const hasOverride = Boolean(commandOverrides[cmd.id]);
            const isExpanded = expandedIds.has(cmd.id);
            const detailsId = `cmd-card-details-${cmd.id}`;
            return (
              <article
                key={cmd.id}
                className={`rounded-2xl border bg-white dark:bg-[#121620] p-5 flex flex-col gap-3 transition ${group.accentBorderClass}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`font-mono text-base font-semibold ${group.accentTextClass}`}>
                      {cmd.slash}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                      {cmd.label}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleFavoriteCommand(cmd.id)}
                      aria-label={isFav ? `Remove ${cmd.slash} from favourites` : `Favourite ${cmd.slash}`}
                      className={`p-2 rounded-lg transition cursor-pointer ${
                        isFav
                          ? 'text-amber-500 bg-amber-500/10'
                          : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpandCard(cmd.id)}
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      aria-label={isExpanded ? `Collapse ${cmd.slash} details` : `Expand ${cmd.slash} details`}
                      title={isExpanded ? 'Collapse details' : 'Expand details'}
                      className={`p-2 rounded-lg transition cursor-pointer ${
                        isExpanded
                          ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {cmd.shortDescription}
                </p>

                {isExpanded && (
                  <div id={detailsId} className="space-y-3 pt-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-white/[0.06]">
                      <p className="leading-relaxed">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Example: </span>
                        {cmd.example}
                      </p>
                      <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                        {cmd.malayalamNote}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06]">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate">
                          {group.name} · {cmd.tags.join(' · ')}
                        </span>
                        {(hasOverride || cmd.isCustom) && (
                          <span className="shrink-0 font-medium text-amber-600 dark:text-amber-400">
                            {hasOverride ? 'Tuned' : 'Custom'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyCommand(cmd)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition whitespace-nowrap cursor-pointer"
                        >
                          {copiedId === cmd.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedId === cmd.id ? 'Copied' : 'Copy'}
                        </button>
                        <a
                          href={buildChatGptUrl(
                            cmd.example.replace(
                              new RegExp(`\\s*${cmd.slash.replace('/', '\\/')}$`, 'i'),
                              ''
                            ),
                            [cmd],
                            commandOverrides
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => showToast(`Opening ${cmd.slash} in ChatGPT`, 'success')}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition whitespace-nowrap cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Try
                        </a>
                        <button
                          type="button"
                          onClick={() => openDetail(cmd)}
                          aria-label={`Inspect and tune ${cmd.slash}`}
                          className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                          title="Inspect & Tune Directive"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Detail & Tune Directive Sheet */}
      {detailCommand && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDetailCommand(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cmd-detail-title"
            className="max-w-xl w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 space-y-5 shadow-2xl max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-mono text-lg font-semibold text-amber-600 dark:text-amber-400">
                  {detailCommand.slash}
                </span>
                <h3 id="cmd-detail-title" className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  {detailCommand.label}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {COMMAND_GROUPS[detailCommand.group]?.name} · {detailCommand.tags.join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailCommand(null)}
                aria-label="Close detail sheet"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-sm">
              <p className="text-slate-700 dark:text-slate-200">{detailCommand.shortDescription}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">{detailCommand.malayalamNote}</p>
            </div>

            {detailCommand.conflictsWith.length > 0 && (
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold">Usually conflicts with: </span>
                <span className="font-mono">{detailCommand.conflictsWith.join(', ')}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="tune-directive-textarea"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Tune Directive (Local Override)
                </label>
                <button
                  type="button"
                  onClick={() => setDirectiveDraft(detailCommand.directive)}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-500 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset default
                </button>
              </div>
              <textarea
                id="tune-directive-textarea"
                rows={5}
                value={directiveDraft}
                onChange={(e) => setDirectiveDraft(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D12] p-3.5 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDetailCommand(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 cursor-pointer"
              >
                Save Directive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
