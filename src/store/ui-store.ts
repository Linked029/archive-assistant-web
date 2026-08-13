﻿import { create } from 'zustand';

export type AppPane =
  | 'topics'
  | 'memorial'
  | 'detail'
  | 'settings'
  | 'manage'
  | 'card-detail'
  | 'article-reader'
  | 'dashboard'
  | 'approval'
  | 'sources'
  | 'preferences'
  | 'review'
  | 'exploration';

interface UiState {
  selectedPane: AppPane;
  selectedTopicId: string | null;
  homeSearchQuery: string;
  activeDetailFilter: string;
  addItemDialogVisible: boolean;
  editingItemId: string | null;
  topicNameDialogMode: 'create' | 'rename' | null;
  topicNameDialogTopicId: string | null;
  deleteConfirmTopicId: string | null;
  deleteConfirmItemId: string | null;
  showClipboardDialog: boolean;
  readingItemId: string | null;
  noticeMessage: string | null;
  isSmartSummarizing: boolean;
  smartSummarizationMessage: string | null;
  badgeRefreshTick: number;

  actions: {
    navigateTo: (pane: AppPane, topicId?: string) => void;
    setSearchQuery: (q: string) => void;
    setDetailFilter: (f: string) => void;
    openAddItemDialog: () => void;
    closeAddItemDialog: () => void;
    startEditItem: (id: string) => void;
    cancelEditItem: () => void;
    openCreateTopicDialog: () => void;
    openRenameTopicDialog: (id: string) => void;
    closeTopicNameDialog: () => void;
    confirmDeleteTopic: (id: string) => void;
    confirmDeleteItem: (id: string) => void;
    closeDeleteConfirmDialog: () => void;
    showNotice: (msg: string) => void;
    dismissNotice: () => void;
    setSmartSummarizing: (v: boolean) => void;
    setSummarizationMessage: (msg: string | null) => void;
    refreshBadges: () => void;
    openClipboardDialog: () => void;
    closeClipboardDialog: () => void;
    openReadingItem: (id: string) => void;
    clearReadingItem: () => void;
    reset: () => void;
  };
}

const initial = {
  selectedPane: 'dashboard' as AppPane,
  selectedTopicId: null as string | null,
  homeSearchQuery: '',
  activeDetailFilter: 'ALL',
  addItemDialogVisible: false,
  editingItemId: null as string | null,
  topicNameDialogMode: null as 'create' | 'rename' | null,
  topicNameDialogTopicId: null as string | null,
  deleteConfirmTopicId: null as string | null,
  deleteConfirmItemId: null as string | null,
  showClipboardDialog: false,
  readingItemId: null as string | null,
  noticeMessage: null as string | null,
  isSmartSummarizing: false,
  smartSummarizationMessage: null as string | null,
  badgeRefreshTick: 0,
};

export const useUiStore = create<UiState>()((set) => ({
  ...initial,
  actions: {
    navigateTo: (pane, topicId) => set({ selectedPane: pane, selectedTopicId: topicId ?? null }),
    setSearchQuery: (q) => set({ homeSearchQuery: q }),
    setDetailFilter: (f) => set({ activeDetailFilter: f }),
    openAddItemDialog: () => set({ addItemDialogVisible: true }),
    closeAddItemDialog: () => set({ addItemDialogVisible: false }),
    startEditItem: (id) => set({ editingItemId: id }),
    cancelEditItem: () => set({ editingItemId: null }),
    openCreateTopicDialog: () => set({ topicNameDialogMode: 'create', topicNameDialogTopicId: null }),
    openRenameTopicDialog: (id) => set({ topicNameDialogMode: 'rename', topicNameDialogTopicId: id }),
    closeTopicNameDialog: () => set({ topicNameDialogMode: null, topicNameDialogTopicId: null }),
    confirmDeleteTopic: (id) => set({ deleteConfirmTopicId: id }),
    confirmDeleteItem: (id) => set({ deleteConfirmItemId: id }),
    closeDeleteConfirmDialog: () => set({ deleteConfirmTopicId: null, deleteConfirmItemId: null }),
    showNotice: (msg) => set({ noticeMessage: msg }),
    dismissNotice: () => set({ noticeMessage: null }),
    setSmartSummarizing: (v) => set({ isSmartSummarizing: v }),
    setSummarizationMessage: (msg) => set({ smartSummarizationMessage: msg }),
    refreshBadges: () => set((state) => ({ badgeRefreshTick: state.badgeRefreshTick + 1 })),
    openClipboardDialog: () => set({ showClipboardDialog: true }),
    closeClipboardDialog: () => set({ showClipboardDialog: false }),
    openReadingItem: (id: string) => set({ readingItemId: id }),
    clearReadingItem: () => set({ readingItemId: null }),
    reset: () => set({ ...initial }),
  },
}));
