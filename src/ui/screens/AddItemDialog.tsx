import { useState, useEffect, useRef, useCallback } from "react";
import { ArchiveDialog, ActionButton } from "../components/ArchiveDialog";
import { useUiStore } from "../../store/ui-store";
import { useItemStore } from "../../store/item-store";
import { useTopicStore } from "../../store/topic-store";
import { ContentType, CONTENT_TYPE_LABELS } from "../../models/item";
import { smartSummarize } from "../../lib/ai/classifier";
import { fetchWebPage } from "../../lib/fetch-web";
import { Sparkles } from "lucide-react";
import { colors, fonts } from "../theme/imperial-palette";

const INPUT_STYLE: React.CSSProperties = {
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

export function AddItemDialog() {
  const { addItemDialogVisible, editingItemId, actions: uiActions } = useUiStore();
  const { items, actions: itemActions } = useItemStore();
  const topics = useTopicStore((s) => s.topics);
  const selectedTopicId = useUiStore((s) => s.selectedTopicId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingItemId !== null;
  const existingItem = isEditing ? items.find((i) => i.id === editingItemId) : null;

  const [topicId, setTopicId] = useState(selectedTopicId || topics[0]?.id || "");
  const [contentType, setContentType] = useState<ContentType>(ContentType.WEB_ARTICLE);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [fullText, setFullText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existingItem) {
      setTopicId(existingItem.topicId);
      setContentType(existingItem.contentType);
      setTitle(existingItem.title);
      setSummary(existingItem.summary);
      setFullText(existingItem.fullText);
      setSourceUrl(existingItem.sourceUrl || "");
      setFileName(existingItem.fileName || "");
      setImagePreview(null);
    } else {
      setTopicId(selectedTopicId || topics[0]?.id || "");
      setContentType(ContentType.WEB_ARTICLE);
      setTitle(""); setSummary(""); setFullText("");
      setSourceUrl(""); setFileName("");
      setImagePreview(null);
    }
    setAiError(null);
    setFileError(null);
  }, [addItemDialogVisible, editingItemId]);

  const processFile = useCallback(async (file: File) => {
    setFileLoading(true);
    setFileError(null);
    setImagePreview(null);

    const name = file.name;
    const ext = name.split(".").pop()?.toLowerCase() || "";

    try {
      // Image files
      if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        setImagePreview(dataUrl);
        setContentType(ContentType.IMAGE_SCREENSHOT);
        setFileName(name);
        setTitle(name.replace(/\.[^.]+$/, ""));
        setFileLoading(false);
        return;
      }

      // DOCX
      if (ext === "docx") {
        const { default: mammoth } = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setFullText(result.value.slice(0, 10000));
        setContentType(ContentType.DOCUMENT);
        setFileName(name);
        setTitle(name.replace(/\.docx$/, ""));
        if (result.value.length > 10000) {
          setFileError("文档过长，已截取前 10000 字符");
        }
        setFileLoading(false);
        return;
      }

      // PDF
      if (ext === "pdf") {
        const { getDocument } = await import("pdfjs-dist");
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        setFullText(text.slice(0, 10000));
        setContentType(ContentType.DOCUMENT);
        setFileName(name);
        setTitle(name.replace(/\.pdf$/, ""));
        if (text.length > 10000) {
          setFileError("文档过长，已截取前 10000 字符");
        }
        setFileLoading(false);
        return;
      }

      // TXT, MD, text
      if (["txt", "md", "markdown", "text", "csv", "json", "xml", "yaml", "yml", "log"].includes(ext)) {
        const text = await file.text();
        setFullText(text.slice(0, 10000));
        setFileName(name);
        if (ext === "md" || ext === "markdown") {
          setContentType(ContentType.DOCUMENT);
        } else {
          setContentType(ContentType.WEB_ARTICLE);
        }
        setTitle(name.replace(/\.[^.]+$/, ""));
        if (text.length > 10000) {
          setFileError("文档过长，已截取前 10000 字符");
        }
        setFileLoading(false);
        return;
      }

      setFileError(`不支持的文件格式: .${ext}`);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "文件解析失败");
    }
    setFileLoading(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleAiClassify = async () => {
    const text = fullText || summary || title || sourceUrl;
    if (!text.trim()) { setAiError("请先输入内容再进行智能归纳"); return; }
    setAiLoading(true);
    setAiError(null);

    if (sourceUrl.trim()) {
      setAiError("正在抓取网页…");
      const result = await fetchWebPage(sourceUrl.trim());
      if (result.success) {
        setTitle(result.context.title.slice(0, 28));
        setSummary((result.context.description || result.context.bodyText).slice(0, 96));
        setFullText(result.context.bodyText.slice(0, 10000));
      } else {
        setAiError(result.error);
      }
      setAiLoading(false);
      return;
    }

    const result = await smartSummarize({ rawText: text });

    setAiLoading(false);
    if (result.success) {
      setTopicId(result.result.topicId);
      setContentType(result.result.contentType as ContentType);
      if (result.result.title) setTitle(result.result.title);
      if (result.result.summary) setSummary(result.result.summary);
    } else {
      setAiError(result.error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    if (isEditing && existingItem) {
      await itemActions.updateItem({
        ...existingItem,
        topicId, contentType,
        title: title.trim(), summary: summary.trim(), fullText,
        sourceUrl: sourceUrl.trim() || undefined,
        fileName: fileName.trim() || undefined,
      });
    } else {
      await itemActions.addItem({
        topicId, contentType,
        title: title.trim(), summary: summary.trim(), fullText,
        sourceUrl: sourceUrl.trim() || undefined,
        fileName: fileName.trim() || undefined,
      });
    }
    uiActions.closeAddItemDialog();
    uiActions.cancelEditItem();
    setSubmitting(false);
  };

  return (
    <ArchiveDialog
      open={addItemDialogVisible || isEditing}
      onClose={() => { uiActions.closeAddItemDialog(); uiActions.cancelEditItem(); }}
      title={isEditing ? "编辑条目" : "新增归档"}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* File drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? colors.accent.primary : colors.border.medium}`,
            borderRadius: "8px",
            padding: "16px",
            textAlign: "center",
            cursor: "pointer",
            background: isDragging ? colors.accent.light : colors.bg.surface,
            transition: "all 0.15s ease",
          }}
        >
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: "none" }}
            accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json,.xml,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg"
          />
          {fileLoading ? (
            <span style={{ fontSize: "13px", color: colors.text.muted }}>解析中…</span>
          ) : (
            <span style={{ fontSize: "13px", color: colors.text.muted }}>
              拖拽文件到此处 或 点击选择（PDF/DOCX/TXT/MD/图片）
            </span>
          )}
        </div>

        {fileError && (
          <div style={{ padding: "6px 10px", background: colors.accent.light, borderRadius: "4px", fontSize: "12px", color: colors.accent.primary }}>
            {fileError}
          </div>
        )}

        {imagePreview && (
          <div style={{ textAlign: "center" }}>
            <img src={imagePreview} alt="Preview" style={{ maxWidth: "100%", maxHeight: "120px", borderRadius: "6px", border: `1px solid ${colors.border.light}` }} />
          </div>
        )}

        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          主题
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} style={INPUT_STYLE}>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          类型
          <select value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)} style={INPUT_STYLE}>
            {[ContentType.WEB_ARTICLE, ContentType.IMAGE_SCREENSHOT, ContentType.DOCUMENT].map((t) => (
              <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          标题 *
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={INPUT_STYLE} placeholder="不超过28字" />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          摘要
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} style={{ ...INPUT_STYLE, minHeight: "60px", resize: "vertical" }} placeholder="不超过96字" />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          全文
          <textarea value={fullText} onChange={(e) => setFullText(e.target.value)} style={{ ...INPUT_STYLE, minHeight: "100px", resize: "vertical" }} />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          来源 URL
          <input type="text" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} style={INPUT_STYLE} />
        </label>
        <label style={{ fontSize: "13px", color: colors.text.secondary }}>
          文件名
          <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} style={INPUT_STYLE} />
        </label>

        {aiError && (
          <div style={{ padding: "8px", background: colors.accent.light, borderRadius: "6px", fontSize: "13px", color: colors.accent.primary }}>
            {aiError}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "8px" }}>
          <ActionButton
            label={aiLoading ? "AI 处理中…" : <><Sparkles size={16} /> AI 智能归纳</>}
            variant="ghost"
            onClick={handleAiClassify}
            disabled={aiLoading}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <ActionButton label="取消" variant="ghost" onClick={() => { uiActions.closeAddItemDialog(); uiActions.cancelEditItem(); }} />
            <ActionButton label={isEditing ? (submitting ? "保存中…" : "保存") : (submitting ? "添加中…" : "添加")} onClick={handleSubmit} disabled={!title.trim() || submitting} />
          </div>
        </div>
      </div>
    </ArchiveDialog>
  );
}
