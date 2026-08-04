import { useEffect, useState } from "react";
import { RefreshCw, Inbox, Archive, CircleAlert, FileText, Rss, SlidersHorizontal, BookOpen, CheckCircle2 } from "lucide-react";
import { V3Pane } from "../layout/V3Pane";
import { useUiStore } from "../../store/ui-store";
import { api, type ApiDashboard, type ApiLearningStats } from "../../lib/api";
import { colors, fonts } from "../theme/imperial-palette";

export function DashboardPane() {
  const uiActions = useUiStore((s) => s.actions);
  const [dashboard, setDashboard] = useState<ApiDashboard | null>(null);
  const [stats, setStats] = useState<ApiLearningStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const [dash, learning] = await Promise.all([api.dashboard(), api.getLearningStats()]);
      setDashboard(dash);
      setStats(learning);
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法连接本地服务");
    }
  };

  useEffect(() => {
    // Retry up to 5 times with 1s backoff (server may still be starting)
    let attempts = 0;
    const tryLoad = async () => {
      try {
        setError(null);
        const [dash, learning] = await Promise.all([api.dashboard(), api.getLearningStats()]);
        setDashboard(dash);
        setStats(learning);
      } catch {
        attempts++;
        if (attempts < 5) setTimeout(tryLoad, 1000);
        else setError('无法连接本地服务，请确认服务器已启动。');
      }
    };
    tryLoad();
  }, []);

  const runAll = async () => {
    setRunning(true);
    try {
      await api.runScheduler();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "抓取失败");
    } finally {
      setRunning(false);
    }
  };

  return (
    <V3Pane
      title="三省工作台"
      subtitle="采集 · 审批 · 归档"
      actions={
        <button onClick={runAll} disabled={running} style={actionButtonStyle}>
          <RefreshCw size={16} /> {running ? "抓取中…" : "立即抓取"}
        </button>
      }
    >
      {error && (
        <div style={{ padding: "12px", marginBottom: "16px", background: colors.accent.light, borderRadius: "8px", color: colors.accent.primary, fontSize: "13px" }}>
          {error}。请先启动本地服务：在 server 目录运行 npm run dev。
        </div>
      )}

      {dashboard && stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginBottom: "18px" }}>
            <StatCard icon={<Inbox size={16} />} label="今日待批" value={dashboard.today.pending} color={colors.accent.primary} onClick={() => uiActions.navigateTo("approval")} />
            <StatCard icon={<Archive size={16} />} label="今日归档" value={dashboard.today.archivedToday} color="#4A7C59" />
            <StatCard icon={<BookOpen size={16} />} label="今日到期" value={stats.dueToday} color="#8A5A44" onClick={() => uiActions.navigateTo("review")} />
            <StatCard icon={<CheckCircle2 size={16} />} label="今日完成" value={stats.completedToday} color="#4A7C59" />
            <StatCard icon={<Rss size={16} />} label="采集成功" value={dashboard.today.fetchedOk} color="#5A6B7A" />
            <StatCard icon={<CircleAlert size={16} />} label="采集失败" value={dashboard.today.fetchedError} color="#A67C52" />
          </div>

          <SectionTitle>六部宫格</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginBottom: "18px" }}>
            {dashboard.ministries.map((m) => (
              <button
                key={m.id}
                onClick={() => uiActions.navigateTo("detail", m.id)}
                style={ministryCardStyle}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                  <span style={{ width: "8px", height: "28px", borderRadius: "4px", background: m.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: fonts.heading, fontSize: "15px", flex: 1, textAlign: "left" }}>{m.title}</span>
                </div>
                <div style={ministryMetaStyle}>
                  <span>{m.pendingCount} 待批</span>
                  <span>{m.archivedCount} 归档</span>
                  <span>{stats.dueByMinistry[m.id] ?? 0} 到期</span>
                  <span>{m.sourceCount} 源</span>
                </div>
              </button>
            ))}
          </div>

          <SectionTitle>今日采集日志</SectionTitle>
          {dashboard.recentFetchLogs.length === 0 ? (
            <p style={emptyStyle}>还没有采集记录，点击右上角立即抓取。</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {dashboard.recentFetchLogs.slice(0, 8).map((log) => (
                <div key={log.id} style={logRowStyle}>
                  <FileText size={13} color={log.status === "ok" ? "#4A7C59" : colors.accent.primary} />
                  <span style={{ flex: 1, fontSize: "12px", color: colors.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.ministryTitle || log.ministryId} · {log.error || `${log.itemCount} 条`}
                  </span>
                  <span style={{ fontSize: "11px", color: log.status === "ok" ? "#4A7C59" : colors.accent.primary }}>
                    {log.status === "ok" ? "成功" : "失败"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
            <NavButton icon={<Inbox size={14} />} label="门下省审批" onClick={() => uiActions.navigateTo("approval")} />
            <NavButton icon={<BookOpen size={14} />} label="复习队列" onClick={() => uiActions.navigateTo("review")} />
            <NavButton icon={<Rss size={14} />} label="信息源" onClick={() => uiActions.navigateTo("sources")} />
            <NavButton icon={<SlidersHorizontal size={14} />} label="偏好卡" onClick={() => uiActions.navigateTo("preferences")} />
          </div>
        </>
      )}
    </V3Pane>
  );
}

function StatCard({ icon, label, value, color, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "14px",
        background: colors.bg.surface,
        border: `1px solid ${colors.border.light}`,
        borderRadius: "8px",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color }}>
        {icon}
        <span style={{ fontSize: "12px", color: colors.text.secondary }}>{label}</span>
      </div>
      <span style={{ fontSize: "26px", fontWeight: 600, color: colors.text.primary }}>{value}</span>
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontFamily: fonts.heading, fontSize: "15px", margin: "0 0 10px", color: colors.text.primary }}>{children}</h3>
  );
}

function NavButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 12px",
        border: `1px solid ${colors.border.medium}`,
        borderRadius: "6px",
        background: colors.bg.surface,
        color: colors.text.secondary,
        cursor: "pointer",
        fontSize: "13px",
      }}
    >
      {icon} {label}
    </button>
  );
}

const actionButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 12px",
  border: "none",
  borderRadius: "6px",
  background: colors.accent.primary,
  color: "#fff",
  cursor: "pointer",
  fontSize: "13px",
  fontFamily: fonts.ui,
};

const ministryCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "12px",
  background: colors.bg.surface,
  border: `1px solid ${colors.border.light}`,
  borderRadius: "8px",
  cursor: "pointer",
  color: colors.text.primary,
  fontFamily: fonts.ui,
};

const ministryMetaStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  fontSize: "11px",
  color: colors.text.muted,
};

const logRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 10px",
  background: colors.bg.surface,
  border: `1px solid ${colors.border.light}`,
  borderRadius: "6px",
};

const emptyStyle: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: "13px",
  textAlign: "center",
  padding: "24px 0",
};
