export type AdminView = 'pending' | 'all' | 'jobs' | 'taxonomy';

export type LinkEnvironment = 'production' | 'test' | 'development' | 'unknown';

export type OrganizationStatus = 'pending' | 'organized';

export type ScanJobStatus = 'running' | 'success' | 'failed';

export type ScanStage =
  | 'connecting'
  | 'reading'
  | 'extracting'
  | 'deduplicating'
  | 'saving';

export type ScanRangeMode = 'since-last' | 'last-7-days' | 'custom';

export interface TelegramSourceMock {
  chatId: string;
  chatName: string;
  messagePreview: string;
  messageUrl?: string;
  capturedAt: string;
}

export interface ManagedLinkMock {
  id: string;
  title: string;
  url: string;
  domain: string;
  project: string;
  purpose: string;
  environment: LinkEnvironment;
  category: string;
  tags: string[];
  status: OrganizationStatus;
  source: TelegramSourceMock;
  scanJobId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanJobMock {
  id: string;
  status: ScanJobStatus;
  stage?: ScanStage;
  progress: number;
  chatNames: string[];
  rangeLabel: string;
  startedAt: string;
  finishedAt?: string;
  messageCount: number;
  foundCount: number;
  newCount: number;
  duplicateCount: number;
  durationMs?: number;
  error?: string;
}

export interface AdminTaxonomyState {
  projects: string[];
  categories: string[];
  tags: string[];
}

export interface AdminStoreV1 {
  version: 1;
  links: ManagedLinkMock[];
  jobs: ScanJobMock[];
  taxonomy: AdminTaxonomyState;
}

export interface ScanConfiguration {
  chatIds: string[];
  rangeMode: ScanRangeMode;
  startDate: string;
  endDate: string;
  defaultProject: string;
  defaultCategory: string;
  defaultTags: string[];
}

export interface LinkFilters {
  query: string;
  project: string;
  category: string;
  environment: string;
  sourceChat: string;
  status: string;
}

export interface TelegramChatMock {
  id: string;
  name: string;
  description: string;
}

export interface ScanCandidateMock {
  title: string;
  url: string;
  purpose: string;
  source: TelegramSourceMock;
  category: string;
  project: string;
  environment: LinkEnvironment;
  tags: string[];
}
