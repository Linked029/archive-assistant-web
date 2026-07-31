import type { ContentType, DocumentFormat } from './item';

export const AiEngineType = {
  OPENAI_COMPATIBLE: 'OPENAI_COMPATIBLE',
  OPENAI_RESPONSES: 'OPENAI_RESPONSES',
  ANTHROPIC: 'ANTHROPIC',
  GEMINI: 'GEMINI',
  LOCAL_MODEL: 'LOCAL_MODEL',
} as const;

export type AiEngineType = (typeof AiEngineType)[keyof typeof AiEngineType];

export const AI_ENGINE_LABELS: Record<AiEngineType, string> = {
  [AiEngineType.OPENAI_COMPATIBLE]: 'OpenAI Compatible',
  [AiEngineType.OPENAI_RESPONSES]: 'OpenAI Responses',
  [AiEngineType.ANTHROPIC]: 'Anthropic',
  [AiEngineType.GEMINI]: 'Gemini',
  [AiEngineType.LOCAL_MODEL]: '本地模型 (Web版不可用)',
};

export interface AiEngineSettings {
  engineType: AiEngineType;
  baseUrl: string;
  modelName: string;
  apiKey: string;
}

export const DEFAULT_AI_SETTINGS: AiEngineSettings = {
  engineType: AiEngineType.OPENAI_COMPATIBLE,
  baseUrl: 'https://api.openai.com/v1',
  modelName: 'gpt-4o-mini',
  apiKey: '',
};

export interface AiEnginePreset {
  name: string;
  engineType: AiEngineType;
  baseUrl: string;
  modelName: string;
  apiKey: string;
}

export interface ClassificationPayload {
  topicId: string;
  contentType: ContentType;
  title: string;
  summary: string;
  rawInput: string;
  documentFormat?: DocumentFormat;
}

export type ClassificationResult =
  | { kind: 'classified'; payload: ClassificationPayload }
  | { kind: 'blank'; message: string }
  | { kind: 'unknown' };

export const AI_PRESET_TEMPLATES: { name: string; engineType: AiEngineType; baseUrl: string; modelName: string }[] = [
  { name: 'DeepSeek', engineType: AiEngineType.OPENAI_COMPATIBLE, baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat' },
  { name: 'Grok (xAI)', engineType: AiEngineType.OPENAI_COMPATIBLE, baseUrl: 'https://api.x.ai/v1', modelName: 'grok-2-latest' },
  { name: 'Moonshot Kimi', engineType: AiEngineType.OPENAI_COMPATIBLE, baseUrl: 'https://api.moonshot.cn/v1', modelName: 'moonshot-v1-8k' },
  { name: 'Qwen (阿里云)', engineType: AiEngineType.OPENAI_COMPATIBLE, baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelName: 'qwen-plus' },
  { name: 'GLM (智谱)', engineType: AiEngineType.OPENAI_COMPATIBLE, baseUrl: 'https://open.bigmodel.cn/api/paas/v4', modelName: 'glm-4-flash' },
  { name: 'Ollama (本地)', engineType: AiEngineType.OPENAI_COMPATIBLE, baseUrl: 'http://localhost:11434/v1', modelName: 'llama3.1' },
];