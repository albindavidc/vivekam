import { describe, expect, it } from 'vitest';
import { BUILT_IN_COMMANDS } from '@/src/data/commands';
import {
  buildAlwaysOnSetup,
  buildSystemInstruction,
  detectConflicts,
  fuzzyMatchCommands,
  parseMessage,
} from '@/src/lib/commandEngine';
import { buildChatGptPrompt, buildChatGptUrl } from '@/src/lib/chatgpt';
import { CURRENT_SCHEMA_VERSION, migrateAppState } from '@/src/lib/storage';
import type { Command } from '@/src/types';

const EXPECTED_BY_GROUP: Record<string, string[]> = {
  learn: ['/ELI5', '/ELI10', '/TLDR', '/deepdive', '/examples', '/analogy', '/stepbystep', '/beginner'],
  feedback: ['/brutal', '/devilsadvocate', '/challenge', '/pros-cons', '/redteam', '/realitycheck', '/steelman', '/no-fluff'],
  coding: ['/debug', '/code-review', '/optimize', '/explain-code', '/test-cases', '/edge-cases', '/senior-engineer', '/security-review'],
  business: ['/startup-mode', '/business-plan', '/validate-idea', '/ROI', '/career-coach', '/interview-mode', '/prioritize', '/opportunity-cost'],
  writing: ['/rewrite', '/professional', '/casual', '/persuasive', '/shorten', '/humanize', '/hooks', '/viral'],
  decisions: ['/decision', '/checklist', '/action-plan', '/80-20', '/priorities', '/what-if', '/second-opinion', '/coach-me'],
};

describe('Vivekam Command Registry', () => {
  it('contains all 48 built-in commands across 6 groups without duplicates or omissions', () => {
    expect(BUILT_IN_COMMANDS).toHaveLength(48);
    const ids = new Set(BUILT_IN_COMMANDS.map((c) => c.id));
    const slashes = new Set(BUILT_IN_COMMANDS.map((c) => c.slash.toLowerCase()));
    expect(ids.size).toBe(48);
    expect(slashes.size).toBe(48);

    for (const [group, expectedSlashes] of Object.entries(EXPECTED_BY_GROUP)) {
      const actualSlashes = BUILT_IN_COMMANDS.filter((c) => c.group === group).map((c) => c.slash);
      expect(actualSlashes).toEqual(expectedSlashes);
    }
  });

  it('includes all 7 deal-check commands from the reference sheet', () => {
    const dealCheckCommands = [
      '/realitycheck',
      '/pros-cons',
      '/decision',
      '/second-opinion',
      '/redteam',
      '/no-fluff',
      '/opportunity-cost',
    ];
    const available = new Set(BUILT_IN_COMMANDS.map((c) => c.slash));
    for (const cmd of dealCheckCommands) {
      expect(available.has(cmd)).toBe(true);
    }
  });

  it('parses all 48 commands case-insensitively and includes all 48 in Always-On Setup', () => {
    const compactSetup = buildAlwaysOnSetup(BUILT_IN_COMMANDS, 'compact');
    const detailedSetup = buildAlwaysOnSetup(BUILT_IN_COMMANDS, 'detailed');

    for (const cmd of BUILT_IN_COMMANDS) {
      const parsed = parseMessage(`Test query ${cmd.slash.toLowerCase()}`, BUILT_IN_COMMANDS);
      expect(parsed.commands.map((c) => c.id)).toEqual([cmd.id]);
      expect(compactSetup).toContain(cmd.slash);
      expect(detailedSetup).toContain(cmd.slash);
    }
  });
});

describe('parseMessage', () => {
  it('parses trailing slash commands case-insensitively and strips them from body', () => {
    const res = parseMessage('Explain how UPI works /eli5 /NO-FLUFF', BUILT_IN_COMMANDS);
    expect(res.body).toBe('Explain how UPI works');
    expect(res.commands.map((c) => c.slash)).toEqual(['/ELI5', '/no-fluff']);
    expect(res.unknown).toEqual([]);
  });

  it('parses commands placed anywhere in the text', () => {
    const res = parseMessage('/redteam We want to launch a Kochi cafe in 2 weeks /ROI', BUILT_IN_COMMANDS);
    expect(res.body).toBe('We want to launch a Kochi cafe in 2 weeks');
    expect(res.commands.map((c) => c.slash)).toEqual(['/redteam', '/ROI']);
  });

  it('does not misparse URLs or file paths as slash commands', () => {
    const res = parseMessage(
      'Check https://example.com/redteam and src/debug/app.ts please /code-review',
      BUILT_IN_COMMANDS
    );
    expect(res.body).toBe('Check https://example.com/redteam and src/debug/app.ts please');
    expect(res.commands.map((c) => c.slash)).toEqual(['/code-review']);
    expect(res.unknown).toEqual([]);
  });

  it('records unknown slash tokens without stripping them from the message', () => {
    const res = parseMessage('Review this /nonexistent /tldr', BUILT_IN_COMMANDS);
    expect(res.body).toBe('Review this /nonexistent');
    expect(res.commands.map((c) => c.slash)).toEqual(['/TLDR']);
    expect(res.unknown).toEqual(['/nonexistent']);
  });
});

