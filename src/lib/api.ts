import type { AiEngineSettings } from "../models/ai-settings";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data && typeof data.error === "string") message = data.error;
    } catch {
      // 保留默认错误信息
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

async function requestText(path: string): Promise<string> {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

export interface ApiMinistry {
  id: string;
  title: string;
  icon: string;
  color: string;
  order: number;
  itemCount?: number;
  archivedCount?: number;
  pendingCount?: number;
  sourceCount?: number;
}

export interface ApiSource {
  id: string;
  ministryId: string;
  name: string;
  kind: "feed" | "url" | "manual";
  location: string;
  enabled: boolean;
  lastFetchedAt: string | null;
  lastStatus: string | null;
  failStreak: number;
  adapter: string;
  tags: string[];
  packIds: string[];
}

export interface ApiPack {
  id: string;
  name: string;
  state: "active" | "inactive";
  directionId: string | null;
  keywords: string[];
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPreference {
  ministryId: string;
  description: string;
  excludeKeywords: string[];
  excludeDomains: string[];
  dailyLimit: number;
  scheduleCron: string;
}

export type ApiItemStatus =
  | "candidate"
  | "pending"
  | "archived"
  | "read"
  | "reviewing"
  | "mastered";

export interface ApiItem {
  id: string;
  ministryId: string;
  sourceId: string | null;
  contentType: string;
  title: string;
  summary: string;
  fullText: string;
  sourceUrl: string | null;
  documentFormat: string | null;
  fileName: string | null;
  status: ApiItemStatus;
  qualityScore: number;
  aiReason: string | null;
  redraftCount: number;
  createdAt: string;
  approvedAt: string | null;
  archivedAt: string | null;
  readAt: string | null;
}

export interface ApiFetchLog {
  id: string;
  date: string;
  ministryId: string;
  sourceId: string | null;
  status: string;
  itemCount: number;
  error: string | null;
  createdAt: string;
  ministryTitle?: string;
}

export interface ApiRejectLog {
  id: string;
  itemId: string;
  sourceId: string | null;
  reason: string | null;
  title: string;
  sourceUrl: string | null;
  createdAt: string;
}

export interface ApiSettings {
  ai: AiEngineSettings;
  aiPresets: {
    name: string;
    engineType: string;
    baseUrl: string;
    modelName: string;
    apiKey: string;
  }[];
  autoApproveThreshold: number;
  focusRatio: number;
  relevanceThreshold: number;
}

export interface ApiDashboard {
  today: {
    pending: number;
    archivedToday: number;
    createdToday: number;
    fetchedOk: number;
    fetchedError: number;
  };
  ministries: (ApiMinistry & {
    itemCount: number;
    archivedCount: number;
    pendingCount: number;
    sourceCount: number;
  })[];
  recentFetchLogs: ApiFetchLog[];
}

export interface ApiAnnotation {
  id: string;
  itemId: string;
  createdAt: string;
  text: string;
}

export type ReviewRating = "forgot" | "hard" | "good" | "easy";

export interface ApiReview {
  itemId: string;
  stage: number;
  dueAt: string;
  intervalDays: number;
  ease: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  status: "reviewing" | "mastered";
  item: ApiItem;
}

export interface ApiLearningStats {
  date: string;
  dueToday: number;
  completedToday: number;
  completionRate: number | null;
  dueByMinistry: Record<string, number>;
  weeklyCount: number;
  masteredCount: number;
}

export interface SchedulerRunSummary {
  ministryId: string;
  ministryTitle: string;
  newCandidates: number;
  errors: string[];
  sources: {
    sourceId: string;
    name: string;
    ok: boolean;
    error: string | null;
    articles: { title: string; summary: string; fullText: string; sourceUrl: string | null }[];
  }[];
}


export interface ApiSearchDirection {
  id: string;
  ministry_id: string;
  direction_text: string;
  created_at: string;
  status: "active" | "fulfilled";
}

export interface ApiExplorationItem {
  id: string;
  ministry_id: string;
  direction_id: string;
  search_term_id: string | null;
  title: string;
  summary: string;
  full_text: string;
  source_url: string | null;
  source_name: string;
  status: "new" | "archived" | "dismissed";
  created_at: string;
}
export const api = {
  health: () => request<{ ok: boolean }>("/health"),
  dashboard: () => request<ApiDashboard>("/dashboard"),

  listMinistries: () => request<ApiMinistry[]>("/ministries"),
  createMinistry: (input: { id?: string; title: string; icon?: string; color?: string }) =>
    request<ApiMinistry>("/ministries", { method: "POST", body: JSON.stringify(input) }),
  updateMinistry: (id: string, patch: Partial<Pick<ApiMinistry, "title" | "icon" | "color">>) =>
    request<ApiMinistry>(`/ministries/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteMinistry: (id: string) => request<{ ok: boolean }>(`/ministries/${id}`, { method: "DELETE" }),

  listSources: (ministryId?: string) =>
    request<ApiSource[]>(ministryId ? `/ministries/${ministryId}/sources` : "/sources"),
  createSource: (ministryId: string, input: {
    name: string;
    kind: string;
    location: string;
    enabled?: boolean;
    adapter?: string;
    tags?: string[];
    packIds?: string[];
  }) =>
    request<ApiSource>(`/ministries/${ministryId}/sources`, { method: "POST", body: JSON.stringify(input) }),
  updateSource: (id: string, patch: Partial<Pick<ApiSource, "name" | "kind" | "location" | "enabled" | "adapter" | "tags" | "packIds">>) =>
    request<ApiSource>(`/sources/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteSource: (id: string) => request<{ ok: boolean }>(`/sources/${id}`, { method: "DELETE" }),
  batchUpdateSources: (input: { sourceIds: string[]; action: "enable" | "disable" | "addPack" | "removePack"; packId?: string }) =>
    request<{ ok: boolean; updated: number }>("/sources/batch", { method: "POST", body: JSON.stringify(input) }),
  testSource: (id: string) =>
    request<{ ok: boolean; error: string | null; articleCount: number; preview: { title: string; summary: string }[] }>(
      `/sources/${id}/test`,
      { method: "POST" },
    ),
  fetchWeb: (url: string) =>
    request<{ ok: boolean; title: string; summary: string; fullText: string; sourceUrl: string | null }>(
      "/fetch-web",
      { method: "POST", body: JSON.stringify({ url }) },
    ),

  listPacks: () => request<ApiPack[]>("/packs"),
  createPack: (input: { name: string; keywords?: string[]; state?: "active" | "inactive" }) =>
    request<ApiPack>("/packs", { method: "POST", body: JSON.stringify(input) }),
  updatePack: (id: string, patch: Partial<Pick<ApiPack, "name" | "state" | "keywords">>) =>
    request<ApiPack>(`/packs/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deletePack: (id: string) => request<{ ok: boolean }>(`/packs/${id}`, { method: "DELETE" }),

  getPreference: (ministryId: string) => request<ApiPreference>(`/preferences/${ministryId}`),
  updatePreference: (ministryId: string, patch: Partial<ApiPreference>) =>
    request<ApiPreference>(`/preferences/${ministryId}`, { method: "PUT", body: JSON.stringify(patch) }),

  listItems: (params?: { ministryId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.ministryId) query.set("ministryId", params.ministryId);
    if (params?.status) query.set("status", params.status);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<ApiItem[]>(`/items${suffix}`);
  },
  getItem: (id: string) => request<ApiItem>(`/items/${id}`),
  createItem: (input: {
    ministryId: string;
    title: string;
    summary?: string;
    fullText?: string;
    sourceUrl?: string;
    contentType?: string;
    documentFormat?: string;
    fileName?: string;
    qualityScore?: number;
  }) => request<ApiItem>("/items", { method: "POST", body: JSON.stringify(input) }),
  updateItem: (id: string, patch: Partial<Pick<ApiItem, "ministryId" | "title" | "summary" | "fullText" | "sourceUrl" | "contentType" | "documentFormat" | "fileName">>) =>
    request<ApiItem>(`/items/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteItem: (id: string) => request<{ ok: boolean }>(`/items/${id}`, { method: "DELETE" }),
  approveItem: (id: string) => request<ApiItem>(`/items/${id}/approve`, { method: "POST", body: "{}" }),
  rejectItem: (id: string, reason?: string) =>
    request<{ ok: boolean }>(`/items/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  redraftItem: (id: string, reason?: string) =>
    request<ApiItem>(`/items/${id}/redraft`, { method: "POST", body: JSON.stringify({ reason }) }),

  listAnnotations: (itemId: string) => request<ApiAnnotation[]>(`/items/${itemId}/annotations`),
  createAnnotation: (itemId: string, text: string) =>
    request<ApiAnnotation>(`/items/${itemId}/annotations`, { method: "POST", body: JSON.stringify({ text }) }),
  deleteAnnotation: (id: string) => request<{ ok: boolean }>(`/annotations/${id}`, { method: "DELETE" }),
  markItemRead: (id: string) => request<ApiItem>(`/items/${id}/read`, { method: "POST", body: "{}" }),
  listDueReviews: (date?: string) =>
    request<ApiReview[]>(date ? `/reviews/due?date=${encodeURIComponent(date)}` : "/reviews/due"),
  submitReview: (itemId: string, rating: ReviewRating) =>
    request<ApiReview>(`/reviews/${itemId}/review`, { method: "POST", body: JSON.stringify({ rating }) }),
  getLearningStats: (date?: string) =>
    request<ApiLearningStats>(date ? `/stats/learning?date=${encodeURIComponent(date)}` : "/stats/learning"),

  runScheduler: (ministryId?: string) =>
    request<{ summaries: SchedulerRunSummary[] }>("/scheduler/run", {
      method: "POST",
      body: JSON.stringify(ministryId ? { ministryId } : {}),
    }),

  listFetchLogs: (date?: string) =>
    request<ApiFetchLog[]>(date ? `/fetch-logs?date=${encodeURIComponent(date)}` : "/fetch-logs"),
  listRejectLogs: () => request<ApiRejectLog[]>("/reject-logs"),

  getSettings: () => request<ApiSettings>("/settings"),
  updateAiSettings: (patch: Partial<AiEngineSettings>) =>
    request<AiEngineSettings>("/settings/ai", { method: "PUT", body: JSON.stringify(patch) }),
  saveAiPresets: (presets: ApiSettings["aiPresets"]) =>
    request<{ presets: ApiSettings["aiPresets"] }>("/settings/ai-presets", {
      method: "PUT",
      body: JSON.stringify({ presets }),
    }),
  updateAutoApproveThreshold: (autoApproveThreshold: number) =>
    request<{ autoApproveThreshold: number }>("/settings/approval", {
      method: "PUT",
      body: JSON.stringify({ autoApproveThreshold }),
    }),
  updateSourceLifecycle: (patch: { focusRatio?: number; relevanceThreshold?: number }) =>
    request<{ focusRatio: number; relevanceThreshold: number }>("/settings/source-lifecycle", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  classify: (rawText: string, sourceUrl?: string) =>
    request<{
      topicId: string;
      contentType: string;
      title: string;
      summary: string;
      sourceUrl?: string;
      documentFormat?: string;
    }>("/ai/classify", { method: "POST", body: JSON.stringify({ rawText, sourceUrl }) }),

  exportJson: () => requestText("/export/json"),
  importJson: (data: unknown) =>
    request<{ ok: boolean }>("/import/json", { method: "POST", body: JSON.stringify({ data }) }),

  // Exploration scroll
  deleteDirection: (id: string) => request<{ ok: boolean }>('/exploration/directions/' + id, { method: 'DELETE' }),
  createDirection: (ministryId: string, directionText: string) =>
    request<ApiSearchDirection>("/exploration/directions", { method: "POST", body: JSON.stringify({ ministryId, directionText }) }),
  listDirections: (ministryId?: string) =>
    request<ApiSearchDirection[]>(ministryId ? "/exploration/directions?ministryId=" + encodeURIComponent(ministryId) : "/exploration/directions"),
  runDirection: (directionId: string) =>
    request<{ directionId: string; terms: string[]; totalResults: number; errors: string[] }>("/exploration/directions/" + directionId + "/run", { method: "POST", body: "{}" }),
  listExplorationItems: (params?: { ministryId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.ministryId) query.set("ministryId", params.ministryId);
    if (params?.status) query.set("status", params.status);
    const suffix = query.toString() ? "?" + query.toString() : "";
    return request<ApiExplorationItem[]>("/exploration/items" + suffix);
  },
  archiveExplorationItem: (id: string) =>
    request<{ ok: boolean }>("/exploration/items/" + id + "/archive", { method: "POST", body: "{}" }),
  dismissExplorationItem: (id: string) =>
    request<{ ok: boolean }>("/exploration/items/" + id + "/dismiss", { method: "POST", body: "{}" }),
  suggestFixedSources: () =>
    request<{ sourceName: string; archiveCount: number }[]>("/exploration/suggestions"),
  exportMarkdown: () => requestText("/export/markdown"),
};
