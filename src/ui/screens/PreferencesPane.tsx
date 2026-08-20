import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { V3Pane } from "../layout/V3Pane";
import { api, type ApiMinistry, type ApiPreference } from "../../lib/api";
import { colors, fonts } from "../theme/imperial-palette";

export function PreferencesPane() {
  const [ministries, setMinistries] = useState<ApiMinistry[]>([]);
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [pref, setPref] = useState<ApiPreference | null>(null);
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [domains, setDomains] = useState("");
  const [dailyLimit, setDailyLimit] = useState(3);
  const [scheduleCron, setScheduleCron] = useState("0 8 * * *");
  const [focusRatio, setFocusRatio] = useState(60);
  const [relevanceThreshold, setRelevanceThreshold] = useState(60);
  const [rsshubBaseUrls, setRsshubBaseUrls] = useState("");
  const [wechat2rssBaseUrl, setWechat2rssBaseUrl] = useState("");
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
    api.getPreference(selectedMinistryId)
      .then((p) => {
        setPref(p);
        setDescription(p.description);
        setKeywords(p.excludeKeywords.join("\n"));
        setDomains(p.excludeDomains.join("\n"));
        setDailyLimit(p.dailyLimit);
        setScheduleCron(p.scheduleCron);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "偏好卡加载失败"));
  }, [selectedMinistryId]);

  useEffect(() => {
    api.getSettings()
      .then((s) => {
        setFocusRatio(s.focusRatio);
        setRelevanceThreshold(s.relevanceThreshold);
        setRsshubBaseUrls(s.rsshubBaseUrls.join("\n"));
        setWechat2rssBaseUrl(s.wechat2rssBaseUrl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "全局设置加载失败"));
  }, []);

  const save = async () => {
    try {
      if (pref) {
        const next: Partial<ApiPreference> = {
          description: description.trim(),
          excludeKeywords: splitLines(keywords),
          excludeDomains: splitLines(domains),
          dailyLimit: Math.max(1, Math.min(10, dailyLimit)),
          scheduleCron: scheduleCron.trim() || "0 8 * * *",
        };
        await api.updatePreference(selectedMinistryId, next);
      }
      await api.updateSourceLifecycle({
        focusRatio: clampPercent(focusRatio),
        relevanceThreshold: clampPercent(relevanceThreshold),
        rsshubBaseUrls: splitLines(rsshubBaseUrls),
        wechat2rssBaseUrl: wechat2rssBaseUrl.trim(),
      });
      setMessage("偏好卡已保存");
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    }
  };

  return (
    <V3Pane
      title="中书省 · 偏好卡"
      subtitle="每部独立配置采集与拟折偏好"
      actions={
        <button onClick={save} style={saveButtonStyle}>
          <Save size={15} /> 保存
        </button>
      }
    >
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
        <div style={{ fontFamily: fonts.heading, fontSize: "14px", marginBottom: "10px" }}>全局调度</div>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          焦点:常驻比例（当前 {focusRatio}:{100 - focusRatio}）
          <input
            type="range"
            min={0}
            max={100}
            value={focusRatio}
            onChange={(e) => setFocusRatio(Number(e.target.value))}
            style={{ display: "block", width: "100%", marginTop: "8px" }}
          />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary, marginTop: "12px", display: "block" }}>
          焦点源相关性门槛（0-100）
          <input
            type="number"
            min={0}
            max={100}
            value={relevanceThreshold}
            onChange={(e) => setRelevanceThreshold(Number(e.target.value))}
            style={inputStyle}
          />
        </label>
      </div>

      <div style={{ ...cardStyle, marginBottom: "14px" }}>
        <div style={{ fontFamily: fonts.heading, fontSize: "14px", marginBottom: "10px" }}>公众号订阅</div>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          RSSHub 实例地址（每行一个）
          <textarea
            value={rsshubBaseUrls}
            onChange={(e) => setRsshubBaseUrls(e.target.value)}
            rows={3}
            style={inputStyle}
            placeholder={"https://rsshub.example.com"}
          />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary, marginTop: "12px", display: "block" }}>
          wechat2rss 实例地址（可选）
          <input
            type="text"
            value={wechat2rssBaseUrl}
            onChange={(e) => setWechat2rssBaseUrl(e.target.value)}
            style={inputStyle}
            placeholder="https://wechat2rss.example.com"
          />
        </label>
        <span style={{ fontSize: "11px", color: colors.text.muted, display: "block", marginTop: "4px" }}>
          配置后，公众号源会先尝试整号订阅，失败自动回退单篇抓取。
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          偏好描述
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={inputStyle} placeholder="如：关注个人财务，不要荐股和营销软文" />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          排除关键词（每行一个）
          <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={3} style={inputStyle} placeholder="荐股&#10;营销软文" />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          排除域名（每行一个）
          <textarea value={domains} onChange={(e) => setDomains(e.target.value)} rows={3} style={inputStyle} placeholder="example.com" />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          每日拟折上限（1-10）
          <input type="number" min={1} max={10} value={dailyLimit} onChange={(e) => setDailyLimit(Number(e.target.value))} style={inputStyle} />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          抓取时间（cron 或 HH:MM）
          <input type="text" value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)} style={inputStyle} placeholder="0 8 * * *" />
          <span style={{ fontSize: "11px", color: colors.text.muted, display: "block", marginTop: "4px" }}>
            默认 08:00；格式如 0 8 * * * 或 08:00。
          </span>
        </label>
      </div>
    </V3Pane>
  );
}

function splitLines(text: string): string[] {
  return text
    .split(/[\n,，、]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 60;
  return Math.max(0, Math.min(100, Math.round(value)));
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "4px",
  padding: "8px",
  fontFamily: fonts.ui,
  fontSize: "13px",
  border: `1px solid ${colors.border.light}`,
  borderRadius: "6px",
  background: colors.bg.canvas,
  color: colors.text.primary,
  boxSizing: "border-box",
  resize: "vertical",
};

const saveButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 12px",
  border: "none",
  borderRadius: "6px",
  background: colors.accent.primary,
  color: "#fff",
  cursor: "pointer",
  fontFamily: fonts.ui,
  fontSize: "13px",
};

const cardStyle: React.CSSProperties = {
  padding: "12px",
  background: colors.bg.surface,
  border: `1px solid ${colors.border.light}`,
  borderRadius: "8px",
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
