﻿import type { ReactNode } from 'react';
import { colors, fonts } from '../theme/imperial-palette';

interface PaneHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function PaneHeader({ title, subtitle, actions, onBack, showBackButton }: PaneHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        borderBottom: `1px solid ${colors.border.light}`,
        background: colors.bg.canvas,
        minHeight: '56px',
      }}
    >
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.text.secondary,
            fontFamily: fonts.ui,
            fontSize: '20px',
            padding: '4px 8px',
          }}
        >
          ←
        </button>
      )}
      <div style={{ flex: 1 }}>
        <h1 style={{
          margin: 0,
          fontFamily: fonts.heading,
          fontSize: '20px',
          color: colors.text.primary,
          fontWeight: 500,
        }}>
          {title}
        </h1>
        {subtitle && (
          <span style={{ fontFamily: fonts.ui, fontSize: '13px', color: colors.text.muted }}>
            {subtitle}
          </span>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
    </div>
  );
}
