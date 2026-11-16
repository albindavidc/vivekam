import { create } from 'zustand';
import { BUILT_IN_COMMANDS } from '@/src/data/commands';
import { buildChatGptPrompt, openInChatGpt, resolveCommandsFromSlashes } from '@/src/lib/chatgpt';
import {
  DEFAULT_SETTINGS,
  createInitialState,
  loadAppState,
  parseImportedState,
  sanitizeForExport,
  saveAppState,
} from '@/src/lib/storage';
import type {
  ActiveScreen,
  AppState,
  Command,
  Conversation,
  Message,
  SavedPrompt,
  Settings,
  UserFeedbackEntry,
} from '@/src/types';

export interface ToastItem {
  id: string;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
}

interface VivekamStore extends AppState {
  activeScreen: ActiveScreen;
  toasts: ToastItem[];

  setActiveScreen: (screen: ActiveScreen) => void;
  showToast: (message: string, tone?: ToastItem['tone']) => void;
  dismissToast: (id: string) => void;

  // External ChatGPT redirect for Try buttons
  openPromptInChatGpt: (text: string, commandSlashes?: string[]) => void;

  // Conversations & Messages
  createConversation: (title?: string) => string;
  setActiveConversation: (id: string | null) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
  togglePinConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, patch: Partial<Message>) => void;
  removeMessagesFrom: (conversationId: string, messageId: string) => void;

  // Commands & Favorites
  toggleFavoriteCommand: (commandId: string) => void;
  setCommandOverride: (commandId: string, directive: string | null) => void;
  toggleCommandEnabled: (commandId: string) => void;
  setGroupEnabled: (commandIds: string[], enabled: boolean) => void;
  addCustomCommand: (cmd: Omit<Command, 'id' | 'isCustom'>) => Command;
  updateCustomCommand: (id: string, patch: Partial<Command>) => void;
  deleteCustomCommand: (id: string) => void;

  // Saved Prompts / Answers
  savePromptItem: (item: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>) => SavedPrompt;
  duplicateSavedPrompt: (id: string) => void;
  togglePinSavedPrompt: (id: string) => void;
  deleteSavedPrompt: (id: string) => void;

  // Settings & Feedback
  updateSettings: (patch: Partial<Settings>) => void;
  addUserFeedback: (rating: number, comment: string) => UserFeedbackEntry;
  clearAllData: () => void;
  exportAllJson: () => string;
  importAllJson: (jsonText: string) => void;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const initialPersisted = loadAppState();

function persistFromState(state: AppState) {
  const snapshot: AppState = {
    schemaVersion: state.schemaVersion,
    conversations: state.conversations,
    activeConversationId: state.activeConversationId,
    customCommands: state.customCommands,
    savedPrompts: state.savedPrompts,
    favoriteCommandIds: state.favoriteCommandIds,
    settings: state.settings,
    userFeedback: state.userFeedback,
  };
  saveAppState(snapshot);
}

