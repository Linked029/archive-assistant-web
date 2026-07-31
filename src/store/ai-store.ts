import { create } from 'zustand';
import type { AiEngineSettings, AiEnginePreset } from '../models/ai-settings';
import { DEFAULT_AI_SETTINGS } from '../models/ai-settings';
import { db } from '../lib/db';

interface AiState {
  settings: AiEngineSettings;
  presets: AiEnginePreset[];
  loaded: boolean;
  actions: {
    initialize: () => Promise<void>;
    updateSettings: (s: Partial<AiEngineSettings>) => Promise<void>;
    replaceSettings: (s: AiEngineSettings) => Promise<void>;
    addPreset: (p: AiEnginePreset) => Promise<void>;
    removePreset: (name: string) => Promise<void>;
  };
}

export const useAiStore = create<AiState>()((set, get) => ({
  settings: DEFAULT_AI_SETTINGS,
  presets: [],
  loaded: false,
  actions: {
    initialize: async () => {
      const saved = await db.aiSettings.toArray();
      const presets = await db.aiPresets.toArray();
      set({
        settings: saved[0] ?? DEFAULT_AI_SETTINGS,
        presets,
        loaded: true,
      });
    },

    updateSettings: async (partial) => {
      const next = { ...get().settings, ...partial };
      set({ settings: next });
      await db.aiSettings.put(next);
    },

    replaceSettings: async (s) => {
      set({ settings: s });
      await db.aiSettings.put(s);
    },

    addPreset: async (p) => {
      await db.aiPresets.put(p);
      set({ presets: [...get().presets, p] });
    },

    removePreset: async (name) => {
      await db.aiPresets.delete(name);
      set({ presets: get().presets.filter((p) => p.name !== name) });
    },
  },
}));
