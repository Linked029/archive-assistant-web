import { Component, type ReactNode } from "react";
import { colors, fonts } from "../theme/imperial-palette";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          padding: "32px",
          background: colors.bg.canvas,
          color: colors.text.primary,
          fontFamily: fonts.body,
          textAlign: "center",
          gap: "16px",
        }}>
          <div style={{ fontSize: "48px" }}>笺</div>
          <h2 style={{ fontFamily: fonts.heading, margin: 0 }}>页面暂不可用</h2>
          <p style={{ color: colors.text.muted, fontSize: "14px", maxWidth: "400px" }}>
            {this.state.error?.message || "发生了未知错误"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: "8px 24px",
              background: colors.accent.primary,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: fonts.ui,
              fontSize: "14px",
            }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}