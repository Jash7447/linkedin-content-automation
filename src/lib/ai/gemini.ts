import "server-only";

import { GoogleGenAI } from "@google/genai";

import { getGeminiApiKey, getGeminiModel, type GeminiTask } from "@/lib/env.server";

/**
 * Replaceable AI provider abstraction (currently Google Gemini).
 *
 * Design goals (see docs/ROADMAP.md):
 *  - Task-scoped API keys: callers pass a task ('analysis' | 'drafting') and
 *    the matching server-side key is used, so one task's quota cannot starve
 *    another's.
 *  - Resilient to free-tier limits: automatic retry with exponential backoff
 *    on 429 (rate limit) and transient 5xx responses.
 *  - Model name is env-configurable so a deprecated model can be swapped
 *    without code changes.
 *  - Call sites depend only on these functions, not on the SDK, so the
 *    provider can be replaced later.
 */

export class QuotaExceededError extends Error {
  constructor(message = "AI quota exceeded. Try again later.") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Best-effort extraction of an HTTP-ish status from the SDK error. */
function statusOf(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null) {
    const anyErr = err as { status?: number; code?: number };
    return anyErr.status ?? anyErr.code;
  }
  return undefined;
}

function isRetryable(status: number | undefined): boolean {
  return status === 429 || status === 500 || status === 503;
}

/**
 * Generate a JSON object from a prompt. Instructs the model to return JSON and
 * parses the response. Retries on rate-limit/transient errors with backoff.
 *
 * @throws QuotaExceededError if retries are exhausted on a 429.
 */
export async function generateJson<T>(params: {
  task: GeminiTask;
  systemInstruction?: string;
  prompt: string;
}): Promise<T> {
  const { task, systemInstruction, prompt } = params;
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey(task) });
  const model = getGeminiModel();

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          ...(systemInstruction ? { systemInstruction } : {}),
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from model.");
      }

      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err;
      const status = statusOf(err);

      if (!isRetryable(status) || attempt === MAX_ATTEMPTS) {
        break;
      }

      // Exponential backoff with jitter.
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250;
      await sleep(delay);
    }
  }

  if (isRetryable(statusOf(lastError)) && statusOf(lastError) === 429) {
    throw new QuotaExceededError();
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("AI request failed.");
}
