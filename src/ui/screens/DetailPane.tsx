import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PaneContainer, PaneContent } from "../layout/PaneContainer";
import { PaneHeader } from "../layout/PaneHeader";
import { MemorialReader } from "../memorial/MemorialReader";
import { useUiStore } from "../../store/ui-store";
import { useTopicStore } from "../../store/topic-store";
import { useItemStore, getFilteredItems } from "../../store/item-store";
import { ArchiveChip } from "../components/ArchiveDialog";
import { CONTENT_TYPE_LABELS } from "../../models/item";
import type { ContentType } from "../../models/item";
import type { KnowledgeItem } from "../../models/item";
import { ContentType as CT } from "../../models/item";
import { colors, fonts } from "../theme/imperial-palette";

const FILTERS = [CT.ALL, CT.WEB_ARTICLE, CT.IMAGE_SCREENSHOT, CT.DOCUMENT];

export function DetailPane() {
  const { selectedTopicId, activeDetailFilter, readingItemId, actions: uiActions } = useUiStore();
  const topics = useTopicStore((s) => s.topics);
  const items = useItemStore((s) => s.items);
  const [readingItem, setReadingItem] = useState<KnowledgeItem | null>(null);

  // Auto-open item from HomePane recent list
  useEffect(() => {
    if (readingItemId) {
      const item = items.find((i) => i.id === readingItemId);
      if (item) { setReadingItem(item); uiActions.clearReadingItem(); }
    }
  }, [readingItemId, items]);

  const topic = topics.find((t) => t.id === selectedTopicId);
  const filteredItems = selectedTopicId
    ? getFilteredItems(items, selectedTopicId, activeDetailFilter as ContentType)
    : [];

  if (readingItem) {
    return <MemorialReader item={readingItem} onClose={() => setReadingItem(null)} />;
  }

  if (!topic) {
    return (
      <PaneContainer>
        <PaneContent>
          <p style={{ color: colors.text.muted, textAlign: "center", marginTop: "48px" }}>请选择一个主题</p>
        </PaneContent>
      </PaneContainer>
    );
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = items.find((i) => i.id === id);
    if (item && window.confirm("确定删除【" + (item.title || "无标题") + "】？")) {
      useItemStore.getState().actions.removeItem(id).then(() => {
        useItemStore.getState().actions.refreshFromDb();
      });
    }
  };

  const handleClearTopic = async () => {
    const topicItems = items.filter((i) => i.topicId === selectedTopicId);
    if (!topicItems.length) return;
    const store = useItemStore.getState();
    for (const item of topicItems) {
      await store.actions.removeItem(item.id);
    }
    await store.actions.refreshFromDb();
  };

  return (
    <PaneContainer>
      <PaneHeader
        title={topic.title}
        showBackButton
        onBack={() => uiActions.navigateTo("topics")}
        actions={
          <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => uiActions.openAddItemDialog()} style={iconBtnStyle} title="新增">
            <Plus size={18} />
          </button>
          {filteredItems.length > 0 && (
            <button onClick={async () => { if (window.confirm('确定清空【' + topic.title + '】下所有 ' + filteredItems.length + ' 条条目？')) { await handleClearTopic(); } }} style={{ ...iconBtnStyle, color: "#C23B22" }} title="清空全部">
              <Trash2 size={16} />
            </button>
          )}
          </div>
        }
      />
      <div style={{ display: "flex", gap: "6px", padding: "8px 16px", flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <ArchiveChip key={f} label={CONTENT_TYPE_LABELS[f]} selected={activeDetailFilter === f} onClick={() => uiActions.setDetailFilter(f)} />
        ))}
      </div>
      <PaneContent>
        {filteredItems.length === 0 ? (
          <p style={{ color: colors.text.muted, textAlign: "center", marginTop: "48px" }}>暂无归档内容</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "12px",
                  background: colors.bg.canvas,
                  borderRadius: "8px",
                  border: `1px solid ${colors.border.light}`,
                  cursor: "pointer",
                }}
                onClick={() => setReadingItem(item)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.medium; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.light; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontFamily: fonts.body, fontSize: "15px", fontWeight: 500, flex: 1 }}>{item.title}</div>
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); uiActions.startEditItem(item.id); }} style={miniBtnStyle} title="编辑">
                      <Pencil size={12} />
                    </button>
                    <button onClick={(e) => handleDelete(e, item.id)} style={{ ...miniBtnStyle, color: "#C23B22" }} title="删除此条目">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: colors.text.secondary, marginTop: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.summary}
                </div>
                <div style={{ fontSize: "11px", color: colors.text.muted, marginTop: "6px" }}>
                  {CONTENT_TYPE_LABELS[item.contentType] || item.contentType}
                  {item.fileName ? ' · ' + item.fileName : ''}
                  <span style={{ float: "right" }}>📖 点击阅读</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </PaneContent>
    </PaneContainer>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: colors.text.secondary, padding: "4px 8px", borderRadius: "6px",
  display: "flex", alignItems: "center",
};

const miniBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: colors.text.muted, padding: "2px 4px",
  display: "flex", alignItems: "center",
};
