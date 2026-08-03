import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./ui/theme/Theme";
import { HomePane } from "./ui/screens/HomePane";
import { DashboardPane } from "./ui/screens/DashboardPane";
import { ApprovalPane } from "./ui/screens/ApprovalPane";
import { SourcesPane } from "./ui/screens/SourcesPane";
import { PreferencesPane } from "./ui/screens/PreferencesPane";
import { ReviewPane } from "./ui/screens/ReviewPane";
import { useState } from "react";
import { AddItemDialog } from "./ui/screens/AddItemDialog";
import { TopicNameDialog, DeleteConfirmDialog, ClipboardDialog } from "./ui/screens/TopicManagementDialogs";
import { useUiStore } from "./store/ui-store";
import { useTopicStore } from "./store/topic-store";
import { useItemStore } from "./store/item-store";
import { useAiStore } from "./store/ai-store";
import { colors, fonts } from "./ui/theme/imperial-palette";
import { ErrorBoundary } from "./ui/components/ErrorBoundary";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";

const DetailPane = lazy(() =>
  import("./ui/screens/DetailPane").then((m) => ({ default: m.DetailPane }))
);
const SettingsPane = lazy(() =>
  import("./ui/screens/SettingsPane").then((m) => ({ default: m.SettingsPane }))
);

function LazyFallback() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", color: colors.text.muted, fontFamily: "var(--font-ui)",
    }}>
      加载中…
    </div>
  );
}

function AppShell() {
  useGlobalShortcuts();
  const [serverError, setServerError] = useState<string | null>(null);

  const selectedPane = useUiStore((s) => s.selectedPane);
  const selectedTopicId = useUiStore((s) => s.selectedTopicId);

  const initTopics = useTopicStore((s) => s.actions.initialize);
  const initItems = useItemStore((s) => s.actions.initialize);
  const initAi = useAiStore((s) => s.actions.initialize);
  const loaded = useTopicStore((s) => s.loaded);

  useEffect(() => {
    Promise.all([initTopics(), initItems(), initAi()]).catch((error) => {
      setServerError(error instanceof Error ? error.message : "本地服务不可用");
    });
  }, []);

  if (serverError) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "14px",
        padding: "32px",
        background: colors.bg.canvas,
        color: colors.text.primary,
        fontFamily: fonts.body,
        textAlign: "center",
      }}>
        <div style={{ fontSize: "44px" }}>笺</div>
        <h2 style={{ fontFamily: fonts.heading, margin: 0 }}>本地服务未连接</h2>
        <p style={{ color: colors.text.muted, maxWidth: "420px", fontSize: "14px" }}>
          {serverError}。请在 server 目录运行 <code>npm run dev</code> 启动本地服务后刷新页面。
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "9px 24px",
            border: "none",
            borderRadius: "6px",
            background: colors.accent.primary,
            color: "#fff",
            cursor: "pointer",
            fontFamily: fonts.ui,
            fontSize: "14px",
          }}
        >
          重新连接
        </button>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", color: colors.text.muted, fontFamily: "var(--font-ui)",
      }}>
        加载中…
      </div>
    );
  }

  const showRightPane = selectedPane === "detail" || selectedPane === "card-detail" || selectedPane === "article-reader";

  return (
    <div className="app-layout">
      <HomePane />
      {selectedPane === "dashboard" && <DashboardPane />}
      {selectedPane === "approval" && <ApprovalPane />}
      {selectedPane === "sources" && <SourcesPane />}
      {selectedPane === "preferences" && <PreferencesPane />}
      {selectedPane === "review" && <ReviewPane />}
      {showRightPane && (selectedTopicId
        ? <Suspense fallback={<LazyFallback />}><DetailPane /></Suspense>
        : <Navigate to="/" />)}
      {selectedPane === "settings" && <Suspense fallback={<LazyFallback />}><SettingsPane /></Suspense>}
      <AddItemDialog />
      <TopicNameDialog />
      <DeleteConfirmDialog />
      <ClipboardDialog />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<AppShell />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
