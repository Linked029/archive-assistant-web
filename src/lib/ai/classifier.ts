import { api } from "../api";

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

export async function smartSummarize(input: SmartSummarizeInput): Promise<{ success: true; result: ClassifiedResult } | { success: false; error: string }> {
  const raw = input.rawText.trim();
  if (!raw) return { success: false, error: "请输入要智能总结的内容" };
  try {
    const result = await api.classify(raw, input.sourceUrl);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "本地 AI 服务不可用" };
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
    } catch {
      // 尝试下一个代理
    }
  }
  return { success: false, error: "网页抓取失败：CORS 代理不可用，请手动粘贴网页内容到全文框" };
}
