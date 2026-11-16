import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ALLOWED_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-4-argon',
  'gemini-4-carbon',
]);

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('GEMINI_API_KEY is not configured in server environment.'), {
      status: 401,
      code: 'AUTH_MISSING',
    });
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function resolveModel(requested?: string): string {
  if (requested && ALLOWED_MODELS.has(requested)) {
    return requested;
  }
  return 'gemini-4-hydrogen';
}

function resolveThinkingLevel(level?: string, model?: string): ThinkingLevel | undefined {
  if (!level) return undefined;
  const upper = level.toUpperCase();
  if (model === 'gemini-3.1-flash-lite') {
    if (upper === 'MINIMAL' || upper === 'LOW') return ThinkingLevel.MINIMAL;
    return ThinkingLevel.LOW;
  }
  if (upper === 'LOW') return ThinkingLevel.LOW;
  if (upper === 'MEDIUM') return ThinkingLevel.MEDIUM;
  if (upper === 'HIGH') return ThinkingLevel.HIGH;
  return undefined;
}

function classifyServerError(err: unknown): { status: number; code: string; message: string } {
  const anyErr = err as { status?: number; code?: string; message?: string };
  const msg = anyErr?.message || 'Unexpected error communicating with Gemini.';
  const lower = msg.toLowerCase();

  if (anyErr?.code === 'AUTH_MISSING' || anyErr?.status === 401 || anyErr?.status === 403 || lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('api key')) {
    return {
      status: anyErr?.status || 401,
      code: 'auth',
      message: 'Authentication failed. Check your GEMINI_API_KEY in the Settings > Secrets panel.',
    };
  }
  if (anyErr?.status === 429 || lower.includes('resource_exhausted') || lower.includes('quota') || lower.includes('rate limit')) {
    return {
      status: 429,
      code: 'quota',
      message: 'Rate limit or quota reached. Please wait a moment and retry, or check your quota in Settings > Secrets.',
    };
  }
  if (lower.includes('safety') || lower.includes('blocked') || lower.includes('prohibited')) {
    return {
      status: 400,
      code: 'safety',
      message: 'The request or response was blocked by safety filters. Try rephrasing with neutral wording.',
    };
  }
  if (anyErr?.status && anyErr.status >= 500) {
    return {
      status: anyErr.status,
      code: 'network',
      message: 'Gemini service is temporarily unavailable. Please retry in a few seconds.',
    };
  }
  return {
    status: anyErr?.status || 500,
    code: 'unknown',
    message: msg,
  };
}

function convertSchemaTypes(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(convertSchemaTypes);
  const record = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (k === 'type' && typeof v === 'string') {
      const upper = v.toUpperCase();
      if (upper in Type) {
        out[k] = Type[upper as keyof typeof Type];
      } else {
        out[k] = v;
      }
    } else if (k === 'properties' && v && typeof v === 'object') {
      const propsOut: Record<string, unknown> = {};
      for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) {
        propsOut[pk] = convertSchemaTypes(pv);
      }
      out[k] = propsOut;
    } else if (k === 'items') {
      out[k] = convertSchemaTypes(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, hasKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  app.post('/api/gemini/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    try {
      const { model: reqModel, contents, systemInstruction, thinkingLevel, maxOutputTokens } = req.body as {
        model?: string;
        contents?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> | string;
        systemInstruction?: string;
        thinkingLevel?: string;
        maxOutputTokens?: number;
      };

      const ai = getAIClient();
      const model = resolveModel(reqModel);
      const resolvedThinking = resolveThinkingLevel(thinkingLevel, model);

      const config: Record<string, unknown> = {};
      if (systemInstruction && systemInstruction.trim()) {
        config.systemInstruction = systemInstruction;
      }
      if (resolvedThinking) {
        config.thinkingConfig = { thinkingLevel: resolvedThinking };
      }
      if (typeof maxOutputTokens === 'number' && maxOutputTokens > 0) {
        config.maxOutputTokens = maxOutputTokens;
      }

      const stream = await ai.models.generateContentStream({
        model,
        contents: contents || '',
        config,
      });

      let emittedText = false;
      for await (const chunk of stream) {
        if (closed) break;
        const finishReason = chunk.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT' || finishReason === 'BLOCKLIST') {
          res.write(`data: ${JSON.stringify({ error: { code: 'safety', message: 'Response stopped by safety filters. Try rephrasing your prompt more neutrally.', status: 400 } })}\n\n`);
          res.end();
          return;
        }
        const text = chunk.text;
        if (text) {
          emittedText = true;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      if (!closed) {
        if (!emittedText) {
          res.write(`data: ${JSON.stringify({ error: { code: 'empty', message: 'The model returned an empty response. Try adding more detail or retrying.', status: 200 } })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        }
        res.end();
      }
    } catch (err) {
      if (!closed) {
        const classified = classifyServerError(err);
        res.write(`data: ${JSON.stringify({ error: classified })}\n\n`);
        res.end();
      }
    }
  });

  app.post('/api/gemini/json', async (req, res) => {
    try {
      const { model: reqModel, contents, systemInstruction, responseSchema, thinkingLevel } = req.body as {
        model?: string;
        contents?: string;
        systemInstruction?: string;
        responseSchema?: unknown;
        thinkingLevel?: string;
      };

      const ai = getAIClient();
      const model = resolveModel(reqModel);
      const resolvedThinking = resolveThinkingLevel(thinkingLevel, model);

      const config: Record<string, unknown> = {
        responseMimeType: 'application/json',
      };
      if (systemInstruction && systemInstruction.trim()) {
        config.systemInstruction = systemInstruction;
      }
      if (responseSchema) {
        config.responseSchema = convertSchemaTypes(responseSchema);
      }
      if (resolvedThinking) {
        config.thinkingConfig = { thinkingLevel: resolvedThinking };
      }

      const response = await ai.models.generateContent({
        model,
        contents: contents || '',
        config,
      });

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT' || finishReason === 'BLOCKLIST') {
        res.status(400).json({
          error: {
            code: 'safety',
            message: 'Content was blocked by safety filters. Please rephrase and try again.',
            status: 400,
          },
        });
        return;
      }

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: {
            code: 'empty',
            message: 'Model returned an empty JSON response.',
            status: 502,
          },
        });
        return;
      }

      try {
        const parsed = JSON.parse(rawText);
        res.json({ data: parsed, rawText });
      } catch {
        res.status(502).json({
          error: {
            code: 'validation',
            message: 'Model returned malformed JSON.',
            status: 502,
          },
          rawText,
        });
      }
    } catch (err) {
      const classified = classifyServerError(err);
      res.status(classified.status).json({ error: classified });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Srishti server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
