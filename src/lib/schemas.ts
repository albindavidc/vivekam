import type { AnalyzerResult, FeedbackReport } from '@/src/types';

export const FEEDBACK_REPORT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdict: { type: 'STRING', description: 'Direct 2-3 sentence overall verdict with zero fluff.' },
    verdictType: {
      type: 'STRING',
      description: 'One of: proceed, revise, rethink, strong',
    },
    confidence: {
      type: 'STRING',
      description: 'One of: low, medium, high',
    },
    confidenceReason: {
      type: 'STRING',
      description: 'Brief note on why confidence is low, medium, or high based on supplied detail.',
    },
    biggestRisks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          risk: { type: 'STRING' },
          severity: { type: 'STRING', description: 'high, medium, or low' },
          likelihood: { type: 'STRING', description: 'high, medium, or low' },
          mitigation: { type: 'STRING' },
        },
        required: ['risk', 'severity', 'likelihood', 'mitigation'],
      },
    },
    hiddenAssumptions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    whatIsGood: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    nextSteps: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: [
    'verdict',
    'verdictType',
    'confidence',
    'confidenceReason',
    'biggestRisks',
    'hiddenAssumptions',
    'whatIsGood',
    'nextSteps',
  ],
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeLevel(v: unknown): 'high' | 'medium' | 'low' {
  if (typeof v !== 'string') return 'medium';
  const lower = v.toLowerCase();
  if (lower === 'high' || lower === 'low' || lower === 'medium') return lower;
  return 'medium';
}

export function isFeedbackReport(v: unknown): v is FeedbackReport {
  if (!isObject(v)) return false;
  if (typeof v.verdict !== 'string' || !v.verdict.trim()) return false;
  if (!Array.isArray(v.biggestRisks)) return false;
  if (!Array.isArray(v.hiddenAssumptions)) return false;
  if (!Array.isArray(v.whatIsGood)) return false;
  if (!Array.isArray(v.nextSteps)) return false;

  // Normalize optional enum fields safely in-place for strict UI typing
  const vt = typeof v.verdictType === 'string' ? v.verdictType.toLowerCase() : 'revise';
  v.verdictType = ['proceed', 'revise', 'rethink', 'strong'].includes(vt) ? vt : 'revise';
  v.confidence = normalizeLevel(v.confidence);
  if (typeof v.confidenceReason !== 'string') {
    v.confidenceReason = 'Based on the context provided.';
  }

  for (const r of v.biggestRisks) {
    if (!isObject(r) || typeof r.risk !== 'string' || typeof r.mitigation !== 'string') {
      return false;
    }
    r.severity = normalizeLevel(r.severity);
    r.likelihood = normalizeLevel(r.likelihood);
  }

  return true;
}

export const ANALYZER_RESULT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    scores: {
      type: 'OBJECT',
      properties: {
        clarity: { type: 'NUMBER' },
        context: { type: 'NUMBER' },
        specificity: { type: 'NUMBER' },
        constraints: { type: 'NUMBER' },
        outputFormat: { type: 'NUMBER' },
        safety: { type: 'NUMBER' },
      },
      required: ['clarity', 'context', 'specificity', 'constraints', 'outputFormat', 'safety'],
    },
    overallScore: { type: 'NUMBER' },
    summary: { type: 'STRING' },
    issues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          area: { type: 'STRING' },
          issue: { type: 'STRING' },
          fix: { type: 'STRING' },
          severity: { type: 'STRING', description: 'low, medium, or high' },
        },
        required: ['area', 'issue', 'fix', 'severity'],
      },
    },
    improvedPrompt: { type: 'STRING' },
    suggestedCommands: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          slash: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['slash', 'reason'],
      },
    },
  },
  required: ['scores', 'overallScore', 'summary', 'issues', 'improvedPrompt', 'suggestedCommands'],
};

function clampScore(n: unknown): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 5;
  return Math.round(Math.min(10, Math.max(0, n)) * 10) / 10;
}

export function isAnalyzerResult(v: unknown): v is AnalyzerResult {
  if (!isObject(v)) return false;
  if (!isObject(v.scores)) return false;
  if (typeof v.improvedPrompt !== 'string' || !v.improvedPrompt.trim()) return false;
  if (!Array.isArray(v.issues) || !Array.isArray(v.suggestedCommands)) return false;

  v.scores.clarity = clampScore(v.scores.clarity);
  v.scores.context = clampScore(v.scores.context);
  v.scores.specificity = clampScore(v.scores.specificity);
  v.scores.constraints = clampScore(v.scores.constraints);
  v.scores.outputFormat = clampScore(v.scores.outputFormat);
  v.scores.safety = clampScore(v.scores.safety);

  const avg =
    (Number(v.scores.clarity) +
      Number(v.scores.context) +
      Number(v.scores.specificity) +
      Number(v.scores.constraints) +
      Number(v.scores.outputFormat) +
      Number(v.scores.safety)) /
    6;
  v.overallScore = Math.round(avg * 10) / 10;
  if (typeof v.summary !== 'string') v.summary = '';

  for (const item of v.issues) {
    if (!isObject(item) || typeof item.issue !== 'string' || typeof item.fix !== 'string') {
      return false;
    }
    item.area = typeof item.area === 'string' ? item.area : 'General';
    item.severity = normalizeLevel(item.severity);
  }

  for (const cmd of v.suggestedCommands) {
    if (!isObject(cmd) || typeof cmd.slash !== 'string' || typeof cmd.reason !== 'string') {
      return false;
    }
  }

  return true;
}

export const IMPROVED_BUILDER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    role: { type: 'STRING' },
    context: { type: 'STRING' },
    task: { type: 'STRING' },
    constraints: { type: 'STRING' },
    outputFormat: { type: 'STRING' },
    tone: { type: 'STRING' },
    rationale: { type: 'STRING' },
  },
  required: ['role', 'context', 'task', 'constraints', 'outputFormat', 'tone', 'rationale'],
};

export interface ImprovedBuilderOutput {
  role: string;
  context: string;
  task: string;
  constraints: string;
  outputFormat: string;
  tone: string;
  rationale: string;
}

export function isImprovedBuilderOutput(v: unknown): v is ImprovedBuilderOutput {
  if (!isObject(v)) return false;
  return (
    typeof v.role === 'string' &&
    typeof v.task === 'string' &&
    typeof v.constraints === 'string' &&
    typeof v.outputFormat === 'string'
  );
}
