﻿import type { ReactNode } from 'react';
import { colors, fonts } from '../theme/imperial-palette';

interface PaneContainerProps {
  children?: ReactNode;
  className?: string;
}

export function PaneContainer({ children, className = '' }: PaneContainerProps) {
  return (
    <div
      className={`pane-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg.surface,
        borderRight: `1px solid ${colors.border.light}`,
        overflow: 'hidden',
        fontFamily: fonts.ui,
      }}
    >
      {children}
    </div>
  );
}

interface PaneContentProps {
  children?: ReactNode;
  scrollable?: boolean;
}

export function PaneContent({ children, scrollable = true }: PaneContentProps) {
  return (
    <div style={{ flex: 1, overflowY: scrollable ? 'auto' : 'hidden', padding: '16px' }}>
      {children}
    </div>
  );
}
