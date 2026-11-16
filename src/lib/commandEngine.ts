import { GROUP_ORDER, COMMAND_GROUPS } from '@/src/data/commands';
import type { Command } from '@/src/types';

export interface ParsedMessage {
  body: string;
  commands: Command[];
  unknown: string[];
}

export interface ConflictWarning {
  commandA: string;
  commandB: string;
  winner: string;
  message: string;
}

export interface SystemInstructionOptions {
  commandOverrides?: Record<string, string>;
  language?: 'en' | 'ml';
  maxOutputTokens?: number;
  responseLengthHint?: 'concise' | 'balanced' | 'detailed';
  customPrelude?: string;
}

export function normalizeSlash(input: string): string {
  const trimmed = input.trim();
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.toLowerCase();
}

/**
 * Parses slash commands anywhere in a message (typically trailing), case-insensitively.
 * Only matches `/` tokens at start of input or preceded by whitespace so URLs/file paths
 * such as `https://example.com/redteam` or `src/debug/file.ts` are never misparsed.
 */
export function parseMessage(text: string, availableCommands: Command[]): ParsedMessage {
  if (!text) {
    return { body: '', commands: [], unknown: [] };
  }

  const bySlash = new Map<string, Command>();
  for (const cmd of availableCommands) {
    bySlash.set(normalizeSlash(cmd.slash), cmd);
  }

  const foundCommands: Command[] = [];
  const seenIds = new Set<string>();
  const unknown: string[] = [];
  const seenUnknown = new Set<string>();

  // Match whitespace or start-of-string followed by /token
  const tokenRegex = /(^|\s)(\/[a-zA-Z0-9][a-zA-Z0-9_-]*)(?=\s|$|[.,!?;:])/g;

  const stripped = text.replace(tokenRegex, (fullMatch, leadingWs: string, token: string) => {
    const norm = normalizeSlash(token);
    const matched = bySlash.get(norm);
    if (matched) {
      if (!seenIds.has(matched.id)) {
        seenIds.add(matched.id);
        foundCommands.push(matched);
      } else {
        // Move repeated command to the end so "last wins" order reflects user's final token
        const idx = foundCommands.findIndex((c) => c.id === matched.id);
        if (idx !== -1) {
          foundCommands.splice(idx, 1);
          foundCommands.push(matched);
        }
      }
      return leadingWs;
    }

    if (!seenUnknown.has(norm)) {
      seenUnknown.add(norm);
      unknown.push(token);
    }
    return fullMatch;
  });

  const body = stripped.replace(/[ \t]{2,}/g, ' ').replace(/\s+\n/g, '\n').trim();

  return {
    body,
    commands: foundCommands,
    unknown,
  };
}

/**
 * Detects conflicting command pairs among active commands.
 * Preserves command appearance order so `winner` reflects the command that appears last.
 */
export function detectConflicts(commands: Command[]): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < commands.length; i++) {
    for (let j = i + 1; j < commands.length; j++) {
      const first = commands[i];
      const second = commands[j];
      const firstNorm = normalizeSlash(first.slash);
      const secondNorm = normalizeSlash(second.slash);

      const firstConflicts = first.conflictsWith.map(normalizeSlash).includes(secondNorm);
      const secondConflicts = second.conflictsWith.map(normalizeSlash).includes(firstNorm);

      if (firstConflicts || secondConflicts) {
        const pairKey = [firstNorm, secondNorm].sort().join('::');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        warnings.push({
          commandA: first.slash,
          commandB: second.slash,
          winner: second.slash,
          message: `${first.slash} and ${second.slash} pull in opposite directions — ${second.slash} appears last so it takes priority if they clash.`,
        });
      }
    }
  }

  return warnings;
}

