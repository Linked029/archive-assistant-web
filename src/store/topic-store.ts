﻿import { create } from 'zustand';
import type { Topic } from '../models/topic';
import { loadAllTopics, saveTopic, deleteTopic as deleteTopicDb } from '../lib/db';
import { api } from '../lib/api';

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
      set({ topics: existing, loaded: true });
    },

    addTopic: async (title) => {
      const created = await api.createMinistry({
        title,
        icon: 'folder-spark',
        color: '#8B7D6B',
      });
      const topic: Topic = {
        id: created.id,
        title: created.title,
        iconName: created.icon,
        iconColor: created.color,
        updatedAtEpochMillis: Date.now(),
        order: created.order,
      };
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
