import { useEffect, useState } from "react";
import { BookOpen, Check } from "lucide-react";
import { V3Pane } from "../layout/V3Pane";
import { api, type ApiItem, type ApiMinistry, type ApiReview, type ReviewRating } from "../../lib/api";
import { apiItemToKnowledgeItem } from "../../lib/db";
import { MemorialReader } from "../memorial/MemorialReader";
import { colors, fonts } from "../theme/imperial-palette";

const RATINGS: { value: ReviewRating; label: string; color: string }[] = [
  { value: "forgot", label: "忘记", color: "#C23B22" },
  { value: "hard", label: "困难", color: "#B07A3E" },
  { value: "good", label: "良好", color: "#4A7C59" },
  { value: "easy", label: "轻松", color: "#3E6B8A" },
];

export function ReviewPane() {
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [ministries, setMinistries] = useState<ApiMinistry[]>([]);
  const [readingItem, setReadingItem] = useState<ApiItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const [due, ministryList] = await Promise.all([api.listDueReviews(), api.listMinistries()]);
      setReviews(due);
      setMinistries(ministryList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法连接本地服务");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rate = async (review: ApiReview, rating: ReviewRating) => {
    try {
      await api.submitReview(review.itemId, rating);
      setMessage(`${review.item.title} 已记录：${RATINGS.find((r) => r.value === rating)?.label}`);
      setTimeout(() => setMessage(null), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    }
  };

  return (
    <V3Pane title="尚书省 · 复习" subtitle={`到期 ${reviews.length} 条`}>
      {error && <div style={noticeStyle(true)}>{error}</div>}
      {message && <div style={noticeStyle(false)}>{message}</div>}
      {reviews.length === 0 && !error ? (
        <p style={{ color: colors.text.muted, textAlign: "center", marginTop: "48px" }}>今日无到期复习</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {reviews.map((review) => {
            const ministry = ministries.find((m) => m.id === review.item.ministryId);
            return (
              <div key={review.itemId} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", color: "#fff", background: ministry?.color || colors.text.muted }}>
                    {ministry?.title || "未知"}
                  </span>
                  <span style={{ fontSize: "11px", color: colors.text.muted }}>
                    第 {review.stage + 1} 档 · {review.intervalDays} 天间隔 · 已复习 {review.reviewCount} 次
                  </span>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => setReadingItem(review.item)} style={miniButtonStyle} title="阅读并批注">
                    <BookOpen size={14} /> 阅读
                  </button>
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "15px", fontWeight: 600, color: colors.text.primary }}>
                  {review.item.title}
                </div>
                <div style={{ fontSize: "13px", color: colors.text.secondary, marginTop: "4px", lineHeight: 1.5 }}>
                  {review.item.summary || "无摘要"}
                </div>
                <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "6px" }}>
                  到期：{formatDate(review.dueAt)}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                  {RATINGS.map((r) => (
                    <button key={r.value} onClick={() => rate(review, r.value)} style={{ ...actionButtonStyle, background: r.color }}>
                      <Check size={13} /> {r.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {readingItem && (
        <MemorialReader item={apiItemToKnowledgeItem(readingItem)} onClose={() => setReadingItem(null)} />
      )}
    </V3Pane>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

const cardStyle: React.CSSProperties = {
  padding: "14px",
  background: colors.bg.surface,
  border: `1px solid ${colors.border.light}`,
  borderRadius: "8px",
};

const actionButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "6px 12px",
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  cursor: "pointer",
  fontFamily: fonts.ui,
  fontSize: "13px",
};

const miniButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: colors.text.secondary,
  padding: "4px",
  fontSize: "12px",
  fontFamily: fonts.ui,
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
