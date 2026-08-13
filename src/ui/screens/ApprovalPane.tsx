import { useEffect, useState, lazy, Suspense } from "react";
import { Check, X, RotateCcw, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { V3Pane } from "../layout/V3Pane";
import { api, type ApiItem, type ApiMinistry } from "../../lib/api";
import { useUiStore } from "../../store/ui-store";
import { colors, fonts } from "../theme/imperial-palette";

const ReactMarkdown = lazy(() => import("react-markdown"));
import remarkGfm from "remark-gfm";

export function ApprovalPane() {
  const [items, setItems] = useState<ApiItem[]>([]);
  const [ministries, setMinistries] = useState<ApiMinistry[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [threshold, setThreshold] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ itemId: string; type: "reject" | "redraft" } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const uiActions = useUiStore((s) => s.actions);

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
      // Auto-expand all
      // Keep collapsed initially
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法连接本地服务");
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const refresh = async () => {
    const list = await api.listItems({ status: "candidate,pending" });
    setItems(list);
    // Keep current state
  };

  const approve = async (item: ApiItem) => {
    try {
      setSubmitting(true);
      await api.approveItem(item.id);
      uiActions.refreshBadges();
      await refresh();
      setMessage("已准奏：" + item.title);
    }
    catch (e) { setError(e instanceof Error ? e.message : "准奏失败"); }
    finally { setSubmitting(false); }
    setTimeout(() => setMessage(null), 2000);
  };

  const openAction = (item: ApiItem, type: "reject" | "redraft") => {
    setActionTarget({ itemId: item.id, type }); setActionReason("");
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    const { itemId, type } = actionTarget;
    const target = items.find((i) => i.id === itemId);
    try {
      setSubmitting(true);
      const reason = actionReason.trim() || undefined;
      if (type === "reject") await api.rejectItem(itemId, reason);
      else await api.redraftItem(itemId, reason);
      uiActions.refreshBadges();
      await refresh();
      setActionTarget(null); setActionReason("");
      setMessage(type === "reject" ? "已驳回：" + (target?.title || "") : "已打回重拟：" + (target?.title || ""));
    } catch (e) { setError(e instanceof Error ? e.message : "操作失败"); }
    finally { setSubmitting(false); }
    setTimeout(() => setMessage(null), 2000);
  };

  const saveThreshold = async () => {
    await api.updateAutoApproveThreshold(threshold);
    setMessage("自动准奏阈值已保存");
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <V3Pane title="门下省 · 批阅" subtitle={"待批 " + items.length + " 份"}
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input type="number" min={0} max={100} value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ width: "56px", padding: "6px", border: "1px solid " + colors.border.light, borderRadius: "6px", background: colors.bg.surface, color: colors.text.primary, fontFamily: fonts.ui, fontSize: "13px" }}
            title="自动准奏阈值" />
          <button onClick={saveThreshold} style={{ padding: "6px 10px", border: "1px solid " + colors.border.medium, borderRadius: "6px", background: colors.bg.surface, color: colors.text.secondary, cursor: "pointer", fontSize: "12px", fontFamily: fonts.ui }}>
            阈值
          </button>
        </div>
      }>

      <p style={{ fontSize: "12px", color: colors.text.muted, margin: "0 0 12px" }}>
        阈值为 0 时全部留待人工批阅。准奏后自动归入六部，可阅读、批注、复习。
      </p>

      {error && <div style={{ padding: "8px 12px", marginBottom: "12px", borderRadius: "6px", fontSize: "13px", background: colors.accent.light, color: colors.accent.primary }}>{error}</div>}
      {message && <div style={{ padding: "8px 12px", marginBottom: "12px", borderRadius: "6px", fontSize: "13px", background: "rgba(74, 124, 89, 0.12)", color: "#3A6B47" }}>{message}</div>}

      {items.length === 0 && !error ? (
        <p style={{ color: colors.text.muted, textAlign: "center", marginTop: "48px" }}>门下省无待批奏折</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((item) => {
            const ministry = ministries.find((m) => m.id === item.ministryId);
            const expanded = expandedIds.has(item.id);
            return (
              <div key={item.id} style={{ padding: "16px", background: colors.bg.surface, border: "1px solid " + colors.border.light, borderRadius: "8px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", color: "#fff", background: ministry?.color || colors.text.muted }}>
                    {ministry?.title || "未知"}
                  </span>
                  <span style={{ fontSize: "11px", color: colors.text.muted }}>
                    {item.status === "pending" ? "打回重拟" : "拟折"} · 质量 {item.qualityScore}
                  </span>
                  {item.redraftCount > 0 && <span style={{ fontSize: "11px", color: colors.accent.primary }}>已打回 {item.redraftCount} 次</span>}
                  <span style={{ flex: 1 }} />
                  <button onClick={() => toggle(item.id)}
                    style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", color: colors.text.muted, fontFamily: fonts.ui, fontSize: "12px", padding: "4px 8px", borderRadius: "4px" }}>
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Title + summary */}
                <div style={{ fontFamily: fonts.body, fontSize: "16px", fontWeight: 600, color: colors.text.primary, marginBottom: "6px" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "13px", color: colors.text.secondary, marginBottom: "6px", lineHeight: 1.6, wordBreak: "break-word", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: expanded ? "unset" : 3, WebkitBoxOrient: "vertical" }}>
                  {item.summary || "无摘要"}
                </div>
                <div style={{ fontSize: "12px", color: colors.text.muted, marginBottom: expanded ? "10px" : "6px" }}>
                  {item.aiReason || ""}
                </div>

                {/* Full text — Markdown when expanded */}
                {expanded && item.fullText && (
                  <div style={{ margin: "8px 0", padding: "12px", background: colors.bg.canvas, border: "1px solid " + colors.border.light, borderRadius: "6px", maxHeight: "400px", overflowY: "auto" }}>
                    <Suspense fallback={<div style={{ fontFamily: fonts.body, fontSize: "13px", color: colors.text.secondary, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.8 }}>{item.fullText.slice(0, 6000)}</div>}>
                      <div style={{ fontFamily: fonts.body, fontSize: "14px", lineHeight: 1.8, color: colors.text.primary }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h3 style={{ fontSize: "18px", margin: "16px 0 8px" }}>{children}</h3>,
                            h2: ({ children }) => <h4 style={{ fontSize: "16px", margin: "14px 0 6px" }}>{children}</h4>,
                            h3: ({ children }) => <h5 style={{ fontSize: "14px", margin: "12px 0 4px" }}>{children}</h5>,
                            p: ({ children }) => <p style={{ margin: "6px 0" }}>{children}</p>,
                            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: colors.accent.primary }}>{children}</a>,
                            code: ({ className, children, ...props }: any) => {
                              const isInline = !className;
                              return isInline
                                ? <code style={{ background: colors.border.light, padding: "2px 6px", borderRadius: "4px", fontSize: "13px" }} {...props}>{children}</code>
                                : <pre style={{ background: colors.border.light, padding: "10px", borderRadius: "6px", overflow: "auto", fontSize: "12px" }}><code className={className} {...props}>{children}</code></pre>;
                            },
                            ul: ({ children }) => <ul style={{ paddingLeft: "20px", margin: "6px 0" }}>{children}</ul>,
                            ol: ({ children }) => <ol style={{ paddingLeft: "20px", margin: "6px 0" }}>{children}</ol>,
                            blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid " + colors.border.medium, paddingLeft: "12px", margin: "8px 0", color: colors.text.secondary }}>{children}</blockquote>,
                          }}>
                          {item.fullText.slice(0, 8000)}
                        </ReactMarkdown>
                      </div>
                    </Suspense>
                  </div>
                )}

                {/* Source link */}
                {item.sourceUrl && (
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#4A7C59", marginTop: "6px", textDecoration: "none" }}>
                    <ExternalLink size={12} /> 查看原文
                  </a>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button onClick={() => approve(item)} disabled={submitting}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontFamily: fonts.ui, fontSize: "13px", background: "#4A7C59" }}>
                    <Check size={14} /> 准奏
                  </button>
                  <button onClick={() => openAction(item, "redraft")} disabled={submitting}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontFamily: fonts.ui, fontSize: "13px", background: colors.border.dark }}>
                    <RotateCcw size={14} /> 打回重拟
                  </button>
                  <button onClick={() => openAction(item, "reject")} disabled={submitting}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontFamily: fonts.ui, fontSize: "13px", background: colors.accent.primary }}>
                    <X size={14} /> 驳回
                  </button>
                </div>

                {/* Action form */}
                {actionTarget?.itemId === item.id && (
                  <div style={{ marginTop: "10px", padding: "10px", background: colors.bg.canvas, border: "1px solid " + colors.border.light, borderRadius: "6px" }}>
                    <div style={{ fontSize: "12px", color: colors.text.secondary, marginBottom: "6px" }}>
                      {actionTarget.type === "reject" ? "驳回原因（可选）" : "打回重拟原因（可选）"}
                    </div>
                    <textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} rows={2}
                      placeholder={actionTarget.type === "reject" ? "与本部偏好不符等" : "标题不够准确、摘要待重拟等"}
                      style={{ display: "block", width: "100%", padding: "8px", fontFamily: fonts.ui, fontSize: "13px", border: "1px solid " + colors.border.light, borderRadius: "6px", background: colors.bg.surface, color: colors.text.primary, boxSizing: "border-box", resize: "vertical" }} />
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                      <button onClick={confirmAction} disabled={submitting}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontFamily: fonts.ui, fontSize: "13px", background: colors.accent.primary }}>
                        {submitting ? "处理中…" : "确认"}
                      </button>
                      <button onClick={() => setActionTarget(null)} disabled={submitting}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontFamily: fonts.ui, fontSize: "13px", background: colors.border.medium }}>
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
