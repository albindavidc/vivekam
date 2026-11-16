import { buildSystemInstruction, parseMessage } from '@/src/lib/commandEngine';
import type { Command } from '@/src/types';

export function buildChatGptPrompt(
  rawText: string,
  commands: Command[],
  commandOverrides: Record<string, string> = {}
): string {
  const cleanBody = rawText.trim();
  if (commands.length === 0) {
    return cleanBody;
  }

  const slashList = commands.map((c) => c.slash).join(' ');
  const directiveBlock = commands
    .map((cmd, idx) => {
      const effective = (commandOverrides[cmd.id] ?? cmd.directive).trim();
      return `${idx + 1}. ${cmd.slash}: ${effective}`;
    })
    .join('\n');

  const rules = [
    `[Vivekam Command Directives: ${slashList}]`,
    directiveBlock,
    'Rules: Apply all commands together (if two conflict, follow the last one and note it in one line). Be honest even if unwelcome; never invent facts or figures; reply in the language I wrote in.',
  ].join('\n');

  if (!cleanBody) {
    return `${rules}\n\nPlease apply ${slashList} to my request below:\n`;
  }

  return `${cleanBody}\n\n---\n${rules}`;
}

export function buildChatGptUrl(
  rawText: string,
  commands: Command[],
  commandOverrides: Record<string, string> = {}
): string {
  const fullPrompt = buildChatGptPrompt(rawText, commands, commandOverrides);
  if (!fullPrompt) {
    return 'https://chatgpt.com/';
  }
  return `https://chatgpt.com/?q=${encodeURIComponent(fullPrompt)}`;
}

export function resolveCommandsFromSlashes(
  slashes: string[],
  allCommands: Command[]
): Command[] {
  const bySlash = new Map<string, Command>();
  for (const c of allCommands) {
    bySlash.set(c.slash.toLowerCase(), c);
  }
  const resolved: Command[] = [];
  const seen = new Set<string>();
  for (const s of slashes) {
    const norm = (s.startsWith('/') ? s : `/${s}`).toLowerCase();
    const match = bySlash.get(norm);
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      resolved.push(match);
    }
  }
  return resolved;
}

export function openInChatGpt(
  rawText: string,
  commands: Command[],
  commandOverrides: Record<string, string> = {}
): void {
  const parsed = parseMessage(rawText, commands);
  const effectiveBody = parsed.body || rawText;
  const url = buildChatGptUrl(effectiveBody, commands, commandOverrides);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export { buildSystemInstruction };
