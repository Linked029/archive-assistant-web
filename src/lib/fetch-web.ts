import { api } from "./api";

export interface FetchedWebContext {
  originalUrl: string;
  title: string;
  description: string;
  bodyText: string;
}

export async function fetchWebPage(
  url: string,
): Promise<{ success: true; context: FetchedWebContext } | { success: false; error: string }> {
  try {
    const local = await api.fetchWeb(url);
    if (local.ok) {
      return {
        success: true,
        context: {
          originalUrl: url,
          title: local.title,
          description: local.summary,
          bodyText: local.fullText,
        },
      };
    }
  } catch {
    // 本地抓取失败时回退到浏览器代理
  }

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
  return { success: false, error: "网页抓取失败：本地服务不可用且 CORS 代理不可用，请手动粘贴网页内容到全文框" };
}
