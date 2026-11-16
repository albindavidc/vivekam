export type CommandGroupId =
  | 'learn'
  | 'feedback'
  | 'coding'
  | 'business'
  | 'writing'
  | 'decisions'
  | 'sales';

export type CommandLibraryFilter = 'all' | 'favorites' | CommandGroupId;

export interface SalesCommandMeta {
  commandId: string;
  slash: string;
  dealSummary: string;
  dealExample: string;
}

export interface CommandGroupMeta {
  id: CommandGroupId;
  name: string;
  nameMl: string;
  description: string;
  accentHex: string;
  accentTextClass: string;
  accentBorderClass: string;
  accentBgClass: string;
  dotClass: string;
}

export interface Command {
  id: string;
  slash: string;
  group: CommandGroupId;
  label: string;
  shortDescription: string;
  example: string;
  malayalamNote: string;
  directive: string;
  tags: string[];
  conflictsWith: string[];
  isCustom: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  commandsUsed: string[];
  model?: string;
  createdAt: number;
  rating?: 'up' | 'down';
  systemInstructionSnapshot?: string;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  commands: string[];
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  type: 'prompt' | 'answer';
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  role: string;
  context: string;
  task: string;
  constraints: string;
  outputFormat: string;
  tone: string;
  examples: string;
  suggestedCommands: string[];
}

export interface AnalyzerResult {
  scores: {
    clarity: number;
    context: number;
    specificity: number;
    constraints: number;
    outputFormat: number;
    safety: number;
  };
  overallScore: number;
  summary: string;
  issues: Array<{
    area: string;
    issue: string;
    fix: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  improvedPrompt: string;
  suggestedCommands: Array<{
    slash: string;
    reason: string;
  }>;
}

export interface FeedbackReport {
  verdict: string;
  verdictType: 'proceed' | 'revise' | 'rethink' | 'strong';
  confidence: 'low' | 'medium' | 'high';
  confidenceReason: string;
  biggestRisks: Array<{
    risk: string;
    severity: 'high' | 'medium' | 'low';
    likelihood: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
  hiddenAssumptions: string[];
  whatIsGood: string[];
  nextSteps: string[];
}

export type ThinkingPreset = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Settings {
  model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite' | 'gemini-4-argon' | 'gemini-4-carbon';
  thinkingLevel: ThinkingPreset;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  historyWindow: number;
  defaultCommands: string[];
  disabledCommands: string[];
  commandOverrides: Record<string, string>;
  language: 'en' | 'ml';
  theme: 'dark' | 'light' | 'system';
  reduceMotion: boolean;
}

export interface UserFeedbackEntry {
  id: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export type ActiveScreen =
  | 'explore'
  | 'library-commands'
  | 'feedback-studio'
  | 'builder'
  | 'analyzer'
  | 'setup'
  | 'my-library'
  | 'custom-commands'
  | 'settings'
  | 'help';

export interface AppState {
  schemaVersion: number;
  conversations: Conversation[];
  activeConversationId: string | null;
  customCommands: Command[];
  savedPrompts: SavedPrompt[];
  favoriteCommandIds: string[];
  settings: Settings;
  userFeedback: UserFeedbackEntry[];
}
