﻿import { create } from 'zustand';
import type { KnowledgeItem } from '../models/item';
import { ContentType } from '../models/item';
import type { DocumentFormat } from '../models/item';
import { loadAllItems, apiItemToKnowledgeItem } from '../lib/db';
import { api } from '../lib/api';
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
      const created = await api.createItem({
        ministryId: resolveTopicId(input.topicId),
        contentType: input.contentType,
        title: input.title,
        summary: input.summary,
        fullText: input.fullText,
        sourceUrl: input.sourceUrl,
        documentFormat: input.documentFormat as DocumentFormat | undefined,
        fileName: input.fileName,
      });
      const item = apiItemToKnowledgeItem(created);
      set({ items: [...get().items, item] });
      return item;
    },

    updateItem: async (item) => {
      const updated = await api.updateItem(item.id, {
        ministryId: item.topicId,
        title: item.title,
        summary: item.summary,
        fullText: item.fullText,
        sourceUrl: item.sourceUrl,
        contentType: item.contentType,
        documentFormat: item.documentFormat,
        fileName: item.fileName,
      });
      set({ items: get().items.map((i) => (i.id === item.id ? apiItemToKnowledgeItem(updated) : i)) });
    },

    removeItem: async (id) => {
      await api.deleteItem(id);
      set({ items: get().items.filter((i) => i.id !== id) });
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
