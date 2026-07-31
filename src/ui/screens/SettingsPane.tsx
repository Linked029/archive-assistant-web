import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "../../hooks/useDarkMode";
import { PaneContainer, PaneContent } from "../layout/PaneContainer";
import { PaneHeader } from "../layout/PaneHeader";
import { ArchiveDialog, ActionButton } from "../components/ArchiveDialog";
import { useUiStore } from "../../store/ui-store";
import { useAiStore } from "../../store/ai-store";
import { AiEngineType, AI_ENGINE_LABELS, AI_PRESET_TEMPLATES } from "../../models/ai-settings";
import { exportAllData, importAllData, exportItemsAsMarkdown } from "../../lib/db";
import { colors, fonts } from "../theme/imperial-palette";

export function SettingsPane() {
  const uiActions = useUiStore((s) => s.actions);
  const { settings, actions: aiActions } = useAiStore();

  const [importText, setImportText] = useState("");
  const [darkMode, toggleDarkMode] = useDarkMode();
  const [showImport, setShowImport] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleMdExport = async () => {
    try {
      const md = await exportItemsAsMarkdown();
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'archive-notes-' + new Date().toISOString().slice(0, 10) + '.md';
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg('Markdown 导出成功');
    } catch { setStatusMsg('导出失败'); }
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const handleExport = async () => {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archive-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg("导出成功");
    } catch { setStatusMsg("导出失败"); }
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const handleImport = async () => {
    try {
      await importAllData(importText);
      setShowImport(false);
      setImportText("");
      setStatusMsg("导入成功，刷新页面生效");
    } catch { setStatusMsg("导入失败：JSON 格式无效"); }
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const handleFileImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      setImportText(text);
      setShowImport(true);
    };
    input.click();
  };

  return (
    <PaneContainer>
      <PaneHeader title="设置" showBackButton onBack={() => uiActions.navigateTo("topics")} />
      <PaneContent>
        <section style={{ marginBottom: "24px" }}>
          <h3 style={{ fontFamily: fonts.heading, margin: "0 0 12px", color: colors.text.primary }}>AI 引擎</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ fontSize: "13px", color: colors.text.secondary }}>
              快速模板
              <select
                value=""
                onChange={(e) => {
                  const preset = AI_PRESET_TEMPLATES.find((p) => p.name === e.target.value);
                  if (preset) aiActions.updateSettings({ baseUrl: preset.baseUrl, modelName: preset.modelName, engineType: preset.engineType });
                }}
                style={inputStyle}
              >
                <option value="">选择预置模板…</option>
                {AI_PRESET_TEMPLATES.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </label>
            <div style={{ fontSize: "12px", color: colors.text.muted }}>选择模板会自动填充 Base URL 和模型名称</div>
            <label style={{ fontSize: "13px", color: colors.text.secondary }}>
              引擎类型
              <select value={settings.engineType} onChange={(e) => aiActions.updateSettings({ engineType: e.target.value as AiEngineType })} style={inputStyle}>
                {Object.values(AiEngineType).map((type) => (
                  <option key={type} value={type}>{AI_ENGINE_LABELS[type]}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: "13px", color: colors.text.secondary }}>
              Base URL
              <input type="text" value={settings.baseUrl} onChange={(e) => aiActions.updateSettings({ baseUrl: e.target.value })} style={inputStyle} />
            </label>
            <label style={{ fontSize: "13px", color: colors.text.secondary }}>
              模型名称
              <input type="text" value={settings.modelName} onChange={(e) => aiActions.updateSettings({ modelName: e.target.value })} style={inputStyle} />
            </label>
            <label style={{ fontSize: "13px", color: colors.text.secondary }}>
              API Key
              <input type="password" value={settings.apiKey} onChange={(e) => aiActions.updateSettings({ apiKey: e.target.value })} style={inputStyle} />
            </label>
          </div>

        <section style={{ marginBottom: "24px" }}>
          <h3 style={{ fontFamily: fonts.heading, margin: "0 0 12px", color: colors.text.primary }}>外观</h3>
          <button
            onClick={toggleDarkMode}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 16px", borderRadius: "8px",
              border: "1px solid var(--color-border-light)",
              background: colors.bg.surface, cursor: "pointer",
              fontFamily: fonts.ui, fontSize: "14px",
              color: colors.text.primary,
            }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? "日间宣纸" : "水墨夜读"}
          </button>
        </section>
        </section>

        <section>
          <h3 style={{ fontFamily: fonts.heading, margin: "0 0 12px", color: colors.text.primary }}>数据管理</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <ActionButton label="📤 导出全部数据 (JSON)" onClick={handleExport} />
            <ActionButton label="📥 从 JSON 文件导入" onClick={handleFileImport} variant="ghost" />
          </div>
            <ActionButton label="📝 导出为 Markdown (Obsidian)" onClick={handleMdExport} variant="ghost" />
        </section>

        {statusMsg && (
          <div style={{ marginTop: "16px", padding: "8px", background: colors.accent.light, borderRadius: "6px", fontSize: "13px", color: colors.accent.primary, textAlign: "center" }}>
            {statusMsg}
          </div>
        )}
      </PaneContent>

      <ArchiveDialog open={showImport} onClose={() => setShowImport(false)} title="确认导入">
        <p style={{ fontFamily: fonts.body, color: colors.text.primary, margin: "0 0 16px", fontSize: "14px" }}>
          导入将替换当前所有数据，此操作不可撤销。确认继续？
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <ActionButton label="取消" variant="ghost" onClick={() => setShowImport(false)} />
          <ActionButton label="确认导入" variant="danger" onClick={handleImport} />
        </div>
      </ArchiveDialog>
    </PaneContainer>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "4px",
  padding: "8px",
  fontFamily: fonts.ui,
  fontSize: "14px",
  border: `1px solid ${colors.border.light}`,
  borderRadius: "6px",
  background: colors.bg.surface,
  color: colors.text.primary,
  boxSizing: "border-box",
};