﻿export const ContentType = {
  ALL: 'ALL',
  WEB_ARTICLE: 'WEB_ARTICLE',
  IMAGE_SCREENSHOT: 'IMAGE_SCREENSHOT',
  DOCUMENT: 'DOCUMENT',
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  [ContentType.ALL]: '全部',
  [ContentType.WEB_ARTICLE]: '网页',
  [ContentType.IMAGE_SCREENSHOT]: '图像',
  [ContentType.DOCUMENT]: '文档',
};

export const DocumentFormat = {
  PDF: 'PDF',
  MARKDOWN: 'MARKDOWN',
  TXT: 'TXT',
  DOCX: 'DOCX',
  UNKNOWN: 'UNKNOWN',
} as const;

export type DocumentFormat = (typeof DocumentFormat)[keyof typeof DocumentFormat];

export const DOCUMENT_FORMAT_LABELS: Record<DocumentFormat, string> = {
  [DocumentFormat.PDF]: 'PDF',
  [DocumentFormat.MARKDOWN]: 'Markdown',
  [DocumentFormat.TXT]: '纯文本',
  [DocumentFormat.DOCX]: 'Word',
  [DocumentFormat.UNKNOWN]: '未知文档',
};

export interface KnowledgeItem {
  id: string;
  topicId: string;
  contentType: ContentType;
  title: string;
  summary: string;
  fullText: string;
  sourceUrl?: string;
  imageResName?: string;
  documentFormat?: DocumentFormat;
  fileName?: string;
  fileSize?: number;
  createdAtEpochMillis: number;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
