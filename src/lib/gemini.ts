import type { ThinkingPreset } from '@/src/types';

export type GeminiErrorKind =
  | 'auth'
  | 'quota'
  | 'safety'
  | 'network'
  | 'empty'
  | 'validation'
  | 'aborted'
  | 'unknown';

export class GeminiError extends Error {
  readonly kind: GeminiErrorKind;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(kind: GeminiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'GeminiError';
    this.kind = kind;
    this.status = status;
    this.retryable = kind === 'quota' || kind === 'network' || kind === 'empty';
  }
}

export function getFriendlyErrorMessage(err: unknown): {
  title: string;
  description: string;
  suggestion: string;
  retryable: boolean;
  kind: GeminiErrorKind;
} {
  if (err instanceof GeminiError) {
    switch (err.kind) {
      case 'auth':
        return {
          title: 'API key check needed',
          description: err.message,
          suggestion: 'Open Settings > Secrets in AI Studio to verify GEMINI_API_KEY.',
          retryable: false,
          kind: err.kind,
        };
      case 'quota':
        return {
          title: 'Rate limit reached',
          description: err.message,
          suggestion: 'Wait a few seconds and retry, or switch to gemini-3.1-flash-lite in Settings.',
          retryable: true,
          kind: err.kind,
        };
      case 'safety':
        return {
          title: 'Blocked by safety filter',
          description: err.message,
          suggestion: 'Rephrase sensitive terms neutrally or focus on the constructive question.',
          retryable: false,
          kind: err.kind,
        };
      case 'network':
        return {
          title: 'Connection hiccup',
          description: err.message,
          suggestion: 'Check your connection and tap Retry.',
          retryable: true,
          kind: err.kind,
        };
      case 'empty':
        return {
          title: 'Empty response',
          description: err.message,
          suggestion: 'Add a bit more context to your prompt and try again.',
          retryable: true,
          kind: err.kind,
        };
      case 'validation':
        return {
          title: 'Structured output mismatch',
          description: err.message,
          suggestion: 'Retry once or simplify the pasted text.',
          retryable: true,
          kind: err.kind,
        };
      case 'aborted':
        return {
          title: 'Generation stopped',
          description: 'You stopped this response early.',
          suggestion: 'Edit your message or send again anytime.',
          retryable: false,
          kind: err.kind,
        };
      default:
        return {
          title: 'Something went wrong',
          description: err.message,
          suggestion: 'Try again or check Settings if the issue persists.',
          retryable: true,
          kind: err.kind,
        };
    }
  }

  const msg = err instanceof Error ? err.message : 'Unexpected error occurred.';
  return {
    title: 'Request failed',
    description: msg,
    suggestion: 'Please retry in a moment.',
    retryable: true,
    kind: 'unknown',
  };
}

function mapCodeToKind(code?: string, status?: number): GeminiErrorKind {
  if (code === 'auth' || status === 401 || status === 403) return 'auth';
  if (code === 'quota' || status === 429) return 'quota';
  if (code === 'safety') return 'safety';
  if (code === 'empty') return 'empty';
  if (code === 'validation') return 'validation';
  if (code === 'network' || (status !== undefined && status >= 500)) return 'network';
  return 'unknown';
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new GeminiError('aborted', 'Request cancelled by user.'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new GeminiError('aborted', 'Request cancelled by user.'));
      },
      { once: true }
    );
  });
}

export interface StreamChatParams {
  model: string;
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> | string;
  systemInstruction: string;
  thinkingLevel?: ThinkingPreset;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  onChunk: (chunkText: string, fullText: string) => void;
}

