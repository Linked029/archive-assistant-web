import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Radio, RefreshCw } from "lucide-react";
import { V3Pane } from "../layout/V3Pane";
import { api, type ApiMinistry, type ApiPack, type ApiSource } from "../../lib/api";
import { colors, fonts } from "../theme/imperial-palette";

export function SourcesPane() {
  const [ministries, setMinistries] = useState<ApiMinistry[]>([]);
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [sources, setSources] = useState<ApiSource[]>([]);
  const [packs, setPacks] = useState<ApiPack[]>([]);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"feed" | "url" | "manual">("feed");
  const [location, setLocation] = useState("");
  const [adapter, setAdapter] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [createPackIds, setCreatePackIds] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState<"feed" | "url" | "manual">("feed");
  const [editLocation, setEditLocation] = useState("");
  const [editAdapter, setEditAdapter] = useState("");
  const [editTagsText, setEditTagsText] = useState("");
  const [editPackIds, setEditPackIds] = useState<string[]>([]);

  const [newPackName, setNewPackName] = useState("");
  const [newPackKeywords, setNewPackKeywords] = useState("");
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [editPackName, setEditPackName] = useState("");
  const [editPackKeywords, setEditPackKeywords] = useState("");

  const [filterPack, setFilterPack] = useState("all");
  const [filterAdapter, setFilterAdapter] = useState("all");
  const [filterEnabled, setFilterEnabled] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchPackId, setBatchPackId] = useState("");

  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reloadSources = async () => {
    try {
      setSources(await api.listSources(selectedMinistryId || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "信息源加载失败");
    }
  };

  const reloadPacks = async () => {
    try {
      setPacks(await api.listPacks());
    } catch (e) {
      setError(e instanceof Error ? e.message : "项目包加载失败");
    }
  };

  useEffect(() => {
    api.listMinistries()
      .then((list) => {
        setMinistries(list);
        setSelectedMinistryId((current) => current || list[0]?.id || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "无法连接本地服务"));
    reloadPacks();
  }, []);

  useEffect(() => {
    api.listSources(selectedMinistryId || undefined)
      .then(setSources)
      .catch((e) => setError(e instanceof Error ? e.message : "信息源加载失败"));
  }, [selectedMinistryId]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  };

  const addSource = async () => {
    if (!name.trim()) return;
    if (!selectedMinistryId) {
      setError("请先选择六部");
      return;
    }
    try {
      await api.createSource(selectedMinistryId, {
        name: name.trim(),
        kind,
        location: location.trim(),
        adapter,
        tags: splitList(tagsText),
        packIds: createPackIds,
      });
      setName("");
      setLocation("");
      setTagsText("");
      setCreatePackIds([]);
      await reloadSources();
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
    setEditAdapter(source.adapter || "");
    setEditTagsText(source.tags.join(", "));
    setEditPackIds(source.packIds);
  };

  const saveEdit = async (source: ApiSource) => {
    try {
      await api.updateSource(source.id, {
        name: editName.trim(),
        kind: editKind,
        location: editLocation.trim(),
        adapter: editAdapter,
        tags: splitList(editTagsText),
        packIds: editPackIds,
      });
      setEditingId(null);
      await reloadSources();
      showMessage("信息源已更新");
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    }
  };

  const toggleEnabled = async (source: ApiSource) => {
    try {
      await api.updateSource(source.id, { enabled: !source.enabled });
      await reloadSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : "状态更新失败");
    }
  };

  const removeSource = async (source: ApiSource) => {
    if (!window.confirm(`确定删除信息源【${source.name}】？`)) return;
    try {
      await api.deleteSource(source.id);
      await reloadSources();
      showMessage("信息源已删除");
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
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

  const addPack = async () => {
    if (!newPackName.trim()) return;
    try {
      await api.createPack({ name: newPackName.trim(), keywords: splitList(newPackKeywords) });
      setNewPackName("");
      setNewPackKeywords("");
      await reloadPacks();
      showMessage("项目包已创建");
    } catch (e) {
      setError(e instanceof Error ? e.message : "建包失败");
    }
  };

  const startEditPack = (pack: ApiPack) => {
    setEditingPackId(pack.id);
    setEditPackName(pack.name);
    setEditPackKeywords(pack.keywords.join(", "));
  };

  const saveEditPack = async (pack: ApiPack) => {
    try {
      await api.updatePack(pack.id, { name: editPackName.trim(), keywords: splitList(editPackKeywords) });
      setEditingPackId(null);
      await reloadPacks();
      showMessage("项目包已更新");
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    }
  };

  const togglePackState = async (pack: ApiPack) => {
    try {
      await api.updatePack(pack.id, { state: pack.state === "active" ? "inactive" : "active" });
      await reloadPacks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "状态更新失败");
    }
  };

  const removePack = async (pack: ApiPack) => {
    if (!window.confirm(`确定删除项目包【${pack.name}】？删除只解除源归属，不删除信息源。`)) return;
    try {
      await api.deletePack(pack.id);
      await reloadPacks();
      showMessage("项目包已删除");
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  };

  const runBatch = async (action: "enable" | "disable" | "addPack" | "removePack") => {
    if (selectedIds.size === 0) return;
    if ((action === "addPack" || action === "removePack") && !batchPackId) {
      setError("请先选择要操作的包");
      return;
    }
    try {
      await api.batchUpdateSources({
        sourceIds: Array.from(selectedIds),
        action,
        packId: action === "addPack" || action === "removePack" ? batchPackId : undefined,
      });
      setSelectedIds(new Set());
      setBatchPackId("");
      await reloadSources();
      showMessage("批量操作完成");
    } catch (e) {
      setError(e instanceof Error ? e.message : "批量操作失败");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredSources.map((s) => s.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => next.has(id));
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleCreatePack = (id: string) => {
    setCreatePackIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleEditPack = (id: string) => {
    setEditPackIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  let filteredSources = sources;
  if (filterPack === "resident") filteredSources = filteredSources.filter((s) => s.packIds.length === 0);
  else if (filterPack !== "all") filteredSources = filteredSources.filter((s) => s.packIds.includes(filterPack));
  if (filterAdapter === "wechat") filteredSources = filteredSources.filter((s) => s.adapter === "wechat-account");
  else if (filterAdapter === "none") filteredSources = filteredSources.filter((s) => !s.adapter);
  if (filterEnabled === "enabled") filteredSources = filteredSources.filter((s) => s.enabled);
  else if (filterEnabled === "disabled") filteredSources = filteredSources.filter((s) => !s.enabled);
  const allVisibleSelected = filteredSources.length > 0 && filteredSources.every((s) => selectedIds.has(s.id));

  return (
    <V3Pane title="中书省 · 源管理" subtitle="全局源池 · 项目包 · 公众号">
      <div style={{ ...cardStyle, marginBottom: "14px" }}>
        <div style={{ fontFamily: fonts.heading, fontSize: "14px", marginBottom: "10px" }}>项目包</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
          <input value={newPackName} onChange={(e) => setNewPackName(e.target.value)} placeholder="包名，如：技术周报" style={{ ...inputStyle, flex: 1, minWidth: "150px" }} />
          <input value={newPackKeywords} onChange={(e) => setNewPackKeywords(e.target.value)} placeholder="关键词，逗号分隔" style={{ ...inputStyle, flex: 1.5, minWidth: "200px" }} />
          <button onClick={addPack} style={primaryButtonStyle}>
            <Plus size={14} /> 建包
          </button>
        </div>
        {packs.length === 0 ? (
          <p style={{ color: colors.text.muted, textAlign: "center", padding: "8px 0", fontSize: "13px" }}>暂无项目包</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {packs.map((pack) => (
              <div key={pack.id} style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {editingPackId === pack.id ? (
                  <>
                    <input value={editPackName} onChange={(e) => setEditPackName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: "140px" }} />
                    <input value={editPackKeywords} onChange={(e) => setEditPackKeywords(e.target.value)} style={{ ...inputStyle, flex: 1.5, minWidth: "200px" }} />
                    <button onClick={() => saveEditPack(pack)} style={miniAction}><Check size={13} /> 保存</button>
                    <button onClick={() => setEditingPackId(null)} style={miniAction}><X size={13} /> 取消</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>{pack.name}</span>
                    <span style={chipStyle(pack.state === "active")}>{pack.state === "active" ? "启用" : "停用"}</span>
                    <span style={{ fontSize: "11px", color: colors.text.muted }}>{pack.sourceCount} 源</span>
                    {pack.keywords.slice(0, 4).map((k) => (
                      <span key={k} style={tagChip}>{k}</span>
                    ))}
                    <span style={{ flex: 1 }} />
                    <button onClick={() => togglePackState(pack)} style={miniAction}>{pack.state === "active" ? "停用" : "启用"}</button>
                    <button onClick={() => startEditPack(pack)} style={miniAction} title="编辑"><Pencil size={13} /></button>
                    <button onClick={() => removePack(pack)} style={{ ...miniAction, color: colors.accent.primary }} title="删除"><Trash2 size={13} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div style={noticeStyle(true)}>{error}</div>}
      {message && <div style={noticeStyle(false)}>{message}</div>}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <select value={selectedMinistryId} onChange={(e) => setSelectedMinistryId(e.target.value)} style={filterSelect}>
          <option value="">全部六部</option>
          {ministries.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <select value={filterPack} onChange={(e) => setFilterPack(e.target.value)} style={filterSelect}>
          <option value="all">包归属：全部</option>
          <option value="resident">常驻（无包）</option>
          {packs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterAdapter} onChange={(e) => setFilterAdapter(e.target.value)} style={filterSelect}>
          <option value="all">平台：全部</option>
          <option value="wechat">公众号</option>
          <option value="none">未标记</option>
        </select>
        <select value={filterEnabled} onChange={(e) => setFilterEnabled(e.target.value)} style={filterSelect}>
          <option value="all">状态：全部</option>
          <option value="enabled">启用</option>
          <option value="disabled">停用</option>
        </select>
      </div>

      <div style={{ ...cardStyle, marginBottom: "14px" }}>
        <div style={{ fontFamily: fonts.heading, fontSize: "14px", marginBottom: "10px" }}>新增信息源</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="名称，如：某某公众号" style={inputStyle} />
          <select value={kind} onChange={(e) => setKind(e.target.value as "feed" | "url" | "manual")} style={inputStyle}>
            <option value="feed">Feed（RSS/Atom）</option>
            <option value="url">URL（网页/列表页）</option>
            <option value="manual">手动源</option>
          </select>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={kind === "manual" ? "备注说明（可选）" : "Feed / RSSHub / 网页地址"} style={inputStyle} />
          <select value={adapter} onChange={(e) => setAdapter(e.target.value)} style={inputStyle}>
            <option value="">无适配器</option>
            <option value="wechat-account">公众号</option>
          </select>
          <input type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="领域标签，逗号分隔" style={inputStyle} />
        </div>
        {packs.length > 0 && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
            {packs.map((p) => (
              <label key={p.id} style={{ fontSize: "12px", color: colors.text.secondary, display: "flex", alignItems: "center", gap: "4px" }}>
                <input type="checkbox" checked={createPackIds.includes(p.id)} onChange={() => toggleCreatePack(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
        )}
        <div style={{ marginTop: "10px" }}>
          <button onClick={addSource} style={primaryButtonStyle}>
            <Plus size={14} /> 添加
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ ...cardStyle, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", color: colors.text.secondary }}>已选 {selectedIds.size} 个</span>
          <button onClick={() => runBatch("enable")} style={miniAction}>批量启用</button>
          <button onClick={() => runBatch("disable")} style={miniAction}>批量停用</button>
          <select value={batchPackId} onChange={(e) => setBatchPackId(e.target.value)} style={filterSelect}>
            <option value="">选择包</option>
            {packs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => runBatch("addPack")} style={miniAction}>移入包</button>
          <button onClick={() => runBatch("removePack")} style={miniAction}>移除出包</button>
          <button onClick={() => setSelectedIds(new Set())} style={miniAction}><X size={13} /> 清空</button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
        <span style={{ fontSize: "12px", color: colors.text.muted }}>{filteredSources.length} 个信息源</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filteredSources.length === 0 ? (
          <p style={{ color: colors.text.muted, textAlign: "center", padding: "24px 0" }}>当前筛选下暂无信息源</p>
        ) : (
          filteredSources.map((source) => (
            <div key={source.id} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "6px" }}>
              {editingId === source.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px" }}>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} />
                    <select value={editKind} onChange={(e) => setEditKind(e.target.value as "feed" | "url" | "manual")} style={inputStyle}>
                      <option value="feed">Feed</option>
                      <option value="url">URL</option>
                      <option value="manual">手动</option>
                    </select>
                    <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} style={inputStyle} />
                    <select value={editAdapter} onChange={(e) => setEditAdapter(e.target.value)} style={inputStyle}>
                      <option value="">无适配器</option>
                      <option value="wechat-account">公众号</option>
                    </select>
                    <input value={editTagsText} onChange={(e) => setEditTagsText(e.target.value)} placeholder="标签，逗号分隔" style={inputStyle} />
                  </div>
                  {packs.length > 0 && (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {packs.map((p) => (
                        <label key={p.id} style={{ fontSize: "12px", color: colors.text.secondary, display: "flex", alignItems: "center", gap: "4px" }}>
                          <input type="checkbox" checked={editPackIds.includes(p.id)} onChange={() => toggleEditPack(p.id)} />
                          {p.name}
                        </label>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => saveEdit(source)} style={{ ...miniAction, color: "#fff", background: "#4A7C59" }}><Check size={13} /> 保存</button>
                    <button onClick={() => setEditingId(null)} style={{ ...miniAction, color: colors.text.secondary }}><X size={13} /> 取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="checkbox" checked={selectedIds.has(source.id)} onChange={() => toggleSelect(source.id)} />
                    <Radio size={15} color={source.enabled ? "#4A7C59" : colors.text.muted} />
                    <span style={{ fontFamily: fonts.body, fontSize: "14px", fontWeight: 600, flex: 1 }}>{source.name}</span>
                    {source.adapter === "wechat-account" && <span style={wechatChip}>公众号</span>}
                    <span style={{ fontSize: "11px", color: colors.text.muted }}>{kindLabel(source.kind)}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: colors.text.muted, overflowWrap: "anywhere" }}>
                    {source.location || "无地址"}
                  </div>
                  {(source.tags.length > 0 || source.packIds.length > 0) && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {source.tags.map((t) => <span key={t} style={tagChip}>{t}</span>)}
                      {source.packIds.map((pid) => {
                        const pack = packs.find((p) => p.id === pid);
                        return pack ? <span key={pid} style={packChip(pack.state)}>{pack.name}</span> : null;
                      })}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
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
                    <div style={{ fontSize: "12px", color: colors.text.secondary }}>{testResult[source.id]}</div>
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

function splitList(text: string): string[] {
  return text
    .split(/[\n,，、]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function kindLabel(kind: string): string {
  if (kind === "feed") return "Feed";
  if (kind === "url") return "URL";
  return "手动";
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

const filterSelect: React.CSSProperties = {
  padding: "6px 8px",
  fontFamily: fonts.ui,
  fontSize: "12px",
  border: `1px solid ${colors.border.light}`,
  borderRadius: "6px",
  background: colors.bg.canvas,
  color: colors.text.primary,
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
  padding: "8px 12px",
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

const tagChip: React.CSSProperties = {
  padding: "2px 7px",
  borderRadius: "4px",
  fontSize: "11px",
  fontFamily: fonts.ui,
  background: "rgba(122, 92, 58, 0.12)",
  color: "#7A5C3A",
};

function packChip(state: string): React.CSSProperties {
  return {
    padding: "2px 7px",
    borderRadius: "4px",
    fontSize: "11px",
    fontFamily: fonts.ui,
    background: state === "active" ? "rgba(74, 124, 89, 0.14)" : "rgba(154, 139, 120, 0.14)",
    color: state === "active" ? "#3A6B47" : colors.text.muted,
  };
}

const wechatChip: React.CSSProperties = {
  padding: "2px 7px",
  borderRadius: "4px",
  fontSize: "11px",
  fontFamily: fonts.ui,
  background: "rgba(38, 132, 92, 0.14)",
  color: "#26845C",
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
