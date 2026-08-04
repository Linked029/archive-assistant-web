import { Plus, Settings, Pencil, Trash2, Folder, LayoutDashboard, Stamp, Rss, SlidersHorizontal, BookOpen, Compass } from "lucide-react";
import { useEffect, useState } from "react";
import { PaneContainer, PaneContent } from "../layout/PaneContainer";
import { PaneHeader } from "../layout/PaneHeader";
import { useUiStore } from "../../store/ui-store";
import { useTopicStore } from "../../store/topic-store";
import { useItemStore, getItemsByTopic } from "../../store/item-store";
import { searchItems } from "../../lib/search";
import { colors, fonts } from "../theme/imperial-palette";
import type { Topic } from "../../models/topic";
import { SIX_MINISTRIES } from "../../models/topic";
import { api } from "../../lib/api";

export function HomePane() {
  const { homeSearchQuery, actions: uiActions } = useUiStore();
  const selectedPane = useUiStore((s) => s.selectedPane);
  const topics = useTopicStore((s) => s.topics);
  const items = useItemStore((s) => s.items);
  const itemsByTopic = items.length > 0 ? getItemsByTopic(items) : {};

  const [pendingCount, setPendingCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    api.dashboard()
      .then((d) => setPendingCount(d.today.pending))
      .catch(() => {});
    api.getLearningStats()
      .then((s) => setDueCount(s.dueToday))
      .catch(() => {});
  }, []);

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
      <div style={{ display: "flex", gap: "6px", padding: "8px 12px", borderBottom: `1px solid ${colors.border.light}` }}>
        <NavItem active={selectedPane === "dashboard"} label="工作台" onClick={() => uiActions.navigateTo("dashboard")} icon={<LayoutDashboard size={14} />} />
        <NavItem active={selectedPane === "approval"} label="门下省" badge={pendingCount} onClick={() => uiActions.navigateTo("approval")} icon={<Stamp size={14} />} />
        <NavItem active={selectedPane === "review"} label="复习" badge={dueCount} onClick={() => uiActions.navigateTo("review")} icon={<BookOpen size={14} />} />
        <NavItem active={selectedPane === "sources"} label="信息源" onClick={() => uiActions.navigateTo("sources")} icon={<Rss size={14} />} />
        <NavItem active={selectedPane === "preferences"} label="偏好卡" onClick={() => uiActions.navigateTo("preferences")} icon={<SlidersHorizontal size={14} />} />
        <NavItem active={selectedPane === "exploration"} label='探索卷宗' onClick={() => uiActions.navigateTo("exploration")} icon={<Compass size={14} />} />
      </div>
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
                onDelete={SIX_MINISTRIES.some((t) => t.id === topic.id) ? undefined : () => uiActions.confirmDeleteTopic(topic.id)}
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
  topic: Topic; itemCount: number; onClick: () => void; onEdit: () => void; onDelete?: () => void;
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
        {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={miniBtnStyle} title="删除"><Trash2 size={12} /></button>}
      </div>
    </div>
  );
}

function NavItem({ active, label, badge, onClick, icon }: {
  active: boolean;
  label: string;
  badge?: number;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "6px 10px",
        borderRadius: "6px",
        border: `1px solid ${active ? colors.accent.primary : colors.border.light}`,
        background: active ? colors.accent.light : colors.bg.canvas,
        color: active ? colors.accent.primary : colors.text.secondary,
        cursor: "pointer",
        fontSize: "12px",
        fontFamily: fonts.ui,
        position: "relative",
      }}
    >
      {icon} {label}
      {badge !== undefined && badge > 0 && (
        <span style={{
          minWidth: "16px",
          height: "16px",
          padding: "0 4px",
          borderRadius: "8px",
          background: colors.accent.primary,
          color: "#fff",
          fontSize: "10px",
          lineHeight: "16px",
          textAlign: "center",
          fontFamily: fonts.ui,
        }}>
          {badge}
        </span>
      )}
    </button>
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