export async function streamChat(params: StreamChatParams): Promise<string> {
  const maxAttempts = 3;
  let lastErr: GeminiError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (params.signal?.aborted) {
      throw new GeminiError('aborted', 'Generation stopped.');
    }

    if (attempt > 0) {
      const backoffMs = Math.min(4000, 600 * Math.pow(2, attempt - 1));
      await sleep(backoffMs, params.signal);
    }

    try {
      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: params.signal,
        body: JSON.stringify({
          model: params.model,
          contents: params.contents,
          systemInstruction: params.systemInstruction,
          thinkingLevel: params.thinkingLevel,
          maxOutputTokens: params.maxOutputTokens,
        }),
      });

      if (!response.ok || !response.body) {
        const kind = mapCodeToKind(undefined, response.status);
        throw new GeminiError(kind, `Server responded with status ${response.status}`, response.status);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const payloadStr = line.slice(5).trim();
          if (!payloadStr) continue;

          let parsed: { text?: string; done?: boolean; error?: { code?: string; message?: string; status?: number } };
          try {
            parsed = JSON.parse(payloadStr);
          } catch {
            continue;
          }

          if (parsed.error) {
            const kind = mapCodeToKind(parsed.error.code, parsed.error.status);
            throw new GeminiError(
              kind,
              parsed.error.message || 'Gemini returned an error.',
              parsed.error.status
            );
          }

          if (parsed.text) {
            fullText += parsed.text;
            params.onChunk(parsed.text, fullText);
          }
        }
      }

      if (!fullText.trim()) {
        throw new GeminiError('empty', 'Gemini returned an empty response.');
      }

      return fullText;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new GeminiError('aborted', 'Generation stopped.');
      }
      const gErr =
        err instanceof GeminiError
          ? err
          : new GeminiError('network', err instanceof Error ? err.message : 'Network error');

      lastErr = gErr;

      const shouldRetry =
        attempt < maxAttempts - 1 &&
        (gErr.kind === 'quota' || gErr.kind === 'network') &&
        !params.signal?.aborted;

      if (!shouldRetry) {
        throw gErr;
      }
    }
  }

  throw lastErr ?? new GeminiError('unknown', 'Failed to stream response.');
}

export interface GenerateJSONParams<T> {
  model: string;
  contents: string;
  systemInstruction: string;
  responseSchema: unknown;
  thinkingLevel?: ThinkingPreset;
  signal?: AbortSignal;
  validator: (value: unknown) => value is T;
}

export async function generateJSON<T>(params: GenerateJSONParams<T>): Promise<T> {
  const maxAttempts = 2;
  let lastErr: GeminiError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (params.signal?.aborted) {
      throw new GeminiError('aborted', 'Request cancelled.');
    }

    if (attempt > 0) {
      await sleep(700, params.signal);
    }

    try {
      const response = await fetch('/api/gemini/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: params.signal,
        body: JSON.stringify({
          model: params.model,
          contents: params.contents,
          systemInstruction: params.systemInstruction,
          responseSchema: params.responseSchema,
          thinkingLevel: params.thinkingLevel,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        data?: unknown;
        error?: { code?: string; message?: string; status?: number };
      };

      if (!response.ok || body.error) {
        const kind = mapCodeToKind(body.error?.code, body.error?.status ?? response.status);
        throw new GeminiError(
          kind,
          body.error?.message || `Request failed (${response.status})`,
          body.error?.status ?? response.status
        );
      }

      if (!params.validator(body.data)) {
        throw new GeminiError(
          'validation',
          'Response JSON did not match the expected structure.'
        );
      }

      return body.data;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new GeminiError('aborted', 'Request cancelled.');
      }
      const gErr =
        err instanceof GeminiError
          ? err
          : new GeminiError('network', err instanceof Error ? err.message : 'Network error');

      lastErr = gErr;

      const shouldRetry =
        attempt < maxAttempts - 1 &&
        (gErr.kind === 'validation' || gErr.kind === 'quota' || gErr.kind === 'network') &&
        !params.signal?.aborted;

      if (!shouldRetry) {
        throw gErr;
      }
    }
  }

  throw lastErr ?? new GeminiError('unknown', 'Failed to generate structured response.');
}
