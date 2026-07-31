import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./ui/theme/Theme";
import { HomePane } from "./ui/screens/HomePane";
import { AddItemDialog } from "./ui/screens/AddItemDialog";
import { TopicNameDialog, DeleteConfirmDialog, ClipboardDialog } from "./ui/screens/TopicManagementDialogs";
import { useUiStore } from "./store/ui-store";
import { useTopicStore } from "./store/topic-store";
import { useItemStore } from "./store/item-store";
import { useAiStore } from "./store/ai-store";
import { colors } from "./ui/theme/imperial-palette";
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

  const selectedPane = useUiStore((s) => s.selectedPane);
  const selectedTopicId = useUiStore((s) => s.selectedTopicId);

  const initTopics = useTopicStore((s) => s.actions.initialize);
  const initItems = useItemStore((s) => s.actions.initialize);
  const initAi = useAiStore((s) => s.actions.initialize);
  const loaded = useTopicStore((s) => s.loaded);

  useEffect(() => {
    initTopics();
    initItems();
    initAi();
  }, []);

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
