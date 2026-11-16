import { describe, expect, it } from 'vitest';
import { BUILT_IN_COMMANDS } from '@/src/data/commands';
import {
  buildAlwaysOnSetup,
  buildSystemInstruction,
  detectConflicts,
  fuzzyMatchCommands,
  parseMessage,
} from '@/src/lib/commandEngine';
import { CURRENT_SCHEMA_VERSION, migrateAppState } from '@/src/lib/storage';
import type { Command } from '@/src/types';

describe('Srishti Command Registry', () => {
  it('contains all 48 built-in commands across 6 groups', () => {
    expect(BUILT_IN_COMMANDS).toHaveLength(48);
    const groups = new Set(BUILT_IN_COMMANDS.map((c) => c.group));
    expect(groups.size).toBe(6);
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
