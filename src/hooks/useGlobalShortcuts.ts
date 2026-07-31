import { useEffect } from "react";
import { useUiStore } from "../store/ui-store";

/**
 * Global keyboard shortcuts:
 * N = new item, S = focus search, Esc = close dialogs.
 */
export function useGlobalShortcuts() {
  const uiActions = useUiStore((s) => s.actions);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;

      if (e.key === "Escape") {
        const state = useUiStore.getState();
        if (state.addItemDialogVisible || state.editingItemId) {
          uiActions.closeAddItemDialog();
          uiActions.cancelEditItem();
        } else if (state.topicNameDialogMode) {
          uiActions.closeTopicNameDialog();
        } else if (state.deleteConfirmTopicId || state.deleteConfirmItemId) {
          uiActions.closeDeleteConfirmDialog();
        } else if (state.showClipboardDialog) {
          uiActions.closeClipboardDialog();
        }
        return;
      }

      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "n") {
        e.preventDefault();
        uiActions.openAddItemDialog();
      } else if (key === "s") {
        e.preventDefault();
        document.getElementById("home-search-input")?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [uiActions]);
}