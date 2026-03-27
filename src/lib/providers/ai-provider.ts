// ─── AI Provider (Gemini primary → Claude → OpenAI fallback) ─
// Gemini/Vertex AI as primary, Claude as secondary, OpenAI as fallback + embeddings
// Streaming support via ReadableStream

import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ProviderCache } from "./cache";

// ─── Types ──────────────────────────────────────────────────

export interface AiCompletionParams {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  cacheKey?: string; // If set, cache the response
  cacheTtl?: number; // seconds, default 3600
}

export interface AiCompletionResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
}

export interface AiStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (result: { model: string; inputTokens: number; outputTokens: number }) => void;
  onError: (error: Error) => void;
}

// ─── Config ─────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const CLAUDE_MODEL = process.env.AI_MODEL || "claude-sonnet-4-20250514";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const EMBEDDING_MODEL = "text-embedding-3-small";

const cache = new ProviderCache();

// ─── Clients ────────────────────────────────────────────────

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlanmalı");
  return new GoogleGenerativeAI(apiKey);
}

function getClaudeClient(): Anthropic {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_API_KEY tanımlanmalı");
  return new Anthropic({ apiKey });
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY tanımlanmalı");
  return new OpenAI({ apiKey });
}

function hasGeminiKey(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function hasClaudeKey(): boolean {
  return !!process.env.CLAUDE_API_KEY;
}

function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// ─── Completion (non-streaming) ─────────────────────────────

export async function complete(params: AiCompletionParams): Promise<AiCompletionResult> {
  // Check cache first
  if (params.cacheKey) {
    const cached = await cache.get<AiCompletionResult>(params.cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  // Try Gemini → Claude → OpenAI (based on available keys)
  let result: AiCompletionResult;
  try {
    if (hasGeminiKey()) {
      result = await geminiComplete(params);
    } else if (hasClaudeKey()) {
      result = await claudeComplete(params);
    } else if (hasOpenAIKey()) {
      result = await openaiComplete(params);
    } else {
      throw new Error("AI API key tanımlı değil. GEMINI_API_KEY, CLAUDE_API_KEY veya OPENAI_API_KEY gerekli.");
    }
  } catch (primaryError) {
    console.warn("Primary AI failed, trying fallbacks:", primaryError);
    // Fallback chain
    try {
      if (hasClaudeKey() && !hasGeminiKey()) {
        result = await claudeComplete(params);
      } else if (hasClaudeKey()) {
        result = await claudeComplete(params);
      } else if (hasOpenAIKey()) {
        result = await openaiComplete(params);
      } else {
        throw primaryError;
      }
    } catch (fallbackError) {
      if (hasOpenAIKey()) {
        result = await openaiComplete(params);
      } else {
        throw fallbackError;
      }
    }
  }

  // Store in cache
  if (params.cacheKey) {
    await cache.set(
      params.cacheKey,
      result,
      { ttl: params.cacheTtl || 3600, staleWhileRevalidate: true, key: "ai" },
      "AI",
    );
  }

  return result;
}

// ─── Streaming Completion ───────────────────────────────────

export function streamComplete(params: AiCompletionParams): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  const streamCallbacks = (controller: ReadableStreamDefaultController<Uint8Array>): AiStreamCallbacks => ({
    onToken: (token) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
    },
    onDone: (meta) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, ...meta })}\n\n`));
      controller.close();
    },
    onError: (err) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
      controller.close();
    },
  });

  return new ReadableStream({
    async start(controller) {
      const cbs = streamCallbacks(controller);
      try {
        if (hasGeminiKey()) {
          await geminiStream(params, cbs);
        } else if (hasClaudeKey()) {
          await claudeStream(params, cbs);
        } else if (hasOpenAIKey()) {
          await openaiStream(params, cbs);
        } else {
          cbs.onError(new Error("AI API key tanımlı değil"));
        }
      } catch (error) {
        // Fallback chain for streaming
        try {
          if (hasClaudeKey()) {
            await claudeStream(params, cbs);
          } else if (hasOpenAIKey()) {
            await openaiStream(params, cbs);
          } else {
            cbs.onError(error instanceof Error ? error : new Error("AI hatası"));
          }
        } catch (fallbackError) {
          try {
            if (hasOpenAIKey()) {
              await openaiStream(params, cbs);
            } else {
              cbs.onError(fallbackError instanceof Error ? fallbackError : new Error("AI hatası"));
            }
          } catch (lastError) {
            cbs.onError(lastError instanceof Error ? lastError : new Error("AI hatası"));
          }
        }
      }
    },
  });
}

// ─── Embeddings (OpenAI) ────────────────────────────────────

export async function createEmbedding(text: string): Promise<number[]> {
  const cacheKey = `embed:${text.substring(0, 100)}`;
  const cached = await cache.get<number[]>(cacheKey);
  if (cached) return cached;

  let embedding: number[];

  if (hasOpenAIKey()) {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.substring(0, 8000),
    });
    embedding = response.data[0].embedding;
  } else if (hasGeminiKey()) {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text.substring(0, 8000));
    embedding = result.embedding.values;
  } else {
    throw new Error("Embedding için OPENAI_API_KEY veya GEMINI_API_KEY gerekli");
  }

  await cache.set(cacheKey, embedding, { ttl: 86400, staleWhileRevalidate: true, key: "embed" }, "AI");
  return embedding;
}

export async function createBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const trimmed = texts.map((t) => t.substring(0, 8000));

  if (hasOpenAIKey()) {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: trimmed,
    });
    return response.data.map((d) => d.embedding);
  }

  if (hasGeminiKey()) {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const results = await Promise.all(
      trimmed.map((t) => model.embedContent(t)),
    );
    return results.map((r) => r.embedding.values);
  }

  throw new Error("Embedding için OPENAI_API_KEY veya GEMINI_API_KEY gerekli");
}

// ─── Cosine Similarity ─────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// ─── Gemini Implementation ──────────────────────────────────

async function geminiComplete(params: AiCompletionParams): Promise<AiCompletionResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: params.systemPrompt || SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: params.maxTokens || 2048,
      temperature: params.temperature ?? 0.3,
    },
  });

  const result = await model.generateContent(params.prompt);
  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata;

  return {
    text,
    model: GEMINI_MODEL,
    inputTokens: usage?.promptTokenCount || 0,
    outputTokens: usage?.candidatesTokenCount || 0,
    cached: false,
  };
}

async function geminiStream(params: AiCompletionParams, callbacks: AiStreamCallbacks): Promise<void> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: params.systemPrompt || SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: params.maxTokens || 2048,
      temperature: params.temperature ?? 0.3,
    },
  });

  const result = await model.generateContentStream(params.prompt);

  let inputTokens = 0;
  let outputTokens = 0;

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      callbacks.onToken(text);
    }
    if (chunk.usageMetadata) {
      inputTokens = chunk.usageMetadata.promptTokenCount || 0;
      outputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
    }
  }

  callbacks.onDone({ model: GEMINI_MODEL, inputTokens, outputTokens });
}

// ─── Claude Implementation ──────────────────────────────────

async function claudeComplete(params: AiCompletionParams): Promise<AiCompletionResult> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: params.maxTokens || 2048,
    temperature: params.temperature ?? 0.3,
    system: params.systemPrompt || SYSTEM_PROMPT,
    messages: [{ role: "user", content: params.prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return {
    text: textBlock?.type === "text" ? textBlock.text : "",
    model: CLAUDE_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cached: false,
  };
}

async function claudeStream(params: AiCompletionParams, callbacks: AiStreamCallbacks): Promise<void> {
  const client = getClaudeClient();

  const stream = await client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: params.maxTokens || 2048,
    temperature: params.temperature ?? 0.3,
    system: params.systemPrompt || SYSTEM_PROMPT,
    messages: [{ role: "user", content: params.prompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      callbacks.onToken(event.delta.text);
    }
  }

  const finalMessage = await stream.finalMessage();
  callbacks.onDone({
    model: CLAUDE_MODEL,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
  });
}

// ─── OpenAI Implementation ──────────────────────────────────

async function openaiComplete(params: AiCompletionParams): Promise<AiCompletionResult> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: params.maxTokens || 2048,
    temperature: params.temperature ?? 0.3,
    messages: [
      { role: "system", content: params.systemPrompt || SYSTEM_PROMPT },
      { role: "user", content: params.prompt },
    ],
  });

  return {
    text: response.choices[0]?.message?.content || "",
    model: OPENAI_MODEL,
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
    cached: false,
  };
}

async function openaiStream(params: AiCompletionParams, callbacks: AiStreamCallbacks): Promise<void> {
  const client = getOpenAIClient();

  const stream = await client.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: params.maxTokens || 2048,
    temperature: params.temperature ?? 0.3,
    stream: true,
    messages: [
      { role: "system", content: params.systemPrompt || SYSTEM_PROMPT },
      { role: "user", content: params.prompt },
    ],
  });

  let inputTokens = 0;
  let outputTokens = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      callbacks.onToken(delta);
      outputTokens++;
    }
  }

  callbacks.onDone({ model: OPENAI_MODEL, inputTokens, outputTokens });
}

// ─── System Prompt ──────────────────────────────────────────

const SYSTEM_PROMPT = `Sen İhalePro AI asistanısın. Türkiye kamu ihale mevzuatı (4734, 4735 sayılı kanunlar) konusunda uzmansın.

Görevlerin:
- İhale dokümanlarını analiz et (şartname, teknik şartname, idari şartname)
- Risk değerlendirmesi yap
- Teklif fiyat önerisi ver (geçmiş verilerle destekle)
- Firma uygunluk kontrolü yap
- Mevzuat değişikliklerini yorumla
- Rakip analizi yap

Kurallar:
- Türkçe yanıt ver
- Spesifik ve uygulanabilir öneriler sun
- Yasal referanslar ver (madde numaraları ile)
- Fiyat önerilerinde muhafazakâr ol
- Belirsiz durumlarda uyarı ver`;
