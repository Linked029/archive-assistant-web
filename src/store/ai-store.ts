import { create } from 'zustand';
import type { AiEngineSettings, AiEnginePreset } from '../models/ai-settings';
import { DEFAULT_AI_SETTINGS } from '../models/ai-settings';
import { loadAiSettings, loadAiPresets, saveAiPresets } from '../lib/db';
import { api } from '../lib/api';

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
      const saved = await loadAiSettings();
      const presets = await loadAiPresets();
      set({
        settings: saved ?? DEFAULT_AI_SETTINGS,
        presets,
        loaded: true,
      });
    },

    updateSettings: async (partial) => {
      const next = { ...get().settings, ...partial };
      set({ settings: next });
      await api.updateAiSettings(next);
    },

    replaceSettings: async (s) => {
      set({ settings: s });
      await api.updateAiSettings(s);
    },

    addPreset: async (p) => {
      const presets = [...get().presets, p];
      await saveAiPresets(presets);
      set({ presets });
    },

    removePreset: async (name) => {
      const presets = get().presets.filter((p) => p.name !== name);
      await saveAiPresets(presets);
      set({ presets });
    },
  },
}));
