import type { LinkEnvironmentValue } from '../common/link-values';

export interface AiModel {
  contextLength: number | null;
  id: string;
  ownedBy: string;
  supportsReasoning: boolean;
}

export interface AiTaxonomyItem {
  id: string;
  name: string;
}

export interface AiContextMessage {
  sentAt: string;
  senderName: string | null;
  text: string;
}

export interface AiClassificationContext {
  chat: {
    name: string;
    type: string;
  };
  current: AiContextMessage;
  forwardSource: string | null;
  neighbors: AiContextMessage[];
  reply: AiContextMessage | null;
}

export interface AiClassificationInput {
  categories: AiTaxonomyItem[];
  context: AiClassificationContext;
  projects: AiTaxonomyItem[];
  tags: AiTaxonomyItem[];
  urls: { normalizedUrl: string; rawUrl: string }[];
}

export interface AiLinkClassification {
  categoryId: string | null;
  confidence: number;
  environment: LinkEnvironmentValue;
  normalizedUrl: string;
  projectId: string | null;
  purpose: string | null;
  rationale: string;
  suggestedCategoryName: string | null;
  suggestedProjectName: string | null;
  suggestedTagNames: string[];
  tagIds: string[];
  title: string;
}

export interface AiTokenUsage {
  completionTokens: number;
  promptTokens: number;
  totalTokens: number;
}

export interface AiClassificationResult {
  items: AiLinkClassification[];
  usage: AiTokenUsage;
}

export interface AiRuntime {
  apiKey: string;
  model: AiModel;
  provider: 'kimi';
}

export class AiGatewayError extends Error {
  constructor(
    readonly code: 'auth' | 'rateLimit' | 'response' | 'unavailable',
    message: string,
  ) {
    super(message);
    this.name = 'AiGatewayError';
  }
}

export abstract class AiGateway {
  abstract classify(
    runtime: AiRuntime,
    input: AiClassificationInput,
  ): Promise<AiClassificationResult>;

  abstract listModels(apiKey: string): Promise<AiModel[]>;
}
