import type { Topic } from "../models/topic";
import type { KnowledgeItem } from "../models/item";
import type { AiEngineSettings, AiEnginePreset } from "../models/ai-settings";
import { api, type ApiItem } from "./api";

export function apiItemToKnowledgeItem(item: ApiItem): KnowledgeItem {
  return {
    id: item.id,
    topicId: item.ministryId,
    contentType: item.contentType as KnowledgeItem["contentType"],
    title: item.title,
    summary: item.summary,
    fullText: item.fullText,
    sourceUrl: item.sourceUrl || undefined,
    documentFormat: item.documentFormat as KnowledgeItem["documentFormat"] | undefined,
    fileName: item.fileName || undefined,
    createdAtEpochMillis: new Date(item.createdAt).getTime(),
  };
}

export async function loadAllTopics(): Promise<Topic[]> {
  const ministries = await api.listMinistries();
  return ministries.map((m) => ({
    id: m.id,
    title: m.title,
    iconName: m.icon || "folder-spark",
    iconColor: m.color || "#8B7D6B",
    updatedAtEpochMillis: Date.now(),
    order: m.order,
  }));
}

export async function saveTopic(topic: Topic): Promise<void> {
  await api.updateMinistry(topic.id, {
    title: topic.title,
    icon: topic.iconName,
    color: topic.iconColor,
  });
}

export async function deleteTopic(id: string): Promise<void> {
  await api.deleteMinistry(id);
}

export async function loadItemsByTopic(topicId: string): Promise<KnowledgeItem[]> {
  const items = await api.listItems({
    ministryId: topicId,
    status: "archived,read,reviewing,mastered",
  });
  return items.map(apiItemToKnowledgeItem);
}

export async function loadAllItems(): Promise<KnowledgeItem[]> {
  const items = await api.listItems({ status: "archived,read,reviewing,mastered" });
  return items.map(apiItemToKnowledgeItem);
}

export async function saveItem(item: KnowledgeItem): Promise<void> {
  await api.updateItem(item.id, {
    ministryId: item.topicId,
    title: item.title,
    summary: item.summary,
    fullText: item.fullText,
    sourceUrl: item.sourceUrl,
    contentType: item.contentType,
    documentFormat: item.documentFormat,
    fileName: item.fileName,
  });
}

export async function deleteItem(id: string): Promise<void> {
  await api.deleteItem(id);
}

export async function saveAiSettings(settings: AiEngineSettings): Promise<void> {
  await api.updateAiSettings(settings);
}

export async function loadAiSettings(): Promise<AiEngineSettings | undefined> {
  const settings = await api.getSettings();
  return settings.ai;
}

export async function loadAiPresets(): Promise<AiEnginePreset[]> {
  const settings = await api.getSettings();
  return settings.aiPresets as AiEnginePreset[];
}

export async function saveAiPresets(presets: AiEnginePreset[]): Promise<void> {
  await api.saveAiPresets(presets);
}

export async function createSnapshot(): Promise<void> {
  // SQLite 本地库由服务端持久化，快照由服务端维护，无需浏览器写入。
}

export async function exportAllData(): Promise<string> {
  return api.exportJson();
}

export async function importAllData(json: string): Promise<void> {
  await api.importJson(JSON.parse(json));
}

export async function exportItemsAsMarkdown(): Promise<string> {
  return api.exportMarkdown();
}
