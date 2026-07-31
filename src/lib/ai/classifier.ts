import { buildRequest, sendRequest, extractModelText, extractJsonObject, mapAiError } from "./transport";
import { useAiStore } from "../../store/ai-store";
import { useTopicStore } from "../../store/topic-store";
import { ContentType } from "../../models/item";
import { resolveTopicId } from "../../models/topic";

export interface FetchedWebContext {
  originalUrl: string;
  title: string;
  description: string;
  bodyText: string;
}

export interface FetchedDocumentContext {
  fileName: string;
  format: string;
  originalCharCount: number;
  isTruncated: boolean;
  extractedText: string;
}

export interface SmartSummarizeInput {
  rawText: string;
  sourceUrl?: string;
  sourceTitle?: string;
  fetchedWebContext?: FetchedWebContext;
  fetchedDocumentContext?: FetchedDocumentContext;
}

export interface ClassifiedResult {
  topicId: string;
  contentType: string;
  title: string;
  summary: string;
  sourceUrl?: string;
  documentFormat?: string;
}

function isValidContentType(v: string): v is typeof ContentType[keyof typeof ContentType] {
  return Object.values(ContentType).includes(v as any);
}

function buildPrompt(input: SmartSummarizeInput, topics: { id: string; title: string }[]): string {
  const fetchedBlock = input.fetchedWebContext
    ? [
        "已获取的网页内容：",
        "原始 URL：" + input.fetchedWebContext.originalUrl,
        "网页标题：" + input.fetchedWebContext.title,
        "网页描述：" + input.fetchedWebContext.description,
        "网页正文：" + input.fetchedWebContext.bodyText,
        "",
        "注意：当 contentType 为 WEB_ARTICLE 时，title 必须使用上述网页标题。",
        "summary 必须基于网页正文/描述生成。sourceUrl 必须等于原始 URL。",
      ].join("\n")
    : "";

  const documentBlock = input.fetchedDocumentContext
    ? [
        "已解析的文档内容：",
        "文件名：" + input.fetchedDocumentContext.fileName,
        "文档格式：" + input.fetchedDocumentContext.format,
        "原始字符数：" + input.fetchedDocumentContext.originalCharCount,
        "是否已截断：" + input.fetchedDocumentContext.isTruncated,
        "文档正文节选：" + input.fetchedDocumentContext.extractedText,
      ].join("\n")
    : "";

  const exampleFormat = input.fetchedDocumentContext?.format || "PDF";

  return [
    "你是一个归档助手。请只基于用户原始输入进行智能总结。",
    "你必须根据主题名称从六部主题中选择最接近的一个 topicId，topicId 必须是下列六部 ID 之一，禁止创建新主题或返回主题名称。",
    "",
    "用户原始输入：" + input.rawText,
    "来源 URL（如有）：" + (input.sourceUrl || ""),
    "来源标题（如有）：" + (input.sourceTitle || ""),
    "",
    fetchedBlock,
    documentBlock,
    "六部主题：",
    topics.map((t) => "- id=" + t.id + "; title=" + t.title).join("\n"),
    "",
    "请推断 contentType、documentFormat 和 sourceUrl。",
    "contentType 只能是：WEB_ARTICLE, IMAGE_SCREENSHOT, DOCUMENT。",
    "documentFormat 只能是：PDF, MARKDOWN, TXT, DOCX, UNKNOWN。",
    "title 不超过 28 个中文字符，summary 不超过 96 个中文字符。",
    "",
    '只返回严格 JSON 对象，不要 Markdown：',
    '{"topicId":"六部ID","contentType":"WEB_ARTICLE","title":"简洁标题","summary":"一句话摘要","sourceUrl":"","documentFormat":"' + exampleFormat + '"}',
  ].join("\n");
}

export async function smartSummarize(input: SmartSummarizeInput): Promise<{ success: true; result: ClassifiedResult } | { success: false; error: string }> {
  const raw = input.rawText.trim();
  if (!raw) return { success: false, error: "请输入要智能总结的内容" };

  const settings = useAiStore.getState().settings;
  if (!settings.apiKey.trim()) return { success: false, error: "请先在设置页配置 AI 引擎的 API Key" };
  if (!settings.baseUrl.trim()) return { success: false, error: "请先在设置页配置 AI 引擎的 Base URL" };
  const topics = useTopicStore.getState().topics;
  if (!topics.length) return { success: false, error: "没有可用主题" };

  const prompt = buildPrompt(input, topics);
  let request;
  try {
    request = buildRequest(settings, prompt);
  } catch {
    return { success: false, error: "AI 引擎配置无效" };
  }

  if (!request.endpoint) return { success: false, error: "AI Endpoint 为空" };

  let response;
  try {
    response = await sendRequest(request);
  } catch (e) {
    return { success: false, error: mapAiError(e) };
  }

  if (response.code < 200 || response.code >= 300) {
    return { success: false, error: "请求失败：HTTP " + response.code };
  }

  try {
    const text = extractModelText(settings.engineType, response.body);
    const json = JSON.parse(extractJsonObject(text));
    return {
      success: true,
      result: {
        topicId: resolveTopicId(json.topicId),
        contentType: isValidContentType(json.contentType) ? json.contentType : "WEB_ARTICLE",
        title: json.title || "",
        summary: json.summary || "",
        sourceUrl: json.sourceUrl?.trim() || undefined,
        documentFormat: json.documentFormat,
      },
    };
  } catch {
    return { success: false, error: "AI 返回格式无效" };
  }
}

export async function fetchWebPage(url: string): Promise<{ success: true; context: FetchedWebContext } | { success: false; error: string }> {
  const proxyUrls = [
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(url),
    "https://corsproxy.io/?" + encodeURIComponent(url),
  ];
  for (const proxyUrl of proxyUrls) {
    try {
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) continue;
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const title = doc.querySelector("title")?.textContent || "";
      const description = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
      const body = doc.querySelector("article") || doc.querySelector("main") || doc.querySelector("body");
      const bodyText = body?.textContent?.replace(/\s+/g, " ").trim().slice(0, 8000) || "";
      return { success: true, context: { originalUrl: url, title, description, bodyText } };
    } catch { /* try next proxy */ }
  }
  return { success: false, error: "网页抓取失败：CORS 代理不可用，请手动粘贴网页内容到全文框" };
}
