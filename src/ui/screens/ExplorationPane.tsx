import { useEffect, useState } from "react";
import { Plus, Compass, Play, Archive, X, RefreshCw, Trash2 } from "lucide-react";
import { V3Pane } from "../layout/V3Pane";
import { api, type ApiMinistry, type ApiSearchDirection, type ApiExplorationItem } from "../../lib/api";
import { colors, fonts } from "../theme/imperial-palette";

export function ExplorationPane() {
  const [ministries, setMinistries] = useState<ApiMinistry[]>([]);
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [directions, setDirections] = useState<ApiSearchDirection[]>([]);
  const [items, setItems] = useState<ApiExplorationItem[]>([]);
  const [directionText, setDirectionText] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listMinistries().then((list) => { setMinistries(list); setSelectedMinistryId((c) => c || list[0]?.id || ""); })
      .catch((e) => setError(e instanceof Error ? e.message : "无法连接"));
  }, []);

  useEffect(() => {
    if (!selectedMinistryId) return;
    Promise.all([api.listDirections(selectedMinistryId), api.listExplorationItems({ ministryId: selectedMinistryId, status: "new" })])
      .then(([dirs, itms]) => { setDirections(dirs); setItems(itms); })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, [selectedMinistryId]);

  const refresh = () => {
    if (!selectedMinistryId) return;
    Promise.all([api.listDirections(selectedMinistryId), api.listExplorationItems({ ministryId: selectedMinistryId, status: "new" })])
      .then(([dirs, itms]) => { setDirections(dirs); setItems(itms); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "刷新失败"));
  };

  const createDirection = async () => {
    const text = directionText.trim();
    if (!text || !selectedMinistryId) return;
    try { await api.createDirection(selectedMinistryId, text); setDirectionText(""); refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "创建失败"); }
  };

  const deleteDirection = async (id: string) => {
    if (!confirm("确定要删除这个探索方向吗？")) return;
    try { await api.deleteDirection(id); refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "删除失败"); }
  };

  const runDirection = async (id: string) => {
    setRunningId(id); setRunResult(null);
    try {
      const result = await api.runDirection(id);
      setRunResult("搜索完成：" + result.totalResults + " 条结果（" + result.terms.length + " 个搜索词）");
      if (result.errors.length > 0) setRunResult((r) => r + "。注意：" + result.errors.join("；"));
      refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "搜索失败"); }
    finally { setRunningId(null); }
  };

  const archiveItem = async (id: string) => {
    try { await api.archiveExplorationItem(id); setItems((prev) => prev.filter((i) => i.id !== id)); }
    catch (e) { setError(e instanceof Error ? e.message : "归档失败"); }
  };

  const dismissItem = async (id: string) => {
    try { await api.dismissExplorationItem(id); setItems((prev) => prev.filter((i) => i.id !== id)); }
    catch (e) { setError(e instanceof Error ? e.message : "操作失败"); }
  };

  const btnStyle = (bg?: string, fg?: string): React.CSSProperties => ({
    padding: "6px 12px", border: "1px solid " + colors.border.light, borderRadius: "6px",
    background: bg || colors.bg.surface, color: fg || colors.text.primary,
    cursor: "pointer", fontFamily: fonts.ui, fontSize: "12px",
    display: "inline-flex", alignItems: "center", gap: "4px",
  });

  return (
    <V3Pane title="探索卷宗" subtitle={selectedMinistryId ? ministries.find(m => m.id === selectedMinistryId)?.title : ""}>
      {error && (<div style={{ margin: "8px 0", padding: "8px 12px", borderRadius: "6px", background: colors.accent.light, color: colors.accent.primary, fontSize: "12px", fontFamily: fonts.ui }}>{error}<button onClick={() => setError(null)} style={{ marginLeft: "8px", cursor: "pointer", background: "none", border: "none", color: colors.accent.primary }}>×</button></div>)}

      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
        <select value={selectedMinistryId} onChange={(e) => setSelectedMinistryId(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid " + colors.border.light, background: colors.bg.surface, color: colors.text.primary, fontFamily: fonts.ui, fontSize: "13px" }}>
          {ministries.map((m) => (<option key={m.id} value={m.id}>{m.title}</option>))}
        </select>
        <button onClick={refresh} style={btnStyle()} title="刷新"><RefreshCw size={14} /></button>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", color: colors.text.muted, marginBottom: "6px" }}>方向输入 — 写下你想探索的新领域</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input type="text" value={directionText} onChange={(e) => setDirectionText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createDirection()}
            placeholder="例：基于 ESP32 的智能手环设计"
            style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid " + colors.border.light, background: colors.bg.canvas, color: colors.text.primary, fontFamily: fonts.ui, fontSize: "13px" }} />
          <button onClick={createDirection} style={btnStyle(colors.accent.primary, "#fff")}><Plus size={14} /> 添加</button>
        </div>
      </div>

      {directions.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", color: colors.text.muted, marginBottom: "8px", fontFamily: fonts.ui }}>探索方向（{directions.length}）</div>
          {directions.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + colors.border.light }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontFamily: fonts.ui }}>{d.direction_text}</div>
                <div style={{ fontSize: "11px", color: colors.text.muted }}>{d.status === "active" ? "待探索" : "已完成"} · {new Date(d.created_at).toLocaleDateString("zh-CN")}</div>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={() => runDirection(d.id)} disabled={runningId === d.id} style={{ ...btnStyle(), opacity: runningId === d.id ? 0.6 : 1 }}>
                  {runningId === d.id ? <RefreshCw size={12} /> : <Play size={12} />}
                  {runningId === d.id ? "搜索中…" : "执行搜索"}
                </button>
                <button onClick={() => deleteDirection(d.id)} style={{ ...btnStyle(), color: colors.accent.primary }} title="删除方向">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {runResult && (<div style={{ marginBottom: "16px", padding: "8px 12px", borderRadius: "6px", background: colors.accent.light, color: colors.accent.primary, fontSize: "12px", fontFamily: fonts.ui }}>{runResult}</div>)}

      {items.length > 0 && (
        <div>
          <div style={{ fontSize: "12px", color: colors.text.muted, marginBottom: "8px", fontFamily: fonts.ui }}>待审卷宗（{items.length}）</div>
          {items.map((item) => (
            <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid " + colors.border.light }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: colors.text.primary, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                  <div style={{ fontSize: "11px", color: colors.text.muted, marginBottom: "4px" }}>{item.summary.slice(0, 120)}</div>
                  <div style={{ fontSize: "10px", color: colors.text.muted }}>
                    {item.source_name} · {new Date(item.created_at).toLocaleDateString("zh-CN")}
                    {item.source_url && (<span> · <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ color: colors.accent.primary }}>查看原文</a></span>)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  <button onClick={() => archiveItem(item.id)} style={btnStyle()} title="归档"><Archive size={12} /></button>
                  <button onClick={() => dismissItem(item.id)} style={btnStyle()} title="丢弃"><X size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {directions.length === 0 && items.length === 0 && (
        <div style={{ padding: "48px 16px", textAlign: "center", color: colors.text.muted, fontFamily: fonts.ui, fontSize: "13px" }}>
          <Compass size={32} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <p>还没有探索方向。</p>
          <p style={{ fontSize: "12px" }}>输入想探索的技术方向或领域，AI 拆词后搜索相关内容。</p>
        </div>
      )}
    </V3Pane>
  );
}