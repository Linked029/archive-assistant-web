import { Plus, Settings, Pencil, Trash2, Folder } from "lucide-react";
import { PaneContainer, PaneContent } from "../layout/PaneContainer";
import { PaneHeader } from "../layout/PaneHeader";
import { useUiStore } from "../../store/ui-store";
import { useTopicStore } from "../../store/topic-store";
import { useItemStore, getItemsByTopic } from "../../store/item-store";
import { searchItems } from "../../lib/search";
import { colors, fonts } from "../theme/imperial-palette";
import type { Topic } from "../../models/topic";

export function HomePane() {
  const { homeSearchQuery, actions: uiActions } = useUiStore();
  const topics = useTopicStore((s) => s.topics);
  const items = useItemStore((s) => s.items);
  const itemsByTopic = items.length > 0 ? getItemsByTopic(items) : {};

  const recentItems = items.length > 0
    ? items
        .filter((i) => i.title)
        .sort((a, b) => b.createdAtEpochMillis - a.createdAtEpochMillis)
        .slice(0, 6)
    : [];

  const searchResults = homeSearchQuery.trim() ? searchItems(items, homeSearchQuery) : [];
  const matchedTopicIds = new Set(searchResults.map((i) => i.topicId));
  const displayTopics = homeSearchQuery.trim()
    ? topics.filter((t) => matchedTopicIds.has(t.id) || t.title.toLowerCase().includes(homeSearchQuery.toLowerCase()))
    : topics;

  return (
    <PaneContainer>
      <PaneHeader
        title="聚合拾遗"
        subtitle="六部"
        actions={
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={() => uiActions.navigateTo("settings")} style={iconBtnStyle} title="设置">
              <Settings size={18} />
            </button>
            <button onClick={() => uiActions.openCreateTopicDialog()} style={iconBtnStyle} title="新建主题">
              <Plus size={18} />
            </button>
          </div>
        }
      />
      {recentItems.length > 0 && !homeSearchQuery.trim() && (
        <div style={{ padding: "0 16px 12px", borderBottom: `1px solid ${colors.border.light}` }}>
          <div style={{ fontFamily: fonts.heading, fontSize: "14px", color: colors.text.secondary, marginBottom: "8px" }}>
            待办奏折
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {recentItems.map((item) => {
              const topic = topics.find((t) => t.id === item.topicId);
              return (
                <div
                  key={item.id}
                  onClick={() => { uiActions.openReadingItem(item.id); uiActions.navigateTo("detail", item.topicId); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "6px 10px", borderRadius: "6px",
                    cursor: "pointer", transition: "background 0.1s ease",
                    border: `1px solid transparent`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.surfaceHover; e.currentTarget.style.borderColor = colors.border.light; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
                >
                  <span style={{ fontSize: "12px", color: (colors.ministry as any)[item.topicId] || colors.text.muted, minWidth: "40px" }}>
                    {topic?.title || "未知"}
                  </span>
                  <span style={{ flex: 1, fontSize: "13px", color: colors.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.title}
                  </span>
                  <span style={{ fontSize: "11px", color: colors.text.muted }}>
                    {new Date(item.createdAtEpochMillis).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ padding: "8px 16px" }}>
        <input
          type="text"
          id="home-search-input"
          value={homeSearchQuery}
          onChange={(e) => uiActions.setSearchQuery(e.target.value)}
          placeholder="搜索主题或条目… (S)"
          style={{
            width: "100%",
            padding: "8px 12px",
            fontFamily: fonts.ui,
            fontSize: "14px",
            border: `1px solid ${colors.border.light}`,
            borderRadius: "8px",
            background: colors.bg.canvas,
            color: colors.text.primary,
            boxSizing: "border-box",
          }}
        />
      </div>
      {homeSearchQuery.trim() && searchResults.length > 0 && (
        <div style={{ padding: "4px 16px 8px", fontSize: "12px", color: colors.text.muted }}>
          找到 {searchResults.length} 条相关条目
        </div>
      )}
      <PaneContent>
        {displayTopics.length === 0 ? (
          <p style={{ color: colors.text.muted, textAlign: "center", marginTop: "48px" }}>
            {homeSearchQuery.trim() ? "没有匹配的主题" : "暂无主题，点击 + 新建"}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {displayTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                itemCount={(itemsByTopic[topic.id] || []).length}
                onClick={() => uiActions.navigateTo("detail", topic.id)}
                onEdit={() => uiActions.openRenameTopicDialog(topic.id)}
                onDelete={() => uiActions.confirmDeleteTopic(topic.id)}
              />
            ))}
          </div>
        )}
      </PaneContent>
      <div style={{ position: "sticky", bottom: "16px", display: "flex", justifyContent: "center", padding: "8px" }}>
        <button
          onClick={() => uiActions.openAddItemDialog()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 20px",
            background: colors.accent.primary,
            color: "#fff",
            border: "none",
            borderRadius: "24px",
            cursor: "pointer",
            fontFamily: fonts.ui,
            fontSize: "15px",
            boxShadow: "0 2px 12px rgba(194, 59, 34, 0.3)",
          }}
        >
          <Plus size={18} /> 新增归档
        </button>
      </div>
    </PaneContainer>
  );
}

function TopicCard({ topic, itemCount, onClick, onEdit, onDelete }: {
  topic: Topic; itemCount: number; onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        padding: "20px 12px 16px",
        background: colors.bg.canvas,
        border: `1px solid ${colors.border.light}`,
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        fontFamily: fonts.ui,
        color: colors.text.primary,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.bg.surfaceHover;
        e.currentTarget.style.borderColor = colors.border.medium;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.bg.canvas;
        e.currentTarget.style.borderColor = colors.border.light;
      }}
    >
      <Folder size={28} color={topic.iconColor || colors.text.muted} />
      <span style={{ fontFamily: fonts.heading, fontSize: "15px" }}>{topic.title}</span>
      <span style={{ fontSize: "12px", color: colors.text.muted }}>{itemCount} 条归档</span>
      <div
        style={{
          position: "absolute",
          top: "6px",
          right: "6px",
          display: "flex",
          gap: "4px",
          opacity: 0,
          transition: "opacity 0.1s ease",
        }}
        className="topic-card-actions"
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
      >
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={miniBtnStyle} title="重命名"><Pencil size={12} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={miniBtnStyle} title="删除"><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: colors.text.secondary,
  padding: "4px 8px",
  borderRadius: "6px",
  display: "flex",
  alignItems: "center",
};

const miniBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: colors.text.muted,
  padding: "2px 4px",
  display: "flex",
  alignItems: "center",
};
