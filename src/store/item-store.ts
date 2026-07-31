﻿import { create } from 'zustand';
import type { KnowledgeItem } from '../models/item';
import { ContentType, generateId } from '../models/item';
import type { DocumentFormat } from '../models/item';
import { loadAllItems, saveItem, deleteItem as deleteItemDb, createSnapshot } from '../lib/db';
import { resolveTopicId } from '../models/topic';

interface AddItemInput {
  topicId: string;
  contentType: ContentType;
  title: string;
  summary: string;
  fullText: string;
  sourceUrl?: string;
  documentFormat?: string;
  fileName?: string;
}

interface ItemState {
  items: KnowledgeItem[];
  loaded: boolean;
  actions: {
    initialize: () => Promise<void>;
    addItem: (input: AddItemInput) => Promise<KnowledgeItem>;
    updateItem: (item: KnowledgeItem) => Promise<void>;
    removeItem: (id: string) => Promise<void>;
    refreshFromDb: () => Promise<void>;
  };
}

export const useItemStore = create<ItemState>()((set, get) => ({
  items: [],
  loaded: false,
  actions: {
    initialize: async () => {
      const items = await loadAllItems();
      set({ items, loaded: true });
    },

    addItem: async (input) => {
      const item: KnowledgeItem = {
        id: generateId(),
        topicId: resolveTopicId(input.topicId),
        contentType: input.contentType,
        title: input.title,
        summary: input.summary,
        fullText: input.fullText,
        sourceUrl: input.sourceUrl,
        documentFormat: input.documentFormat as DocumentFormat | undefined,
        fileName: input.fileName,
        createdAtEpochMillis: Date.now(),
      };
      set({ items: [...get().items, item] });
      saveItem(item).catch(console.error);
      createSnapshot(JSON.stringify({ type: 'add', item })).catch(() => {});
      return item;
    },

    updateItem: async (item) => {
      set({ items: get().items.map((i) => (i.id === item.id ? item : i)) });
      saveItem(item).catch(console.error);
      createSnapshot(JSON.stringify({ type: 'update', item })).catch(() => {});
    },

    removeItem: async (id) => {
      set({ items: get().items.filter((i) => i.id !== id) });
      deleteItemDb(id).catch(console.error);
      createSnapshot(JSON.stringify({ type: 'delete', id })).catch(() => {});
    },

    refreshFromDb: async () => {
      const items = await loadAllItems();
      set({ items, loaded: true });
    },
  },
}));

export function getItemsByTopic(items: KnowledgeItem[]) {
  const map: Record<string, KnowledgeItem[]> = {};
  for (const item of items) {
    const tid = resolveTopicId(item.topicId);
    if (!map[tid]) map[tid] = [];
    map[tid].push(item);
  }
  return map;
}

export function getFilteredItems(items: KnowledgeItem[], topicId: string, filter: ContentType): KnowledgeItem[] {
  const tid = resolveTopicId(topicId);
  const topicItems = items.filter((i) => resolveTopicId(i.topicId) === tid);
  if (filter === ContentType.ALL) return topicItems;
  return topicItems.filter((i) => i.contentType === filter);
}
