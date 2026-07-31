﻿import { create } from 'zustand';
import type { Topic } from '../models/topic';
import { SIX_MINISTRIES } from '../models/topic';
import { loadAllTopics, saveTopic, deleteTopic as deleteTopicDb } from '../lib/db';
import { db } from '../lib/db';

interface TopicState {
  topics: Topic[];
  loaded: boolean;
  actions: {
    initialize: () => Promise<void>;
    addTopic: (title: string) => Promise<Topic>;
    renameTopic: (id: string, title: string) => Promise<void>;
    removeTopic: (id: string) => Promise<void>;
    refreshFromDb: () => Promise<void>;
  };
}

export const useTopicStore = create<TopicState>()((set, get) => ({
  topics: [],
  loaded: false,
  actions: {
    initialize: async () => {
      const existing = await loadAllTopics();
      if (existing.length > 0) {
        set({ topics: existing, loaded: true });
        return;
      }
      await db.topics.bulkAdd(SIX_MINISTRIES);
      set({ topics: SIX_MINISTRIES, loaded: true });
    },

    addTopic: async (title) => {
      const { topics } = get();
      const maxOrder = topics.reduce((m, t) => Math.max(m, t.order), -1);
      const topic: Topic = {
        id: `custom-${Date.now()}`,
        title,
        iconName: 'folder-spark',
        iconColor: '#8B7D6B',
        updatedAtEpochMillis: Date.now(),
        order: maxOrder + 1,
      };
      await saveTopic(topic);
      set({ topics: [...get().topics, topic] });
      return topic;
    },

    renameTopic: async (id, title) => {
      const { topics } = get();
      const updated = topics.map((t) =>
        t.id === id ? { ...t, title, updatedAtEpochMillis: Date.now() } : t,
      );
      const topic = updated.find((t) => t.id === id);
      if (topic) await saveTopic(topic);
      set({ topics: updated });
    },

    removeTopic: async (id) => {
      await deleteTopicDb(id);
      set({ topics: get().topics.filter((t) => t.id !== id) });
    },

    refreshFromDb: async () => {
      const topics = await loadAllTopics();
      set({ topics, loaded: true });
    },
  },
}));
