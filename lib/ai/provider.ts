/**
 * AI provider abstraction.
 *
 * Master plan §76: "AI provider UI/component kodunun içine doğrudan
 * gömülmemelidir." Master plan §93: "AI çalışmazsa ürün çalışmaya
 * devam etmelidir."
 *
 * - provider.ts       — interface + factory
 * - matching-explanation.ts — narration over a deterministic match
 * - project-plan.ts  — extract structure from a long description
 * - weekly-summary.ts — turn updates/tasks into a digest
 * - gap-analysis.ts   — recommend a missing role
 *
 * Default provider is `mock` (deterministic, offline, safe). Real providers
 * (openai, anthropic) are pluggable; the API surface is small.
 */

import { getEnv } from '@/lib/env';

export type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface AiCompletionRequest {
  messages: AiMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export interface AiCompletionResult {
  text: string;
  provider: string;
  model: string;
  cached: boolean;
}

export interface AiProvider {
  name: string;
  complete(req: AiCompletionRequest): Promise<AiCompletionResult>;
}

// ---------------------------------------------------------------------------
// Mock provider — deterministic, offline, safe. Always available.
// ---------------------------------------------------------------------------

class MockProvider implements AiProvider {
  name = 'mock';
  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    // The mock is a *placeholder*: it does not invent content. UI code is
    // expected to fall back to deterministic templates if the provider is mock.
    const last = req.messages[req.messages.length - 1]?.content ?? '';
    const text = `__MOCK__\n${last.slice(0, 200)}`;
    return { text, provider: this.name, model: 'mock-1', cached: false };
  }
}

// ---------------------------------------------------------------------------
// OpenAI provider (kept minimal — used when AI_API_KEY is present)
// ---------------------------------------------------------------------------

class OpenAIProvider implements AiProvider {
  name = 'openai';
  constructor(
    private apiKey: string,
    private defaultModel: string,
  ) {}
  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const model = req.model ?? this.defaultModel;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: req.messages,
        max_tokens: req.maxTokens ?? 600,
        temperature: req.temperature ?? 0.4,
        ...(req.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${body}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return {
      text: data.choices[0].message.content,
      provider: this.name,
      model,
      cached: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _provider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (_provider) return _provider;
  const env = getEnv();
  if (env.AI_PROVIDER === 'openai' && env.AI_API_KEY) {
    _provider = new OpenAIProvider(env.AI_API_KEY, env.AI_MODEL_DEFAULT);
  } else {
    _provider = new MockProvider();
  }
  return _provider;
}

/** Test-only — reset the provider singleton. */
export function __resetAiProvider() {
  _provider = null;
}
