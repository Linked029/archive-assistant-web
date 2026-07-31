import type { ReactNode } from 'react';
import { colors, fonts, shadows, borderRadius } from '../theme/imperial-palette';

interface ArchiveDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function ArchiveDialog({ open, onClose, title, children }: ArchiveDialogProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg.overlay,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: colors.bg.canvas,
          borderRadius: borderRadius.lg,
          boxShadow: shadows.modal,
          width: 'min(480px, 90vw)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${colors.border.light}`,
          }}
        >
          <h2 style={{
            margin: 0,
            fontFamily: fonts.heading,
            fontSize: '18px',
            color: colors.text.primary,
            fontWeight: 500,
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.text.muted,
              fontSize: '20px',
              padding: '4px',
              fontFamily: fonts.ui,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface ArchiveChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  color?: string;
}

export function ArchiveChip({ label, selected, onClick, color }: ArchiveChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: borderRadius.sm,
        border: `1px solid ${selected ? (color || colors.accent.primary) : colors.border.light}`,
        background: selected ? (color ? `${color}20` : colors.accent.light) : 'transparent',
        color: selected ? (color || colors.accent.primary) : colors.text.secondary,
        fontFamily: fonts.ui,
        fontSize: '13px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.1s ease',
      }}
    >
      {label}
    </button>
  );
}

interface ActionButtonProps {
  label: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
}

export function ActionButton({ label, onClick, variant = 'primary', disabled }: ActionButtonProps) {
  const bg = variant === 'primary' ? colors.accent.primary
    : variant === 'danger' ? '#A6301C'
    : 'transparent';
  const textColor = variant === 'ghost' ? colors.text.secondary : '#fff';
  const borderColor = variant === 'ghost' ? 'transparent' : bg;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        borderRadius: borderRadius.md,
        border: `1px solid ${borderColor}`,
        background: bg,
        color: textColor,
        fontFamily: fonts.ui,
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.1s ease',
      }}
    >
      {typeof label === "string" ? label : label}
    </button>
  );
}
