import { useRef, useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { Stamp, X, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { KnowledgeItem } from "../../models/item";
import { colors, fonts } from "../theme/imperial-palette";
import { api, type ApiAnnotation, type ApiItemStatus } from "../../lib/api";

const ReactMarkdown = lazy(() => import("react-markdown"));
import remarkGfm from "remark-gfm";

interface MemorialReaderProps {
  item: KnowledgeItem;
  onClose: () => void;
}

const PAGE_W = 420;
const PAGE_H = 580;
const MARGIN_X = 44;
const MARGIN_Y = 48;
const TEXT_W = PAGE_W - MARGIN_X * 2;
const LINE_H = 28;

/* ---------- pre-computed paper texture (once per mount) ---------- */
let paperCanvas: HTMLCanvasElement | null = null;
function getPaperTexture(): HTMLCanvasElement {
  if (paperCanvas) return paperCanvas;
  paperCanvas = document.createElement("canvas");
  paperCanvas.width = PAGE_W;
  paperCanvas.height = PAGE_H;
  const pctx = paperCanvas.getContext("2d")!;
  // base
  pctx.fillStyle = "#F5F0E8";
  pctx.fillRect(0, 0, PAGE_W, PAGE_H);
  // fiber grain using tiny short strokes (deterministic)
  const seed = 42;
  for (let i = 0; i < 200; i++) {
    const x = ((i * 137 + seed) % PAGE_W);
    const y = ((i * 251 + seed * 3) % PAGE_H);
    pctx.globalAlpha = 0.015 + (i % 3) * 0.01;
    pctx.strokeStyle = i % 2 === 0 ? "#8B7355" : "#A09070";
    pctx.lineWidth = 0.5;
    pctx.beginPath();
    pctx.moveTo(x, y);
    pctx.lineTo(x + (i % 5), y + (i % 4) - 2);
    pctx.stroke();
  }
  // edge darkening (aging)
  const edgeGrad = pctx.createRadialGradient(
    PAGE_W / 2, PAGE_H / 2, PAGE_W * 0.3,
    PAGE_W / 2, PAGE_H / 2, PAGE_W * 0.85
  );
  edgeGrad.addColorStop(0, "rgba(180,160,130,0)");
  edgeGrad.addColorStop(1, "rgba(120,100,70,0.06)");
  pctx.fillStyle = edgeGrad;
  pctx.fillRect(0, 0, PAGE_W, PAGE_H);
  pctx.globalAlpha = 1;
  return paperCanvas;
}

/* ---------- Chinese-aware page splitting ---------- */
function splitPages(text: string): string[] {
  if (!text) return ["（无内容）"];
  const maxChars = 380;
  const pages: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = i + maxChars;
    if (end >= text.length) {
      pages.push(text.slice(i));
      break;
    }
    // try to break at sentence-ending punctuation
    const chunk = text.slice(i, end);
    const punctMatch = chunk.match(/[。！？；\n](?!.)/);
    if (punctMatch && punctMatch.index !== undefined && punctMatch.index > maxChars * 0.6) {
      end = i + punctMatch.index + 1;
    } else {
      // break at last newline or space
      const lastBreak = Math.max(chunk.lastIndexOf('\n'), chunk.lastIndexOf('  '));
      if (lastBreak > maxChars * 0.5) end = i + lastBreak + 1;
    }
    pages.push(text.slice(i, end));
    i = end;
  }
  return pages;
}

/* ---------- line-breaking that respects CJK width ---------- */
function breakLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (ch === '\n') { lines.push(cur); cur = ""; continue; }
    const test = cur + ch;
    if (ctx.measureText(test).width > maxW && cur.length > 0) {
      lines.push(cur);
      cur = ch;
    } else { cur = test; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/* ---------- draw ornament on cover ---------- */
function drawOrnament(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number) {
  ctx.strokeStyle = colors.border.dark;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx - w, y);
  ctx.lineTo(cx + w, y);
  ctx.stroke();
  // diamond dots
  const dotSize = 4;
  ctx.fillStyle = colors.border.dark;
  ctx.beginPath();
  ctx.moveTo(cx, y - dotSize); ctx.lineTo(cx + dotSize, y); ctx.lineTo(cx, y + dotSize); ctx.lineTo(cx - dotSize, y);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
}

export function MemorialReader({ item, onClose }: MemorialReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(0);
  const [flipPct, setFlipPct] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [viewMode, setViewMode] = useState<"canvas" | "markdown">("canvas");
  const [fontSize, setFontSize] = useState(16);
  const [stampPhase, setStampPhase] = useState<"hidden" | "pressing" | "fading" | "visible">("hidden");
  const [annotations, setAnnotations] = useState<ApiAnnotation[]>([]);
  const [annotationText, setAnnotationText] = useState("");
  const [itemStatus, setItemStatus] = useState<ApiItemStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pages = useMemo(() => splitPages(item.fullText || item.summary || item.title), [item]);
  const totalPages = pages.length;
  const paper = useMemo(() => getPaperTexture(), []);

  /* ---- drawing ---- */
  const drawPage = useCallback((ctx: CanvasRenderingContext2D, pageIdx: number, flip: number) => {
    const w = PAGE_W, h = PAGE_H;
    ctx.save();

    // 3D page flip transform
    if (flip > 0 && flip < 100) {
      const angle = (flip / 100) * Math.PI * -0.5;
      const scaleX = Math.cos(angle);
      const tx = w * (1 - scaleX) * 0.5;
      ctx.transform(scaleX, 0, 0, 1, tx, 0);
      // shadow of the lifting page
      const shadowAlpha = Math.sin(angle) * 0.25;
      ctx.shadowColor = `rgba(0,0,0,${shadowAlpha})`;
      ctx.shadowBlur = 20 * Math.sin(angle);
      ctx.shadowOffsetX = -15 * Math.sin(angle);
      ctx.shadowOffsetY = 0;
    }

    // paper background (use pre-computed texture)
    ctx.drawImage(paper, 0, 0);
    // re-apply shadow on filled rect
    if (flip > 0) {
      ctx.fillStyle = colors.bg.canvas;
      ctx.fillRect(0, 0, w, h);
    }

    // spine shadow on left
    if (pageIdx > 0 || flip === 0) {
      const spineGrad = ctx.createLinearGradient(0, 0, 16, 0);
      spineGrad.addColorStop(0, "rgba(60,40,20,0.18)");
      spineGrad.addColorStop(0.4, "rgba(60,40,20,0.06)");
      spineGrad.addColorStop(1, "rgba(60,40,20,0)");
      ctx.fillStyle = spineGrad;
      ctx.fillRect(0, 0, 16, h);
    }

    // inner border frame (双线)
    const bx = MARGIN_X - 8, by = MARGIN_Y - 8, bw = w - (MARGIN_X - 8) * 2, bh = h - (MARGIN_Y - 8) * 2;
    ctx.strokeStyle = colors.border.medium;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.strokeStyle = colors.border.light;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);

    // Cover page
    if (pageIdx === 0) {
      // triangular corner ornaments
      const cx = w / 2;
      // top ornament
      drawOrnament(ctx, cx, 38, 50);
      // bottom ornament
      drawOrnament(ctx, cx, h - 38, 50);

      // title
      ctx.fillStyle = colors.text.ink;
      ctx.font = `bold 26px "Ma Shan Zheng", "KaiTi", "STKaiti", serif`;
      ctx.textAlign = "center";
      ctx.fillText(item.title, cx, 78);

      // red divider
      ctx.strokeStyle = colors.accent.stamp;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - 70, 96);
      ctx.lineTo(cx + 70, 96);
      ctx.stroke();

      // metadata
      ctx.font = '13px "Inter", "PingFang SC", sans-serif';
      ctx.fillStyle = colors.text.muted;
      const dateStr = new Date(item.createdAtEpochMillis).toLocaleDateString("zh-CN", {
        year: "numeric", month: "long", day: "numeric"
      });
      ctx.fillText(dateStr, cx, 118);
      if (item.fileName) {
        ctx.fillText('来源：' + item.fileName, cx, 140);
      }

      // summary on cover
      if (item.summary) {
        ctx.fillStyle = colors.text.secondary;
        ctx.font = `16px "Dinglie Song", "Noto Serif SC", "SimSun", serif`;
        ctx.textAlign = "left";
        const lines = breakLines(ctx, item.summary, TEXT_W);
        let sy = 170;
        for (const l of lines.slice(0, 4)) {
          ctx.fillText(l, MARGIN_X, sy);
          sy += LINE_H;
        }
        if (lines.length > 4) {
          ctx.fillText("……", MARGIN_X + TEXT_W - 40, sy);
        }
      }

      // 奏折标记
      ctx.fillStyle = colors.text.muted;
      ctx.font = '15px "San Ji XingKai", "KaiTi", serif';
      ctx.textAlign = "center";
      ctx.fillText('奏 · 折', cx, h - MARGIN_Y - 10);
    } else {
      // Content pages
      if (pages[pageIdx]) {
        ctx.fillStyle = colors.text.primary;
        ctx.font = `${fontSize}px "Dinglie Song", "Noto Serif SC", "SimSun", serif`;
        ctx.textAlign = "left";
        const lines = breakLines(ctx, pages[pageIdx], TEXT_W);
        let sy = MARGIN_Y + 8;
        for (const l of lines) {
          ctx.fillText(l, MARGIN_X, sy);
          sy += LINE_H;
        }
      }
    }

    // Page number (Chinese style)
    ctx.fillStyle = colors.text.muted;
    ctx.font = '12px "Inter", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(`第 ${pageIdx + 1} 页 · 共 ${totalPages} 页`, w / 2, h - 24);

    // Watermark seal on non-cover pages
    if (pageIdx > 0) {
      ctx.save();
      ctx.fillStyle = stampPhase === "pressing" || stampPhase === "visible" || stampPhase === "fading"
        ? `rgba(184,50,32,${stampPhase === "fading" ? 0.25 : 0.35})`
        : "rgba(184,50,32,0.06)";
      ctx.font = 'bold 28px "San Ji XingKai", "KaiTi", serif';
      ctx.textAlign = "center";
      ctx.fillText('◆', w / 2, h - 60);
      ctx.restore();
    }

    ctx.restore();
  }, [item, pages, totalPages, fontSize, stampPhase, paper]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawPage(ctx, page, flipPct);
  }, [page, flipPct, drawPage]);

  /* ---- page animation ---- */
  const animateFlip = (dir: 1 | -1) => {
    if (animating) return;
    if (dir === 1 && page >= totalPages - 1) return;
    if (dir === -1 && page <= 0) return;
    setAnimating(true);
    const start = performance.now();
    const duration = 280;
    const anim = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 2.5);
      setFlipPct(eased * 100);
      if (t < 1) {
        requestAnimationFrame(anim);
      } else {
        setFlipPct(0);
        setPage((p) => p + dir);
        setAnimating(false);
      }
    };
    requestAnimationFrame(anim);
  };

  const handleStamp = () => {
    setStampPhase("pressing");
    setTimeout(() => setStampPhase("visible"), 150);
    setTimeout(() => setStampPhase("fading"), 2500);
    setTimeout(() => setStampPhase("hidden"), 3200);
  };

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") animateFlip(1);
      else if (e.key === "ArrowLeft") animateFlip(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, animating]);

  useEffect(() => {
    let cancelled = false;
    api.listAnnotations(item.id).then((list) => { if (!cancelled) setAnnotations(list); }).catch(() => {});
    api.getItem(item.id).then((it) => { if (!cancelled) setItemStatus(it.status); }).catch(() => {});
    return () => { cancelled = true; };
  }, [item.id]);

  const markRead = async () => {
    try {
      const it = await api.markItemRead(item.id);
      setItemStatus(it.status);
      setNotice("已标记已读，明日进入复习");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "标记失败");
    }
    setTimeout(() => setNotice(null), 2500);
  };

  const addAnnotation = async () => {
    const text = annotationText.trim();
    if (!text) return;
    try {
      const created = await api.createAnnotation(item.id, text);
      setAnnotations((prev) => [created, ...prev]);
      setAnnotationText("");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "批注保存失败");
    }
  };

  const removeAnnotation = async (id: string) => {
    try {
      await api.deleteAnnotation(id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "批注删除失败");
    }
  };

  const isRead = itemStatus === "read" || itemStatus === "reviewing" || itemStatus === "mastered";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", flexDirection: "row", gap: "16px",
      alignItems: "center", justifyContent: "center",
      background: "rgba(20,15,10,0.65)",
      fontFamily: fonts.ui,
    }}>
      <div style={{
        background: "#E8DDC8",
        borderRadius: "6px",
        boxShadow: "0 12px 60px rgba(20,15,10,0.5), 0 0 0 1px rgba(20,15,10,0.1)",
        padding: "28px 24px 20px",
        position: "relative",
      }}>
        {/* Toolbar */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", justifyContent: "center", alignItems: "center" }}>
          <button onClick={() => setViewMode("canvas")} style={{
            ...toolbarBtn, fontWeight: viewMode === "canvas" ? 600 : 400,
            color: viewMode === "canvas" ? colors.accent.primary : colors.text.secondary,
          }}>📜 奏折</button>
          <button onClick={() => setViewMode("markdown")} style={{
            ...toolbarBtn, fontWeight: viewMode === "markdown" ? 600 : 400,
            color: viewMode === "markdown" ? colors.accent.primary : colors.text.secondary,
          }}>📝 预览</button>
          <div style={{ width: "1px", height: "18px", background: colors.border.medium, margin: "0 4px" }} />
          <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{
            padding: "3px 8px", fontSize: "12px", fontFamily: fonts.ui,
            border: `1px solid ${colors.border.medium}`, borderRadius: "4px",
            background: colors.bg.canvas, color: colors.text.secondary, cursor: "pointer",
          }}>
            <option value={14}>小字</option>
            <option value={16}>中字</option>
            <option value={19}>大字</option>
          </select>
        </div>

        {/* Markdown view */}
        {viewMode === "markdown" && (
          <Suspense fallback={<div style={{ width: PAGE_W, height: PAGE_H, display: "flex", alignItems: "center", justifyContent: "center", color: colors.text.muted }}>加载中...</div>}>
            <div style={{
              width: PAGE_W, height: PAGE_H, overflow: "auto",
              padding: "28px", boxSizing: "border-box",
              fontFamily: fonts.body, fontSize: `${fontSize}px`, lineHeight: "1.9",
              color: colors.text.primary, background: colors.bg.canvas,
              border: `1px solid ${colors.border.medium}`, textAlign: "left",
              borderRadius: "2px",
            }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 style={{ fontFamily: fonts.heading, fontSize: `${fontSize + 10}px`, color: colors.text.ink, borderBottom: `1px solid ${colors.border.light}`, paddingBottom: "8px", margin: "20px 0 12px" }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ fontFamily: fonts.heading, fontSize: `${fontSize + 6}px`, color: colors.text.primary, margin: "16px 0 10px" }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontFamily: fonts.heading, fontSize: `${fontSize + 3}px`, color: colors.text.secondary, margin: "12px 0 8px" }}>{children}</h3>,
                  p: ({ children }) => <p style={{ margin: "8px 0", textIndent: "2em" }}>{children}</p>,
                  code: ({ children, className }: any) => {
                    const isBlock = Boolean(className);
                    return isBlock
                      ? <pre style={{ background: "#2C2416", color: "#EDE6D6", padding: "12px", borderRadius: "6px", fontSize: "13px", overflow: "auto", margin: "12px 0" }}><code>{children}</code></pre>
                      : <code style={{ background: colors.bg.surface, padding: "2px 6px", borderRadius: "3px", fontSize: "0.9em", fontFamily: "monospace" }}>{children}</code>;
                  },
                  blockquote: ({ children }) => (
                    <blockquote style={{ borderLeft: `3px solid ${colors.accent.stamp}`, margin: "12px 0", padding: "4px 16px", background: colors.bg.surface, borderRadius: "0 4px 4px 0" }}>{children}</blockquote>
                  ),
                  table: ({ children }) => <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0", fontSize: `${fontSize - 1}px` }}>{children}</table>,
                  th: ({ children }) => <th style={{ border: `1px solid ${colors.border.medium}`, padding: "6px 10px", background: colors.bg.surface, fontWeight: 600 }}>{children}</th>,
                  td: ({ children }) => <td style={{ border: `1px solid ${colors.border.light}`, padding: "6px 10px" }}>{children}</td>,
                  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener" style={{ color: colors.accent.primary }}>{children}</a>,
                  img: ({ src, alt }) => <img src={src} alt={alt} style={{ maxWidth: "100%", borderRadius: "4px" }} />,
                  ul: ({ children }) => <ul style={{ paddingLeft: "24px", margin: "8px 0" }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ paddingLeft: "24px", margin: "8px 0" }}>{children}</ol>,
                  li: ({ children }) => <li style={{ margin: "4px 0" }}>{children}</li>,
                  hr: () => <hr style={{ border: "none", borderTop: `1px solid ${colors.border.light}`, margin: "16px 0" }} />,
                }}
              >
                {item.fullText || item.summary || item.title}
              </ReactMarkdown>
            </div>
          </Suspense>
        )}

        {/* Canvas view */}
        {viewMode === "canvas" && (
        <canvas
          ref={canvasRef}
          width={PAGE_W}
          height={PAGE_H}
          style={{ display: "block", borderRadius: "2px" }}
          onClick={(e) => {
            const x = e.clientX - (e.target as HTMLCanvasElement).getBoundingClientRect().left;
            if (x > PAGE_W * 0.55) animateFlip(1);
            else animateFlip(-1);
          }}
        />
        )}

        {/* Bottom nav */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "20px", marginTop: "18px" }}>
          <button onClick={() => animateFlip(-1)} disabled={page === 0 || animating}
            style={{ ...navBtn, opacity: page === 0 ? 0.25 : 1 }}>
            <ChevronLeft size={15} /> 前页
          </button>
          <span style={{ fontSize: "13px", color: colors.text.secondary, fontFamily: fonts.ui, minWidth: "80px", textAlign: "center" }}>
            第 {page + 1} / {totalPages} 页
          </span>
          <button onClick={() => animateFlip(1)} disabled={page >= totalPages - 1 || animating}
            style={{ ...navBtn, opacity: page >= totalPages - 1 ? 0.25 : 1 }}>
            后页 <ChevronRight size={15} />
          </button>
        </div>

        {/* Stamp button (bottom-right corner) */}
        <div onClick={handleStamp} style={{
          position: "absolute", bottom: "44px", right: "32px",
          width: "42px", height: "42px", borderRadius: "50%",
          cursor: "pointer", opacity: stampPhase === "pressing" ? 1 : 0.35,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.12s ease, opacity 0.12s ease, background 0.12s ease",
          transform: stampPhase === "pressing" ? "scale(0.85)" : "scale(1)",
          background: stampPhase === "visible" ? "rgba(194,59,34,0.15)" : "transparent",
        }} title="盖印">
          <Stamp size={20} color={stampPhase === "visible" ? colors.accent.stamp : colors.text.muted} />
        </div>

        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: "8px", right: "8px",
          background: "none", border: "none", cursor: "pointer",
          color: colors.text.muted, padding: "6px", borderRadius: "4px",
        }}><X size={18} /></button>
      </div>

      <div style={{
        width: "260px",
        maxHeight: "640px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: "#F5F0E8",
        borderRadius: "6px",
        padding: "14px",
        boxSizing: "border-box",
        boxShadow: "0 12px 60px rgba(20,15,10,0.5), 0 0 0 1px rgba(20,15,10,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: fonts.heading, fontSize: "15px", color: colors.text.primary }}>批注 · 批红</span>
          <span style={{ fontSize: "11px", color: isRead ? "#3A6B47" : colors.text.muted }}>{isRead ? "已读" : "未读"}</span>
        </div>
        <button
          onClick={markRead}
          disabled={isRead}
          style={{
            ...sideButtonStyle,
            background: isRead ? colors.border.medium : colors.accent.primary,
            cursor: isRead ? "not-allowed" : "pointer",
          }}
        >
          {isRead ? "已标记已读" : "标记已读"}
        </button>
        <textarea
          value={annotationText}
          onChange={(e) => setAnnotationText(e.target.value)}
          placeholder="写下你的想法…"
          rows={3}
          style={{ ...sideInputStyle, resize: "vertical" }}
        />
        <button onClick={addAnnotation} style={{ ...sideButtonStyle, background: "#4A7C59" }}>
          <Plus size={13} /> 添加批注
        </button>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", minHeight: "80px" }}>
          {annotations.length === 0 ? (
            <p style={{ fontSize: "12px", color: colors.text.muted, margin: 0 }}>暂无批注</p>
          ) : (
            annotations.map((a) => (
              <div key={a.id} style={{
                padding: "8px",
                background: colors.bg.canvas,
                border: `1px solid ${colors.border.light}`,
                borderRadius: "6px",
                fontSize: "12px",
                color: colors.text.primary,
              }}>
                <div style={{ lineHeight: 1.5, wordBreak: "break-word" }}>{a.text}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                  <button onClick={() => removeAnnotation(a.id)} style={miniBtnStyle} title="删除批注">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {notice && <div style={{ fontSize: "12px", color: colors.accent.primary }}>{notice}</div>}
      </div>
    </div>
  );
}

const toolbarBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: "13px", fontFamily: "sans-serif",
  padding: "4px 10px", borderRadius: "4px",
};

const navBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid #C4B896",
  borderRadius: "6px",
  padding: "6px 18px",
  cursor: "pointer",
  color: "#6B5E50",
  fontFamily: "sans-serif",
  fontSize: "13px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

const sideButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  padding: "7px 10px",
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  fontFamily: fonts.ui,
  fontSize: "12px",
};

const sideInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  boxSizing: "border-box",
  fontFamily: fonts.ui,
  fontSize: "12px",
  border: `1px solid ${colors.border.light}`,
  borderRadius: "6px",
  background: colors.bg.canvas,
  color: colors.text.primary,
};

const miniBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: colors.text.muted,
  padding: "2px",
  display: "flex",
  alignItems: "center",
};