export const useAppStore = create<VivekamStore>((set, get) => ({
  ...initialPersisted,
  activeScreen: 'explore',
  toasts: [],

  setActiveScreen: (screen) => set({ activeScreen: screen }),

  showToast: (message, tone = 'info') => {
    const id = makeId('toast');
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone }] }));
    setTimeout(() => {
      get().dismissToast(id);
    }, 3000);
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  openPromptInChatGpt: (text, commandSlashes = []) => {
    const state = get();
    const allCmds = [...BUILT_IN_COMMANDS, ...state.customCommands];
    const effectiveSlashes =
      commandSlashes.length > 0 ? commandSlashes : state.settings.defaultCommands;
    const cmds = resolveCommandsFromSlashes(effectiveSlashes, allCmds);
    const fullPrompt = buildChatGptPrompt(text, cmds, state.settings.commandOverrides);
    if (fullPrompt) {
      navigator.clipboard?.writeText(fullPrompt);
    }
    openInChatGpt(text, cmds, state.settings.commandOverrides);
    state.showToast('Opening ChatGPT with your Vivekam prompt', 'success');
  },

  createConversation: (title = 'New Session') => {
    const id = makeId('conv');
    const now = Date.now();
    const conv: Conversation = {
      id,
      title,
      messages: [],
      createdAt: now,
      updatedAt: now,
      pinned: false,
    };
    set((s) => {
      const next = {
        ...s,
        conversations: [conv, ...s.conversations],
        activeConversationId: id,
      };
      persistFromState(next);
      return next;
    });
    return id;
  },

  setActiveConversation: (id) =>
    set((s) => {
      const next = { ...s, activeConversationId: id };
      persistFromState(next);
      return next;
    }),

  renameConversation: (id, title) =>
    set((s) => {
      const clean = title.trim() || 'Untitled Session';
      const next = {
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, title: clean, updatedAt: Date.now() } : c
        ),
      };
      persistFromState(next);
      return next;
    }),

  deleteConversation: (id) =>
    set((s) => {
      const remaining = s.conversations.filter((c) => c.id !== id);
      const nextActive =
        s.activeConversationId === id ? (remaining[0]?.id ?? null) : s.activeConversationId;
      const next = {
        ...s,
        conversations: remaining,
        activeConversationId: nextActive,
      };
      persistFromState(next);
      return next;
    }),

  togglePinConversation: (id) =>
    set((s) => {
      const next = {
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, pinned: !c.pinned } : c
        ),
      };
      persistFromState(next);
      return next;
    }),

  addMessage: (conversationId, message) =>
    set((s) => {
      const next = {
        ...s,
        conversations: s.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          const isFirstUser = c.messages.length === 0 && message.role === 'user';
          const autoTitle =
            isFirstUser && c.title === 'New Session'
              ? message.text.slice(0, 46).trim() + (message.text.length > 46 ? '…' : '')
              : c.title;
          return {
            ...c,
            title: autoTitle,
            messages: [...c.messages, message],
            updatedAt: Date.now(),
          };
        }),
      };
      persistFromState(next);
      return next;
    }),

  updateMessage: (conversationId, messageId, patch) =>
    set((s) => {
      const next = {
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
                updatedAt: Date.now(),
              }
            : c
        ),
      };
      persistFromState(next);
      return next;
    }),

  removeMessagesFrom: (conversationId, messageId) =>
    set((s) => {
      const next = {
        ...s,
        conversations: s.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          const idx = c.messages.findIndex((m) => m.id === messageId);
          if (idx === -1) return c;
          return {
            ...c,
            messages: c.messages.slice(0, idx),
            updatedAt: Date.now(),
          };
        }),
      };
      persistFromState(next);
      return next;
    }),

  toggleFavoriteCommand: (commandId) =>
    set((s) => {
      const exists = s.favoriteCommandIds.includes(commandId);
      const favoriteCommandIds = exists
        ? s.favoriteCommandIds.filter((id) => id !== commandId)
        : [...s.favoriteCommandIds, commandId];
      const next = { ...s, favoriteCommandIds };
      persistFromState(next);
      return next;
    }),

  setCommandOverride: (commandId, directive) =>
    set((s) => {
      const overrides = { ...s.settings.commandOverrides };
      if (!directive || !directive.trim()) {
        delete overrides[commandId];
      } else {
        overrides[commandId] = directive.trim();
      }
      const next = {
        ...s,
        settings: { ...s.settings, commandOverrides: overrides },
      };
      persistFromState(next);
      return next;
    }),

  toggleCommandEnabled: (commandId) =>
    set((s) => {
      const disabled = new Set(s.settings.disabledCommands);
      if (disabled.has(commandId)) disabled.delete(commandId);
      else disabled.add(commandId);
      const next = {
        ...s,
        settings: { ...s.settings, disabledCommands: Array.from(disabled) },
      };
      persistFromState(next);
      return next;
    }),

  setGroupEnabled: (commandIds, enabled) =>
    set((s) => {
      const disabled = new Set(s.settings.disabledCommands);
      for (const id of commandIds) {
        if (enabled) disabled.delete(id);
        else disabled.add(id);
      }
      const next = {
        ...s,
        settings: { ...s.settings, disabledCommands: Array.from(disabled) },
      };
      persistFromState(next);
      return next;
    }),

  addCustomCommand: (cmdInput) => {
    const newCmd: Command = {
      ...cmdInput,
      id: makeId('custom'),
      isCustom: true,
    };
    set((s) => {
      const next = {
        ...s,
        customCommands: [newCmd, ...s.customCommands],
      };
      persistFromState(next);
      return next;
    });
    return newCmd;
  },

  updateCustomCommand: (id, patch) =>
    set((s) => {
      const next = {
        ...s,
        customCommands: s.customCommands.map((c) =>
          c.id === id ? { ...c, ...patch, isCustom: true } : c
        ),
      };
      persistFromState(next);
      return next;
    }),

  deleteCustomCommand: (id) =>
    set((s) => {
      const next = {
        ...s,
        customCommands: s.customCommands.filter((c) => c.id !== id),
        favoriteCommandIds: s.favoriteCommandIds.filter((f) => f !== id),
      };
      persistFromState(next);
      return next;
    }),

  savePromptItem: (item) => {
    const now = Date.now();
    const saved: SavedPrompt = {
      ...item,
      id: makeId('saved'),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const next = { ...s, savedPrompts: [saved, ...s.savedPrompts] };
      persistFromState(next);
      return next;
    });
    return saved;
  },

  duplicateSavedPrompt: (id) =>
    set((s) => {
      const src = s.savedPrompts.find((p) => p.id === id);
      if (!src) return s;
      const now = Date.now();
      const copy: SavedPrompt = {
        ...src,
        id: makeId('saved'),
        title: `${src.title} (Copy)`,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };
      const next = { ...s, savedPrompts: [copy, ...s.savedPrompts] };
      persistFromState(next);
      return next;
    }),

  togglePinSavedPrompt: (id) =>
    set((s) => {
      const next = {
        ...s,
        savedPrompts: s.savedPrompts.map((p) =>
          p.id === id ? { ...p, pinned: !p.pinned, updatedAt: Date.now() } : p
        ),
      };
      persistFromState(next);
      return next;
    }),

  deleteSavedPrompt: (id) =>
    set((s) => {
      const next = {
        ...s,
        savedPrompts: s.savedPrompts.filter((p) => p.id !== id),
      };
      persistFromState(next);
      return next;
    }),

  updateSettings: (patch) =>
    set((s) => {
      const next = {
        ...s,
        settings: { ...s.settings, ...patch },
      };
      persistFromState(next);
      return next;
    }),

  addUserFeedback: (rating, comment) => {
    const entry: UserFeedbackEntry = {
      id: makeId('fb'),
      rating,
      comment: comment.trim(),
      createdAt: Date.now(),
    };
    set((s) => {
      const next = { ...s, userFeedback: [entry, ...s.userFeedback] };
      persistFromState(next);
      return next;
    });
    return entry;
  },

  clearAllData: () => {
    const fresh = createInitialState();
    set({
      ...fresh,
      settings: { ...DEFAULT_SETTINGS },
    });
    persistFromState(fresh);
  },

  exportAllJson: () => {
    const s = get();
    return sanitizeForExport({
      schemaVersion: s.schemaVersion,
      conversations: s.conversations,
      activeConversationId: s.activeConversationId,
      customCommands: s.customCommands,
      savedPrompts: s.savedPrompts,
      favoriteCommandIds: s.favoriteCommandIds,
      settings: s.settings,
      userFeedback: s.userFeedback,
    });
  },

  importAllJson: (jsonText) => {
    const migrated = parseImportedState(jsonText);
    set((s) => {
      const next = { ...s, ...migrated };
      persistFromState(next);
      return next;
    });
  },
}));

export function useAllCommands(): Command[] {
  const customCommands = useAppStore((s) => s.customCommands);
  return [...BUILT_IN_COMMANDS, ...customCommands];
}
