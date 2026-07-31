﻿import type { AiEngineSettings } from "../../models/ai-settings";

export interface AiRequest {
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface AiResponse {
  code: number;
  body: string;
}

export async function sendRequest(request: AiRequest): Promise<AiResponse> {
  const response = await fetch(request.endpoint, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: AbortSignal.timeout(60000),
  });
  const text = await response.text();
  return { code: response.status, body: text };
}

export function buildRequest(settings: AiEngineSettings, prompt: string): AiRequest {
  switch (settings.engineType) {
    case "OPENAI_COMPATIBLE":
      return buildOpenAiCompatible(settings, prompt);
    case "OPENAI_RESPONSES":
      return buildOpenAiResponses(settings, prompt);
    case "ANTHROPIC":
      return buildAnthropic(settings, prompt);
    case "GEMINI":
      return buildGemini(settings, prompt);
    default:
      throw new Error(`Unsupported engine type: ${settings.engineType}`);
  }
}

function endpoint(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  return base ? `${base}/${path}` : "";
}

function authHeaders(apiKey: string): Record<string, string> {
  return apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {};
}

function buildOpenAiCompatible(settings: AiEngineSettings, prompt: string): AiRequest {
  return {
    endpoint: endpoint(settings.baseUrl, "chat/completions"),
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(settings.apiKey) },
    body: JSON.stringify({
      model: settings.modelName,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 768,
    }),
  };
}

function buildOpenAiResponses(settings: AiEngineSettings, prompt: string): AiRequest {
  return {
    endpoint: endpoint(settings.baseUrl, "responses"),
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(settings.apiKey) },
    body: JSON.stringify({
      model: settings.modelName,
      input: prompt,
      max_output_tokens: 768,
    }),
  };
}

function buildAnthropic(settings: AiEngineSettings, prompt: string): AiRequest {
  return {
    endpoint: endpoint(settings.baseUrl, "messages"),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey.trim(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: settings.modelName,
      max_tokens: 768,
      messages: [{ role: "user", content: prompt }],
    }),
  };
}

function buildGemini(settings: AiEngineSettings, prompt: string): AiRequest {
  const modelPath = settings.modelName.startsWith("models/") ? settings.modelName : `models/${settings.modelName}`;
  const sep = settings.baseUrl.includes("?") ? "&" : "?";
  return {
    endpoint: `${endpoint(settings.baseUrl, `${modelPath}:generateContent`)}${sep}key=${settings.apiKey.trim()}`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 768 },
    }),
  };
}

export function extractModelText(engineType: string, body: string): string {
  const json = JSON.parse(body);
  switch (engineType) {
    case "OPENAI_COMPATIBLE":
      return json.choices[0].message.content;
    case "OPENAI_RESPONSES":
      return json.output_text || json.output?.[0]?.content?.[0]?.text || "";
    case "ANTHROPIC":
      return json.content?.[0]?.text || "";
    case "GEMINI":
      return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    default:
      return "";
  }
}

export function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const unfenced = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json|JSON)?\n?/, "").replace(/\n?```$/, "").trim()
    : trimmed;

  const start = unfenced.indexOf("{");
  if (start < 0) throw new Error("No JSON object found");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < unfenced.length; i++) {
    const ch = unfenced[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === "{") depth++;
      if (ch === "}") { depth--; if (depth === 0) return unfenced.substring(start, i + 1); }
    }
  }
  throw new Error("No complete JSON object found");
}

export function mapAiError(error: unknown): string {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "网络请求失败，请检查 Endpoint 和网络连接";
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "请求超时，请检查模型或网络状况";
  }
  return error instanceof Error ? error.message : "未知错误";
}