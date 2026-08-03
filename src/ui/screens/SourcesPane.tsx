import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Radio, RefreshCw } from "lucide-react";
import { V3Pane } from "../layout/V3Pane";
import { api, type ApiMinistry, type ApiSource } from "../../lib/api";
import { colors, fonts } from "../theme/imperial-palette";

export function SourcesPane() {
  const [ministries, setMinistries] = useState<ApiMinistry[]>([]);
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [sources, setSources] = useState<ApiSource[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"feed" | "url" | "manual">("feed");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState<"feed" | "url" | "manual">("feed");
  const [editLocation, setEditLocation] = useState("");
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listMinistries()
      .then((list) => {
        setMinistries(list);
        setSelectedMinistryId((current) => current || list[0]?.id || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "无法连接本地服务"));
  }, []);

  useEffect(() => {
    if (!selectedMinistryId) return;
    api.listSources(selectedMinistryId)
      .then(setSources)
      .catch((e) => setError(e instanceof Error ? e.message : "信息源加载失败"));
  }, [selectedMinistryId]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  };

  const addSource = async () => {
    if (!name.trim()) return;
    try {
      await api.createSource(selectedMinistryId, { name: name.trim(), kind, location: location.trim() });
      setName("");
      setLocation("");
      setSources(await api.listSources(selectedMinistryId));
      showMessage("信息源已添加");
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败");
    }
  };

  const startEdit = (source: ApiSource) => {
    setEditingId(source.id);
    setEditName(source.name);
    setEditKind(source.kind);
    setEditLocation(source.location);
  };

  const saveEdit = async (source: ApiSource) => {
    await api.updateSource(source.id, { name: editName.trim(), kind: editKind, location: editLocation.trim() });
    setEditingId(null);
    setSources(await api.listSources(selectedMinistryId));
    showMessage("信息源已更新");
  };

  const toggleEnabled = async (source: ApiSource) => {
    await api.updateSource(source.id, { enabled: !source.enabled });
    setSources(await api.listSources(selectedMinistryId));
  };

  const removeSource = async (source: ApiSource) => {
    if (!window.confirm(`确定删除信息源【${source.name}】？`)) return;
    await api.deleteSource(source.id);
    setSources(await api.listSources(selectedMinistryId));
    showMessage("信息源已删除");
  };

  const testSource = async (source: ApiSource) => {
    setTestingId(source.id);
    try {
      const result = await api.testSource(source.id);
      setTestResult((prev) => ({
        ...prev,
        [source.id]: result.ok ? `抓取成功，共 ${result.articleCount} 条` : `失败：${result.error || "未知错误"}`,
      }));
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [source.id]: e instanceof Error ? e.message : "测试失败" }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <V3Pane title="中书省 · 信息源" subtitle="Feed / URL / 手动源">
      <div style={{ marginBottom: "14px" }}>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          所属六部
          <select
            value={selectedMinistryId}
            onChange={(e) => setSelectedMinistryId(e.target.value)}
            style={inputStyle}
          >
            {ministries.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </label>
      </div>

      {error && <div style={noticeStyle(true)}>{error}</div>}
      {message && <div style={noticeStyle(false)}>{message}</div>}

      <div style={{ ...cardStyle, marginBottom: "14px" }}>
        <div style={{ fontFamily: fonts.heading, fontSize: "14px", marginBottom: "10px" }}>新增信息源</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="名称，如：某某技术周刊" style={inputStyle} />
          <select value={kind} onChange={(e) => setKind(e.target.value as "feed" | "url" | "manual")} style={inputStyle}>
            <option value="feed">Feed（RSS/Atom）</option>
            <option value="url">URL（网页/列表页）</option>
            <option value="manual">手动源</option>
          </select>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={kind === "manual" ? "备注说明（可选）" : "Feed 或网页地址"} style={inputStyle} />
          <button onClick={addSource} style={primaryButtonStyle}>
            <Plus size={14} /> 添加
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {sources.length === 0 ? (
          <p style={{ color: colors.text.muted, textAlign: "center", padding: "24px 0" }}>本部门暂无信息源</p>
        ) : (
          sources.map((source) => (
            <div key={source.id} style={cardStyle}>
              {editingId === source.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} />
                  <select value={editKind} onChange={(e) => setEditKind(e.target.value as "feed" | "url" | "manual")} style={inputStyle}>
                    <option value="feed">Feed</option>
                    <option value="url">URL</option>
                    <option value="manual">手动源</option>
                  </select>
                  <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} style={inputStyle} />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => saveEdit(source)} style={{ ...miniAction, color: "#fff", background: "#4A7C59" }}><Check size={13} /> 保存</button>
                    <button onClick={() => setEditingId(null)} style={{ ...miniAction, color: colors.text.secondary }}><X size={13} /> 取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Radio size={15} color={source.enabled ? "#4A7C59" : colors.text.muted} />
                    <span style={{ fontFamily: fonts.body, fontSize: "14px", fontWeight: 600, flex: 1 }}>{source.name}</span>
                    <span style={{ fontSize: "11px", color: colors.text.muted }}>
                      {source.kind === "feed" ? "Feed" : source.kind === "url" ? "URL" : "手动"}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "4px", overflowWrap: "anywhere" }}>
                    {source.location || "无地址"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => toggleEnabled(source)} style={chipStyle(source.enabled)}>
                      {source.enabled ? "已启用" : "已停用"}
                    </button>
                    {source.lastStatus && (
                      <span style={{ fontSize: "11px", color: source.lastStatus === "ok" ? "#4A7C59" : colors.accent.primary }}>
                        {source.lastStatus === "ok" ? "上次成功" : "上次失败"}
                        {source.failStreak > 0 ? ` ×${source.failStreak}` : ""}
                      </span>
                    )}
                    <button onClick={() => testSource(source)} style={miniAction} title="抓取测试">
                      <RefreshCw size={13} /> {testingId === source.id ? "测试中…" : "测试"}
                    </button>
                    <button onClick={() => startEdit(source)} style={miniAction} title="编辑">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => removeSource(source)} style={{ ...miniAction, color: colors.accent.primary }} title="删除">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {testResult[source.id] && (
                    <div style={{ fontSize: "12px", color: colors.text.secondary, marginTop: "6px" }}>{testResult[source.id]}</div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </V3Pane>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px",
  fontFamily: fonts.ui,
  fontSize: "13px",
  border: `1px solid ${colors.border.light}`,
  borderRadius: "6px",
  background: colors.bg.canvas,
  color: colors.text.primary,
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  padding: "12px",
  background: colors.bg.surface,
  border: `1px solid ${colors.border.light}`,
  borderRadius: "8px",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  padding: "8px",
  border: "none",
  borderRadius: "6px",
  background: colors.accent.primary,
  color: "#fff",
  cursor: "pointer",
  fontFamily: fonts.ui,
  fontSize: "13px",
};

const miniAction: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 8px",
  border: `1px solid ${colors.border.light}`,
  borderRadius: "5px",
  background: "transparent",
  color: colors.text.secondary,
  cursor: "pointer",
  fontSize: "12px",
  fontFamily: fonts.ui,
};

function chipStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: "3px 8px",
    borderRadius: "4px",
    border: "none",
    fontSize: "11px",
    cursor: "pointer",
    fontFamily: fonts.ui,
    background: enabled ? "rgba(74, 124, 89, 0.15)" : "rgba(154, 139, 120, 0.15)",
    color: enabled ? "#3A6B47" : colors.text.muted,
  };
}

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
