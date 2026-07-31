﻿import type { ReactNode } from 'react';
import './tokens.css';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}

export function useTheme() {
  return {
    colors: {
      canvas: 'var(--color-canvas)',
      surface: 'var(--color-surface)',
      surfaceHover: 'var(--color-surface-hover)',
      overlay: 'var(--color-overlay)',
      text: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
      },
      accent: {
        primary: 'var(--color-accent)',
        hover: 'var(--color-accent-hover)',
        light: 'var(--color-accent-light)',
        stamp: 'var(--color-stamp)',
      },
      border: {
        light: 'var(--color-border-light)',
        medium: 'var(--color-border-medium)',
        dark: 'var(--color-border-dark)',
      },
    },
    fonts: {
      title: 'var(--font-title)',
      body: 'var(--font-body)',
      heading: 'var(--font-heading)',
      ui: 'var(--font-ui)',
    },
  };
}
