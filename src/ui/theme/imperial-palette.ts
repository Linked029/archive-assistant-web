/**
 * Imperial Chinese-inspired color palette for 聚合拾遗.
 * Muted earth tones, ink washes, and vermillion accents.
 */
export const colors = {
  /* Background layers */
  bg: {
    canvas: '#F5F0E8',         // 宣纸底色 (xuan paper)
    surface: '#EDE6D6',        // 略深的纸面
    surfaceHover: '#E3D9C3',
    overlay: 'rgba(30, 25, 20, 0.55)',
  },

  /* Text */
  text: {
    primary: '#2C2416',
    secondary: '#6B5E50',
    muted: '#9A8B78',
    ink: '#1A1510',
  },

  /* Accent — 朱砂 (cinnabar) */
  accent: {
    primary: '#C23B22',        // 朱砂红
    hover: '#A6301C',
    light: '#F5D6CB',
    stamp: '#B83220',          // 印章色
  },

  /* Border / divider — 墨线 */
  border: {
    light: '#D4C9B3',
    medium: '#B8A88A',
    dark: '#8B7D6B',
  },

  /* Content type badges */
  badge: {
    web: '#4A7C59',
    image: '#7A6B5C',
    document: '#5A6B7A',
  },

  /* Six ministry accent colors */
  ministry: {
    officials: '#8B7D6B',   // 吏部 — 褐
    treasury:  '#A67C52',   // 户部 — 琥珀
    rites:     '#7A5C3A',   // 礼部 — 赭
    military:  '#5E5D59',   // 兵部 — 铁灰
    justice:   '#4A4A44',   // 刑部 — 墨
    works:     '#6B5E50',   // 工部 — 棕
  },
} as const;

export const fonts = {
  title: '"Ma Shan Zheng", "KaiTi", "STKaiti", serif',
  body: '"Dinglie Song", "Noto Serif SC", "SimSun", "STSong", serif',
  heading: '"San Ji XingKai", "KaiTi", "STKaiti", serif',
  ui: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  round: '50%',
} as const;

export const shadows = {
  card: '0 2px 8px rgba(44, 36, 22, 0.08)',
  elevated: '0 4px 16px rgba(44, 36, 22, 0.12)',
  modal: '0 8px 32px rgba(44, 36, 22, 0.18)',
} as const;
