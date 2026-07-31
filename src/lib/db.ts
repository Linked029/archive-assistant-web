import Dexie, { type EntityTable } from 'dexie';
import type { Topic } from '../models/topic';
import type { KnowledgeItem } from '../models/item';
import type { AiEngineSettings, AiEnginePreset } from '../models/ai-settings';

export class ArchiveAssistantDB extends Dexie {
  topics!: EntityTable<Topic, 'id'>;
  items!: EntityTable<KnowledgeItem, 'id'>;
  aiSettings!: EntityTable<AiEngineSettings, 'engineType'>;
  aiPresets!: EntityTable<AiEnginePreset, 'name'>;
  snapshots!: EntityTable<{ id: number; data: string; createdAt: number }, 'id'>;

  constructor() {
    super('ArchiveAssistant');
    this.version(1).stores({
      topics: 'id, order, updatedAtEpochMillis',
      items: 'id, topicId, contentType, createdAtEpochMillis',
      aiSettings: 'engineType',
      aiPresets: 'name',
      snapshots: '++id, createdAt',
    });
  }
}

export const db = new ArchiveAssistantDB();

export async function loadAllTopics(): Promise<Topic[]> {
  const topics = await db.topics.toArray();
  return topics.sort((a, b) => a.order - b.order);
}

export async function saveTopic(topic: Topic): Promise<void> {
  await db.topics.put(topic);
}

export async function deleteTopic(id: string): Promise<void> {
  await db.topics.delete(id);
}

export async function loadItemsByTopic(topicId: string): Promise<KnowledgeItem[]> {
  return db.items.where('topicId').equals(topicId).toArray();
}

export async function loadAllItems(): Promise<KnowledgeItem[]> {
  return db.items.toArray();
}

export async function saveItem(item: KnowledgeItem): Promise<void> {
  await db.items.put(item);
}

export async function deleteItem(id: string): Promise<void> {
  await db.items.delete(id);
}

export async function saveAiSettings(settings: AiEngineSettings): Promise<void> {
  await db.aiSettings.put(settings);
}

export async function loadAiSettings(): Promise<AiEngineSettings | undefined> {
  const all = await db.aiSettings.toArray();
  return all[0];
}

export async function createSnapshot(data: string): Promise<void> {
  const count = await db.snapshots.count();
  if (count >= 10) {
    const oldest = await db.snapshots.orderBy('id').first();
    if (oldest) await db.snapshots.delete(oldest.id);
  }
  await db.snapshots.add({ id: 0, data, createdAt: Date.now() });
}

export async function exportAllData(): Promise<string> {
  const topics = await db.topics.toArray();
  const items = await db.items.toArray();
  const settings = await loadAiSettings();
  return JSON.stringify({ topics, items, settings, exportedAt: new Date().toISOString() }, null, 2);
}

export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json) as {
    topics?: Topic[];
    items?: KnowledgeItem[];
    settings?: AiEngineSettings;
  };
  await db.transaction('rw', [db.topics, db.items, db.aiSettings], async () => {
    if (data.topics) {
      await db.topics.clear();
      await db.topics.bulkAdd(data.topics);
    }
    if (data.items) {
      await db.items.clear();
      await db.items.bulkAdd(data.items);
    }
    if (data.settings) {
      await db.aiSettings.clear();
      await db.aiSettings.add(data.settings);
    }
  });
}

export async function exportItemsAsMarkdown(): Promise<string> {
  const items = await db.items.toArray();
  const topics = await db.topics.toArray();
  const topicMap = new Map(topics.map((t) => [t.id, t.title]));

  let output = "";
  for (const item of items) {
    const topicTitle = topicMap.get(item.topicId) || "未分类";
    const date = new Date(item.createdAtEpochMillis).toISOString().slice(0, 10);
    const frontmatter = [
      "---",
      `title: "${item.title.replace(/"/g, '\\"')}"`,
      `topic: "${topicTitle}"`,
      `type: ${item.contentType}`,
      `date: ${date}`,
      item.sourceUrl ? `source: ${item.sourceUrl}` : "",
      item.fileName ? `file: ${item.fileName}` : "",
      `id: ${item.id}`,
      "---",
    ].filter(Boolean).join("\n");

    output += frontmatter + "\n\n";
    if (item.summary) output += `> ${item.summary}\n\n`;
    if (item.fullText) output += item.fullText + "\n\n";
    output += "---\n\n";
  }
  return output;
}