describe('detectConflicts', () => {
  it('flags conflicting commands and names the last command as the winner', () => {
    const eli5 = BUILT_IN_COMMANDS.find((c) => c.id === 'eli5')!;
    const deepdive = BUILT_IN_COMMANDS.find((c) => c.id === 'deepdive')!;
    const warnings = detectConflicts([eli5, deepdive]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].commandA).toBe('/ELI5');
    expect(warnings[0].commandB).toBe('/deepdive');
    expect(warnings[0].winner).toBe('/deepdive');
  });

  it('returns empty array when commands do not conflict', () => {
    const redteam = BUILT_IN_COMMANDS.find((c) => c.id === 'redteam')!;
    const noFluff = BUILT_IN_COMMANDS.find((c) => c.id === 'no-fluff')!;
    expect(detectConflicts([redteam, noFluff])).toEqual([]);
  });
});

describe('buildSystemInstruction', () => {
  it('includes active directives, priority rule, honesty rule, and Malayalam language rule', () => {
    const redteam = BUILT_IN_COMMANDS.find((c) => c.id === 'redteam')!;
    const instruction = buildSystemInstruction([redteam]);

    expect(instruction).toContain('/redteam');
    expect(instruction).toContain(redteam.directive);
    expect(instruction).toContain('LANGUAGE RULE');
    expect(instruction).toContain('Malayalam');
    expect(instruction).toContain('HONESTY RULE');
    expect(instruction).toContain('MULTI-COMMAND PRIORITY RULE');
  });

  it('applies local command overrides when provided', () => {
    const eli5 = BUILT_IN_COMMANDS.find((c) => c.id === 'eli5')!;
    const customText = 'Explain with a cricket analogy only.';
    const instruction = buildSystemInstruction([eli5], {
      commandOverrides: { eli5: customText },
    });

    expect(instruction).toContain(customText);
    expect(instruction).not.toContain(eli5.directive);
  });
});

describe('buildAlwaysOnSetup', () => {
  it('generates compact one-line-per-group setup including custom commands and excluding disabled ones', () => {
    const customCmd: Command = {
      id: 'custom_1',
      slash: '/kerala',
      group: 'business',
      label: 'Kerala Context',
      shortDescription: 'Use INR and Kerala market context',
      example: 'Price this /kerala',
      malayalamNote: 'കേരള മാർക്കറ്റ്',
      directive: 'Use INR and Kerala realities.',
      tags: ['custom'],
      conflictsWith: [],
      isCustom: true,
    };
    const redteam = BUILT_IN_COMMANDS.find((c) => c.id === 'redteam')!;
    const setup = buildAlwaysOnSetup([redteam, customCmd], 'compact');

    expect(setup).toContain('/redteam');
    expect(setup).toContain('/kerala Use INR and Kerala market context');
    expect(setup).not.toContain('/ELI5');
    expect(setup).toContain('Multi-command:');
    expect(setup).toContain('Honesty:');
  });
});

describe('fuzzyMatchCommands & migrateAppState', () => {
  it('ranks prefix and exact slash matches first', () => {
    const matches = fuzzyMatchCommands('red', BUILT_IN_COMMANDS);
    expect(matches[0].slash).toBe('/redteam');
  });

  it('migrates partial or corrupt state safely to current schemaVersion', () => {
    const migrated = migrateAppState({
      settings: { model: 'invalid-model', theme: 'light' },
      customCommands: [{ id: 'c1', slash: '/test' }],
    });
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.settings.model).toBe('gemini-4-hydrogen');
    expect(migrated.settings.theme).toBe('light');
    expect(migrated.customCommands[0].isCustom).toBe(true);
  });
});

describe('buildChatGptUrl & buildChatGptPrompt', () => {
  it('builds a valid https://chatgpt.com/?q= URL with directives embedded', () => {
    const redteam = BUILT_IN_COMMANDS.find((c) => c.id === 'redteam')!;
    const url = buildChatGptUrl('Launch a cafe in Kochi', [redteam]);
    expect(url.startsWith('https://chatgpt.com/?q=')).toBe(true);
    const decoded = decodeURIComponent(url.replace('https://chatgpt.com/?q=', ''));
    expect(decoded).toContain('Launch a cafe in Kochi');
    expect(decoded).toContain('/redteam');
    expect(decoded).toContain('Vivekam Command Directives');
  });

  it('handles empty user text gracefully when trying a command directly', () => {
    const eli5 = BUILT_IN_COMMANDS.find((c) => c.id === 'eli5')!;
    const prompt = buildChatGptPrompt('', [eli5]);
    expect(prompt).toContain('/ELI5');
    expect(prompt).toContain('Please apply /ELI5');
  });
});
