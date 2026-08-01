import type {
  BatchLinkPatchDto,
  CreateSyncJobDto,
  LinkResponseDto,
  SyncJobResponseDto,
} from '@/api/types.gen';
import type { AdminStoreV2 } from '@/lib/admin-store';
import { createContext, useContext } from 'react';

export type TaxonomyKind = 'projects' | 'categories' | 'tags';

export interface DemoScanConfiguration {
  chatIds: string[];
  defaultCategoryId?: string;
  defaultProjectId?: string;
  defaultTagIds: string[];
  rangeFrom?: string;
  rangeMode: CreateSyncJobDto['rangeMode'];
  rangeTo?: string;
}

interface CompletionResult {
  completed: number;
  skipped: number;
}

export interface DemoAdminContextValue {
  addTaxonomy: (kind: TaxonomyKind, value: string) => string | null;
  applyBulkPatch: (ids: ReadonlySet<string>, patch: BatchLinkPatchDto) => void;
  completeLinks: (ids: ReadonlySet<string>) => CompletionResult;
  deleteTaxonomy: (kind: TaxonomyKind, id: string) => void;
  renameTaxonomy: (
    kind: TaxonomyKind,
    id: string,
    value: string,
  ) => string | null;
  runningJob: SyncJobResponseDto | null;
  saveLink: (link: LinkResponseDto) => void;
  startScan: (configuration: DemoScanConfiguration) => void;
  store: AdminStoreV2;
}

export const DemoAdminContext = createContext<DemoAdminContextValue | null>(
  null,
);

export function useDemoAdmin(): DemoAdminContextValue {
  const value = useContext(DemoAdminContext);
  if (!value) {
    throw new Error('useDemoAdmin must be used within DemoAdminProvider.');
  }
  return value;
}
