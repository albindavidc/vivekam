import React from 'react';
import { X } from 'lucide-react';
import { COMMAND_GROUPS } from '@/src/data/commands';
import type { Command } from '@/src/types';

interface CommandChipButtonProps {
  command: Command;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export const CommandChipButton: React.FC<CommandChipButtonProps> = ({
  command,
  selected = false,
  onClick,
  onRemove,
  size = 'md',
}) => {
  const group = COMMAND_GROUPS[command.group] ?? COMMAND_GROUPS.learn;
  const padding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs';

  if (onRemove) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg border font-mono font-medium transition whitespace-nowrap shrink-0 ${padding} ${group.accentBorderClass} ${group.accentBgClass} ${group.accentTextClass}`}
      >
        <span>{command.slash}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${command.slash}`}
          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border font-mono font-medium transition whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${padding} ${
        selected
          ? `${group.accentBorderClass} ${group.accentBgClass} ${group.accentTextClass}`
          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#141923] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-950 dark:hover:text-white'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${group.dotClass}`} aria-hidden="true" />
      <span>{command.slash}</span>
    </button>
  );
};
