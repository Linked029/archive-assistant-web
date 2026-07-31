﻿import { useState, useEffect } from "react";
import { ArchiveDialog, ActionButton } from "../components/ArchiveDialog";
import { useUiStore } from "../../store/ui-store";
import { useTopicStore } from "../../store/topic-store";
import { useItemStore } from "../../store/item-store";
import { colors, fonts } from "../theme/imperial-palette";

export function TopicNameDialog() {
  const { topicNameDialogMode, topicNameDialogTopicId, actions: uiActions } = useUiStore();
  const topicActions = useTopicStore((s) => s.actions);
  const topics = useTopicStore((s) => s.topics);

  const isCreate = topicNameDialogMode === "create";
  const [name, setName] = useState("");
  const existingTopic = topicNameDialogTopicId ? topics.find((t) => t.id === topicNameDialogTopicId) : null;

  useEffect(() => {
    if (!isCreate && existingTopic) {
      setName(existingTopic.title);
    } else {
      setName("");
    }
  }, [topicNameDialogMode, topicNameDialogTopicId]);

  const handleConfirm = async () => {
    if (!name.trim()) return;
    if (isCreate) {
      await topicActions.addTopic(name.trim());
    } else if (topicNameDialogTopicId) {
      await topicActions.renameTopic(topicNameDialogTopicId, name.trim());
    }
    uiActions.closeTopicNameDialog();
  };

  const inputBase = {
    display: "block" as const,
    width: "100%",
    marginTop: "4px",
    padding: "8px",
    fontFamily: fonts.ui,
    fontSize: "14px",
    border: `1px solid ${colors.border.light}`,
    borderRadius: "6px",
    background: colors.bg.surface,
    color: colors.text.primary,
    boxSizing: "border-box" as const,
  };

  return (
    <ArchiveDialog
      open={topicNameDialogMode !== null}
      onClose={uiActions.closeTopicNameDialog}
      title={isCreate ? "新建主题" : "重命名主题"}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          主题名称
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputBase} placeholder="输入主题名称" autoFocus />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
          <ActionButton label="取消" variant="ghost" onClick={uiActions.closeTopicNameDialog} />
          <ActionButton label={isCreate ? "创建" : "确认"} onClick={handleConfirm} disabled={!name.trim()} />
        </div>
      </div>
    </ArchiveDialog>
  );
}

export function DeleteConfirmDialog() {
  const { deleteConfirmTopicId, deleteConfirmItemId, actions: uiActions } = useUiStore();
  const topicActions = useTopicStore((s) => s.actions);
  const itemActions = useItemStore((s) => s.actions);
  const topics = useTopicStore((s) => s.topics);
  const items = useItemStore((s) => s.items);

  const isDeletingTopic = deleteConfirmTopicId !== null;
  const targetId = deleteConfirmTopicId || deleteConfirmItemId;
  const targetName = isDeletingTopic
    ? topics.find((t) => t.id === targetId)?.title
    : items.find((i) => i.id === targetId)?.title;

  const handleConfirm = async () => {
    try {
      if (deleteConfirmTopicId) await topicActions.removeTopic(deleteConfirmTopicId);
      if (deleteConfirmItemId) await itemActions.removeItem(deleteConfirmItemId);
    } catch (e) {
      console.error("Delete failed:", e);
    }
    uiActions.closeDeleteConfirmDialog();
  };

  return (
    <ArchiveDialog
      open={deleteConfirmTopicId !== null || deleteConfirmItemId !== null}
      onClose={uiActions.closeDeleteConfirmDialog}
      title="确认删除"
    >
      <p style={{ fontFamily: fonts.body, color: colors.text.primary, margin: "0 0 16px" }}>
        确定要删除【{targetName || "此项"}】吗？此操作不可撤销。
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <ActionButton label="取消" variant="ghost" onClick={uiActions.closeDeleteConfirmDialog} />
        <ActionButton label="删除" variant="danger" onClick={handleConfirm} />
      </div>
    </ArchiveDialog>
  );
}

export function ClipboardDialog() {
  const { showClipboardDialog, actions: uiActions } = useUiStore();
  const itemActions = useItemStore((s) => s.actions);
  const topics = useTopicStore((s) => s.topics);
  const selectedTopicId = useUiStore((s) => s.selectedTopicId);

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState(selectedTopicId || topics[0]?.id || "");

  useEffect(() => {
    if (showClipboardDialog) {
      setTopicId(selectedTopicId || topics[0]?.id || "");
    }
  }, [showClipboardDialog, selectedTopicId, topics]);

  const handleImport = async () => {
    if (!content.trim()) return;
    await itemActions.addItem({
      topicId,
      contentType: "WEB_ARTICLE" as any,
      title: title.trim() || content.trim().slice(0, 28),
      summary: content.trim().slice(0, 96),
      fullText: content.trim(),
    });
    uiActions.closeClipboardDialog();
    setContent("");
    setTitle("");
  };

  const inputBase = {
    display: "block" as const,
    width: "100%",
    marginTop: "4px",
    padding: "8px",
    fontFamily: fonts.ui,
    fontSize: "14px",
    border: `1px solid ${colors.border.light}`,
    borderRadius: "6px",
    background: colors.bg.surface,
    color: colors.text.primary,
    boxSizing: "border-box" as const,
  };

  return (
    <ArchiveDialog
      open={showClipboardDialog}
      onClose={uiActions.closeClipboardDialog}
      title="粘贴板导入"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          目标主题
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} style={inputBase}>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          标题（可选）
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputBase} />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          内容 *
          <textarea value={content} onChange={(e) => setContent(e.target.value)} style={{ ...inputBase, minHeight: "120px", resize: "vertical" as const }} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
          <ActionButton label="取消" variant="ghost" onClick={uiActions.closeClipboardDialog} />
          <ActionButton label="导入" onClick={handleImport} disabled={!content.trim()} />
        </div>
      </div>
    </ArchiveDialog>
  );
}
