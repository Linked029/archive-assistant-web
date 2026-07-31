export const DEFAULT_TOPIC_ICONS = [
  'folder-spark',
  'folder-clover',
  'folder-star',
  'folder-shield',
  'folder-gavel',
  'folder-tool',
] as const;

export type TopicIconName = (typeof DEFAULT_TOPIC_ICONS)[number] | string;

export interface Topic {
  id: string;
  title: string;
  iconName: TopicIconName;
  iconColor: string;
  updatedAtEpochMillis: number;
  order: number;
}

export const SIX_MINISTRIES: Topic[] = [
  { id: 'officials',  title: '吏 · 名籍', iconName: 'folder-spark',  iconColor: '#8B7D6B', updatedAtEpochMillis: Date.now(), order: 0 },
  { id: 'treasury',   title: '户 · 府库', iconName: 'folder-clover', iconColor: '#A67C52', updatedAtEpochMillis: Date.now(), order: 1 },
  { id: 'rites',      title: '礼 · 典章', iconName: 'folder-star',   iconColor: '#7A5C3A', updatedAtEpochMillis: Date.now(), order: 2 },
  { id: 'military',   title: '兵 · 行令', iconName: 'folder-shield', iconColor: '#5E5D59', updatedAtEpochMillis: Date.now(), order: 3 },
  { id: 'justice',    title: '刑 · 稽核', iconName: 'folder-gavel',  iconColor: '#4A4A44', updatedAtEpochMillis: Date.now(), order: 4 },
  { id: 'works',      title: '工 · 营造', iconName: 'folder-tool',   iconColor: '#6B5E50', updatedAtEpochMillis: Date.now(), order: 5 },
];

export function resolveTopicId(topicId: string | null | undefined): string {
  if (!topicId) return 'treasury';
  return topicId;
}
