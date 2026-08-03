import type { ReactNode } from "react";
import { PaneHeader } from "./PaneHeader";
import { colors, fonts } from "../theme/imperial-palette";

interface V3PaneProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function V3Pane({ title, subtitle, actions, children }: V3PaneProps) {
  return (
    <div
      className="pane-container v3-pane"
      style={{
        flex: 1,
        width: "auto",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: colors.bg.canvas,
        borderRight: "none",
        overflow: "hidden",
        fontFamily: fonts.ui,
      }}
    >
      <PaneHeader title={title} subtitle={subtitle} actions={actions} />
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>{children}</div>
    </div>
  );
}
