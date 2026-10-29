/**
 * Which AI writes Star's answers and comments, the study advice, and what went wrong when it fails. Free of Deno globals
 * and SDKs so it can be tested in Node; the Gemini SDK call lives in ai.ts.
 *
 * Default: Gemini with GEMINI_API_KEY (GEMINI_MODEL optional).
 * Any OpenAI-compatible service (Groq, OpenRouter, a local server, …): AI_PROVIDER=openai with
 * AI_BASE_URL (e.g. https://api.groq.com/openai/v1), AI_API_KEY and AI_MODEL (from its model list).
 */

/** Google's alias for its current Flash model: available to every key tier and never retired. */
export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

export type AiConfig =
  | { provider: 'gemini'; apiKey: string; model: string }
  | { provider: 'openai'; apiKey: string; model: string; baseUrl: string };

export function aiConfig(env: (name: string) => string | undefined): AiConfig | null {
  const value = (name: string) => env(name)?.trim() || '';
  if (value('AI_PROVIDER').toLowerCase() === 'openai') {
    const apiKey = value('AI_API_KEY'), model = value('AI_MODEL'), baseUrl = value('AI_BASE_URL').replace(/\/+$/, '');
    return apiKey && model && /^https?:\/\//.test(baseUrl) ? { provider: 'openai', apiKey, model, baseUrl } : null;
  }
  const apiKey = value('GEMINI_API_KEY');
  return apiKey ? { provider: 'gemini', apiKey, model: value('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL } : null;
}

/** An HTTP failure from the AI service, with its status for aiFailure. */
export class AiHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Groq's gpt-oss models reason before answering, and the reasoning shares the length limit: keep it
 * short, leave it out of the reply and allow more room so the answer itself is not cut off.
 * A short answer (Star's one-line comments) gets a smaller limit.
 */
function reasoningOptions(config: Extract<AiConfig, { provider: 'openai' }>, short: boolean): Record<string, unknown> {
  if (!/groq\.com/.test(config.baseUrl) || !/gpt-oss/.test(config.model)) return { max_tokens: short ? 200 : 800 };
  return { max_tokens: short ? 700 : 2048, reasoning_effort: 'low', include_reasoning: false };
}

/** One answer from an OpenAI-compatible /chat/completions endpoint. */
export async function openAiCompatibleText(config: Extract<AiConfig, { provider: 'openai' }>, system: string, input: string, fetchImpl: typeof fetch = fetch, short = false): Promise<string> {
  const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }], temperature: 0.4, ...reasoningOptions(config, short) }),
  });
  const body = await response.json().catch(() => null) as { error?: { message?: unknown }; choices?: { message?: { content?: unknown } }[] } | null;
  if (!response.ok) throw new AiHttpError(response.status, typeof body?.error?.message === 'string' ? body.error.message : `HTTP ${response.status}`);
  const text = body?.choices?.[0]?.message?.content;
  return typeof text === 'string' ? text : '';
}

export interface AiFailure {
  /** Short code returned to the app and logged, so a failed answer says why. */
  code: 'ai_key' | 'ai_model' | 'ai_rate_limit' | 'ai_request' | 'ai_error';
  /** HTTP status for the app's response. */
  status: number;
  message: string;
}

/** What went wrong with an AI call, without the key or the student's text. */
export function aiFailure(error: unknown): AiFailure {
  const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : 0;
  const text = String((error as { message?: unknown })?.message ?? error).toLowerCase();
  if (status === 401 || status === 403 || /api key|api_key|permission|unauthenticated|invalid.*key/.test(text)) {
    return { code: 'ai_key', status: 503, message: 'AI түлхүүр буруу эсвэл эрхгүй байна.' };
  }
  if (status === 404 || /not found|is not supported|unknown model|does not exist/.test(text)) {
    return { code: 'ai_model', status: 503, message: 'Сонгосон AI загвар энэ түлхүүрээр ашиглах боломжгүй байна.' };
  }
  if (status === 429 || /quota|rate limit|resource_exhausted/.test(text)) {
    return { code: 'ai_rate_limit', status: 429, message: 'AI түр завгүй байна. Хэсэг хүлээгээд дахин асуугаарай.' };
  }
  if (status === 400) return { code: 'ai_request', status: 502, message: 'AI хүсэлтийг хүлээж авсангүй.' };
  return { code: 'ai_error', status: 502, message: 'AI хүсэлтийг боловсруулахад алдаа гарлаа.' };
}
