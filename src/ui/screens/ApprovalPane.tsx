import { useEffect, useState } from "react";
import { Check, X, RotateCcw, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { V3Pane } from "../layout/V3Pane";
import { api, type ApiItem, type ApiMinistry } from "../../lib/api";
import { colors, fonts } from "../theme/imperial-palette";

export function ApprovalPane() {
  const [items, setItems] = useState<ApiItem[]>([]);
  const [ministries, setMinistries] = useState<ApiMinistry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ itemId: string; type: "reject" | "redraft" } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const [itemList, ministryList, settings] = await Promise.all([
        api.listItems({ status: "candidate,pending" }),
        api.listMinistries(),
        api.getSettings(),
      ]);
      setItems(itemList);
      setMinistries(ministryList);
      setThreshold(settings.autoApproveThreshold);
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法连接本地服务");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setItems(await api.listItems({ status: "candidate,pending" }));
  };

  const approve = async (item: ApiItem) => {
    try {
      setSubmitting(true);
      await api.approveItem(item.id);
      await refresh();
      setMessage(`已准奏：${item.title}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "准奏失败");
    } finally {
      setSubmitting(false);
    }
    setTimeout(() => setMessage(null), 2000);
  };

  const openAction = (item: ApiItem, type: "reject" | "redraft") => {
    setActionTarget({ itemId: item.id, type });
    setActionReason("");
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    const { itemId, type } = actionTarget;
    const target = items.find((i) => i.id === itemId);
    try {
      setSubmitting(true);
      const reason = actionReason.trim() || undefined;
      if (type === "reject") {
        await api.rejectItem(itemId, reason);
      } else {
        await api.redraftItem(itemId, reason);
      }
      await refresh();
      setActionTarget(null);
      setActionReason("");
      setMessage(type === "reject" ? `已驳回：${target?.title || ""}` : `已打回重拟：${target?.title || ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
    setTimeout(() => setMessage(null), 2000);
  };

  const saveThreshold = async () => {
    await api.updateAutoApproveThreshold(threshold);
    setMessage("自动准奏阈值已保存");
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <V3Pane
      title="门下省 · 批阅"
      subtitle={`待批 ${items.length} 份`}
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="number"
            min={0}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{
              width: "56px",
              padding: "6px",
              border: `1px solid ${colors.border.light}`,
              borderRadius: "6px",
              background: colors.bg.surface,
              color: colors.text.primary,
              fontFamily: fonts.ui,
              fontSize: "13px",
            }}
            title="自动准奏阈值"
          />
          <button onClick={saveThreshold} style={smallButtonStyle} title="保存自动准奏阈值">
            阈值
          </button>
        </div>
      }
    >
      <p style={{ fontSize: "12px", color: colors.text.muted, margin: "0 0 12px" }}>
        质量分达到阈值的拟折会在采集时自动准奏；阈值为 0 时全部留待人工批阅。
      </p>

      {error && (
        <div style={noticeStyle(true)}>{error}。请确认本地服务已启动。</div>
      )}
      {message && <div style={noticeStyle(false)}>{message}</div>}

      {items.length === 0 && !error ? (
        <p style={{ color: colors.text.muted, textAlign: "center", marginTop: "48px" }}>门下省无待批奏折</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((item) => {
            const ministry = ministries.find((m) => m.id === item.ministryId);
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", color: "#fff", background: ministry?.color || colors.text.muted }}>
                    {ministry?.title || "未知"}
                  </span>
                  <span style={{ fontSize: "11px", color: colors.text.muted }}>
                    {item.status === "pending" ? "打回重拟" : "拟折"} · 质量 {item.qualityScore}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                    style={miniButtonStyle}
                    title="展开全文"
                  >
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "15px", fontWeight: 600, color: colors.text.primary }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "13px", color: colors.text.secondary, marginTop: "4px", lineHeight: 1.5 }}>
                  {item.summary || "无摘要"}
                </div>
                <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "6px" }}>
                  {item.aiReason || "无拟折理由"}
                  {item.redraftCount > 0 && ` · 已打回 ${item.redraftCount} 次`}
                </div>
                {expanded && item.fullText && (
                  <pre style={fullTextStyle}>{item.fullText.slice(0, 6000)}</pre>
                )}
                {item.sourceUrl && (
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#4A7C59", marginTop: "6px" }}>
                    <ExternalLink size={12} /> 原文
                  </a>
                )}
                <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                  <button onClick={() => approve(item)} disabled={submitting} style={{ ...actionButtonStyle, background: "#4A7C59" }}>
                    <Check size={14} /> 准奏
                  </button>
                  <button onClick={() => openAction(item, "redraft")} disabled={submitting} style={{ ...actionButtonStyle, background: colors.border.dark }}>
                    <RotateCcw size={14} /> 打回
                  </button>
                  <button onClick={() => openAction(item, "reject")} disabled={submitting} style={{ ...actionButtonStyle, background: colors.accent.primary }}>
                    <X size={14} /> 驳回
                  </button>
                </div>
                {actionTarget?.itemId === item.id && (
                  <div style={actionFormStyle}>
                    <div style={{ fontSize: "12px", color: colors.text.secondary, marginBottom: "6px" }}>
                      {actionTarget.type === "reject" ? "驳回原因（可选，记入驳回日志）" : "打回重拟原因（可选）"}
                    </div>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      rows={2}
                      placeholder={actionTarget.type === "reject" ? "与本部偏好不符等" : "标题不够准确、摘要待重拟等"}
                      style={reasonInputStyle}
                    />
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                      <button onClick={confirmAction} disabled={submitting} style={{ ...actionButtonStyle, background: colors.accent.primary }}>
                        {submitting ? "处理中…" : "确认"}
                      </button>
                      <button onClick={() => setActionTarget(null)} disabled={submitting} style={{ ...actionButtonStyle, background: colors.border.medium }}>
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </V3Pane>
  );
}

const cardStyle: React.CSSProperties = {
  padding: "14px",
  background: colors.bg.surface,
  border: `1px solid ${colors.border.light}`,
  borderRadius: "8px",
};

const fullTextStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: "260px",
  overflowY: "auto",
  padding: "10px",
  margin: "8px 0 0",
  background: colors.bg.canvas,
  border: `1px solid ${colors.border.light}`,
  borderRadius: "6px",
  fontFamily: fonts.body,
  fontSize: "13px",
  lineHeight: 1.7,
  color: colors.text.primary,
};

const actionButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "6px 12px",
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  cursor: "pointer",
  fontFamily: fonts.ui,
  fontSize: "13px",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: `1px solid ${colors.border.medium}`,
  borderRadius: "6px",
  background: colors.bg.surface,
  color: colors.text.secondary,
  cursor: "pointer",
  fontSize: "12px",
  fontFamily: fonts.ui,
};

const miniButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: colors.text.muted,
  padding: "4px",
};

const actionFormStyle: React.CSSProperties = {
  marginTop: "10px",
  padding: "10px",
  background: colors.bg.canvas,
  border: `1px solid ${colors.border.light}`,
  borderRadius: "6px",
};

const reasonInputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px",
  fontFamily: fonts.ui,
  fontSize: "13px",
  border: `1px solid ${colors.border.light}`,
  borderRadius: "6px",
  background: colors.bg.surface,
  color: colors.text.primary,
  boxSizing: "border-box",
  resize: "vertical",
};

function noticeStyle(isError: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    marginBottom: "12px",
    borderRadius: "6px",
    fontSize: "13px",
    background: isError ? colors.accent.light : "rgba(74, 124, 89, 0.12)",
    color: isError ? colors.accent.primary : "#3A6B47",
  };
}
