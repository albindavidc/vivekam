import type { AppState, Command, Conversation, SavedPrompt, Settings, UserFeedbackEntry } from '@/src/types';

export const STORAGE_KEY = 'srishti_app_state';
export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  model: 'gemini-4-hydrogen',
  thinkingLevel: 'MEDIUM',
  temperature: 0.7,
  topP: 0.95,
  maxOutputTokens: 2048,
  historyWindow: 10,
  defaultCommands: [],
  disabledCommands: [],
  commandOverrides: {},
  language: 'en',
  theme: 'dark',
  reduceMotion: false,
};

export function createInitialState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    conversations: [],
    activeConversationId: null,
    customCommands: [],
    savedPrompts: [],
    favoriteCommandIds: ['redteam', 'eli5', 'tldr'],
    settings: { ...DEFAULT_SETTINGS },
    userFeedback: [],
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function migrateAppState(raw: unknown): AppState {
  const fallback = createInitialState();
  if (!isObject(raw)) return fallback;

  const rawSettings = isObject(raw.settings) ? raw.settings : {};
  const allowedModels = new Set([
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
    'gemini-4-argon',
    'gemini-4-carbon',
  ]);

  const modelVal =
    typeof rawSettings.model === 'string' && allowedModels.has(rawSettings.model)
      ? (rawSettings.model as Settings['model'])
      : DEFAULT_SETTINGS.model;

  const thinkingVal =
    rawSettings.thinkingLevel === 'LOW' ||
    rawSettings.thinkingLevel === 'MEDIUM' ||
    rawSettings.thinkingLevel === 'HIGH'
      ? rawSettings.thinkingLevel
      : DEFAULT_SETTINGS.thinkingLevel;

  const settings: Settings = {
    model: modelVal,
    thinkingLevel: thinkingVal,
    temperature:
      typeof rawSettings.temperature === 'number'
        ? Math.min(2, Math.max(0, rawSettings.temperature))
        : DEFAULT_SETTINGS.temperature,
    topP:
      typeof rawSettings.topP === 'number'
        ? Math.min(1, Math.max(0.1, rawSettings.topP))
        : DEFAULT_SETTINGS.topP,
    maxOutputTokens:
      typeof rawSettings.maxOutputTokens === 'number'
        ? Math.min(8192, Math.max(256, rawSettings.maxOutputTokens))
        : DEFAULT_SETTINGS.maxOutputTokens,
    historyWindow:
      typeof rawSettings.historyWindow === 'number'
        ? Math.min(30, Math.max(2, rawSettings.historyWindow))
        : DEFAULT_SETTINGS.historyWindow,
    defaultCommands: Array.isArray(rawSettings.defaultCommands)
      ? rawSettings.defaultCommands.filter((x): x is string => typeof x === 'string')
      : [],
    disabledCommands: Array.isArray(rawSettings.disabledCommands)
      ? rawSettings.disabledCommands.filter((x): x is string => typeof x === 'string')
      : [],
    commandOverrides: isObject(rawSettings.commandOverrides)
      ? Object.fromEntries(
          Object.entries(rawSettings.commandOverrides).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string'
          )
        )
      : {},
    language: rawSettings.language === 'ml' ? 'ml' : 'en',
    theme:
      rawSettings.theme === 'light' || rawSettings.theme === 'dark' || rawSettings.theme === 'system'
        ? rawSettings.theme
        : DEFAULT_SETTINGS.theme,
    reduceMotion: Boolean(rawSettings.reduceMotion),
  };

  const conversations: Conversation[] = Array.isArray(raw.conversations)
    ? raw.conversations.filter(
        (c): c is Conversation =>
          isObject(c) && typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages)
      )
    : [];

  const customCommands: Command[] = Array.isArray(raw.customCommands)
    ? raw.customCommands
        .filter((c): c is Command => isObject(c) && typeof c.id === 'string' && typeof c.slash === 'string')
        .map((c) => ({ ...c, isCustom: true }))
    : [];

  const savedPrompts: SavedPrompt[] = Array.isArray(raw.savedPrompts)
    ? raw.savedPrompts.filter(
        (p): p is SavedPrompt => isObject(p) && typeof p.id === 'string' && typeof p.content === 'string'
      )
    : [];

  const favoriteCommandIds = Array.isArray(raw.favoriteCommandIds)
    ? raw.favoriteCommandIds.filter((x): x is string => typeof x === 'string')
    : fallback.favoriteCommandIds;

  const userFeedback: UserFeedbackEntry[] = Array.isArray(raw.userFeedback)
    ? raw.userFeedback.filter(
        (f): f is UserFeedbackEntry => isObject(f) && typeof f.id === 'string' && typeof f.rating === 'number'
      )
    : [];

  const activeConversationId =
    typeof raw.activeConversationId === 'string' &&
    conversations.some((c) => c.id === raw.activeConversationId)
      ? raw.activeConversationId
      : conversations[0]?.id ?? null;

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    conversations,
    activeConversationId,
    customCommands,
    savedPrompts,
    favoriteCommandIds,
    settings,
    userFeedback,
  };
}

export function loadAppState(): AppState {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createInitialState();
    }
    const rawStr = window.localStorage.getItem(STORAGE_KEY);
    if (!rawStr) return createInitialState();
    const parsed = JSON.parse(rawStr);
    return migrateAppState(parsed);
  } catch {
    return createInitialState();
  }
}

export function saveAppState(state: AppState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function sanitizeForExport(state: AppState): string {
  const safeCopy = {
    schemaVersion: state.schemaVersion,
    exportedAt: new Date().toISOString(),
    conversations: state.conversations,
    customCommands: state.customCommands,
    savedPrompts: state.savedPrompts,
    favoriteCommandIds: state.favoriteCommandIds,
    settings: state.settings,
    userFeedback: state.userFeedback,
  };
  return JSON.stringify(safeCopy, null, 2);
}

export function parseImportedState(jsonText: string): AppState {
  const parsed = JSON.parse(jsonText);
  return migrateAppState(parsed);
}
