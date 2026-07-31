import MiniSearch from "minisearch";
import type { KnowledgeItem } from "../models/item";

let miniSearch: MiniSearch<KnowledgeItem> | null = null;

export function buildSearchIndex(items: KnowledgeItem[]) {
  miniSearch = new MiniSearch<KnowledgeItem>({
    fields: ["title", "summary", "fullText", "fileName"],
    storeFields: ["title", "summary", "fullText", "fileName", "topicId", "contentType", "createdAtEpochMillis", "id"],
    idField: "id",
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { title: 3, summary: 2, fileName: 1.5, fullText: 1 },
    },
  });
  miniSearch.addAll(items);
  return miniSearch;
}

export function getSearchIndex(): MiniSearch<KnowledgeItem> | null {
  return miniSearch;
}

export function searchItems(items: KnowledgeItem[], query: string): KnowledgeItem[] {
  const q = query.trim();
  if (!q) return items;
  if (!miniSearch) buildSearchIndex(items);

  try {
    const results = miniSearch!.search(q, { combineWith: "AND" });
    return results.map((r) => r as unknown as KnowledgeItem);
  } catch {
    // Fallback to substring match if search fails
    const lower = q.toLowerCase();
    return items.filter((i) =>
      i.title.toLowerCase().includes(lower) ||
      i.summary.toLowerCase().includes(lower) ||
      i.fullText.toLowerCase().includes(lower) ||
      (i.fileName || "").toLowerCase().includes(lower)
    );
  }
}