export function buildSystemInstruction(
  commands: Command[],
  options: SystemInstructionOptions = {}
): string {
  const { commandOverrides = {}, maxOutputTokens, customPrelude } = options;

  const sections: string[] = [];

  sections.push(
    [
      'You are Srishti, a sharp, reliable AI thinking and writing assistant.',
      'LANGUAGE RULE: Always reply in the language the user wrote in (English, Malayalam, or Manglish / Latin-script Malayalam), while keeping slash command words and technical identifiers in English.',
      'HONESTY RULE: Be honest even if the answer is not what the user wants to hear. Never invent facts, figures, benchmarks, citations, or sources. Explicitly flag uncertainty or missing context instead of guessing.',
    ].join('\n')
  );

  if (customPrelude && customPrelude.trim()) {
    sections.push(`CONTEXT / BASE PRELUDE:\n${customPrelude.trim()}`);
  }

  if (maxOutputTokens && maxOutputTokens > 0) {
    const approxWords = Math.round(maxOutputTokens * 0.7);
    sections.push(
      `LENGTH GUIDANCE: Keep the complete response comfortably within roughly ${approxWords} words unless precision strictly requires slightly more.`
    );
  }

  if (commands.length > 0) {
    const directiveLines = commands.map((cmd, idx) => {
      const effectiveDirective = (commandOverrides[cmd.id] ?? cmd.directive).trim();
      return `${idx + 1}. ${cmd.slash} (${cmd.label}): ${effectiveDirective}`;
    });

    sections.push(
      [
        'ACTIVE COMMAND DIRECTIVES:',
        ...directiveLines,
        '',
        'MULTI-COMMAND PRIORITY RULE: Apply all active commands together seamlessly. If two active commands conflict on tone, depth, or length, follow the one that appears last in the list above and state that resolution in one short opening or closing line.',
      ].join('\n')
    );
  } else {
    sections.push(
      'DEFAULT MODE: Answer clearly, accurately, and concisely with practical structure.'
    );
  }

  return sections.join('\n\n');
}

export function buildAlwaysOnSetup(
  enabledCommands: Command[],
  style: 'compact' | 'detailed' = 'compact',
  commandOverrides: Record<string, string> = {}
): string {
  const header =
    'SRISHTI SLASH COMMANDS (Behaviour Shortcuts)\nWhenever my message includes one or more slash commands below (usually at the end, case-insensitive), shape your entire reply to follow those directives:';

  const grouped = new Map<string, Command[]>();
  for (const groupId of GROUP_ORDER) {
    grouped.set(groupId, []);
  }
  for (const cmd of enabledCommands) {
    const list = grouped.get(cmd.group) ?? [];
    list.push(cmd);
    grouped.set(cmd.group, list);
  }

  const lines: string[] = [];

  for (const groupId of GROUP_ORDER) {
    const list = grouped.get(groupId) ?? [];
    if (list.length === 0) continue;
    const groupName = COMMAND_GROUPS[groupId].name;

    if (style === 'compact') {
      const items = list.map((c) => `${c.slash} ${c.shortDescription.replace(/\.$/, '')}`).join(' · ');
      lines.push(`${groupName}: ${items}`);
    } else {
      lines.push(`## ${groupName}`);
      for (const c of list) {
        const dir = (commandOverrides[c.id] ?? c.directive).trim();
        lines.push(`- ${c.slash}: ${dir}`);
      }
    }
  }

  const customOrExtra = enabledCommands.filter((c) => !(c.group in COMMAND_GROUPS));
  if (customOrExtra.length > 0) {
    if (style === 'compact') {
      lines.push(
        `Custom: ${customOrExtra.map((c) => `${c.slash} ${c.shortDescription.replace(/\.$/, '')}`).join(' · ')}`
      );
    } else {
      lines.push('## Custom');
      for (const c of customOrExtra) {
        lines.push(`- ${c.slash}: ${(commandOverrides[c.id] ?? c.directive).trim()}`);
      }
    }
  }

  const rules = [
    'RULES:',
    '1. Multi-command: Apply all commands together. If two conflict, follow the one appearing last and note it in one line.',
    '2. Honesty: Be honest even when unwelcome. Never invent facts, numbers, or sources; flag uncertainty clearly.',
    '3. Language: Reply in the language I wrote in (English, Malayalam, or Manglish), keeping command names in English.',
  ].join('\n');

  return [header, lines.join('\n'), rules].filter(Boolean).join('\n\n');
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.trim().length / 4);
}

export function fuzzyMatchCommands(query: string, commands: Command[]): Command[] {
  const q = query.trim().toLowerCase().replace(/^\//, '');
  if (!q) return commands;

  const scored: Array<{ cmd: Command; score: number }> = [];

  for (const cmd of commands) {
    const slashName = cmd.slash.toLowerCase().replace(/^\//, '');
    const label = cmd.label.toLowerCase();
    const desc = cmd.shortDescription.toLowerCase();
    const tags = cmd.tags.join(' ').toLowerCase();

    let score = 0;
    if (slashName === q) score += 100;
    else if (slashName.startsWith(q)) score += 70;
    else if (slashName.includes(q)) score += 45;
    else if (label.includes(q)) score += 30;
    else if (tags.includes(q)) score += 20;
    else if (desc.includes(q)) score += 10;
    else {
      // Subsequence match on slashName
      let qi = 0;
      for (let i = 0; i < slashName.length && qi < q.length; i++) {
        if (slashName[i] === q[qi]) qi++;
      }
      if (qi === q.length) score += 15;
    }

    if (score > 0) {
      scored.push({ cmd, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.cmd);
}
