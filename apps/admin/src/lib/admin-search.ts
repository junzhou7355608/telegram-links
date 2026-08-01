import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .max(200)
  .transform((value) => value || undefined)
  .optional()
  .catch(undefined);
const optionalUuid = z.string().uuid().optional().catch(undefined);
const page = z.coerce.number().int().positive().catch(1).default(1);
const tagIds = z
  .union([
    z.array(z.string().uuid()),
    z.string().transform((value) => value.split(',').filter(Boolean)),
  ])
  .pipe(z.array(z.string().uuid()))
  .optional()
  .catch(undefined);

export const linksSearchSchema = z.object({
  categoryId: optionalUuid,
  environment: z
    .enum(['production', 'test', 'development', 'unknown'])
    .optional()
    .catch(undefined),
  includeArchived: z.boolean().optional().catch(undefined),
  linkId: optionalUuid,
  page,
  projectId: z
    .union([z.literal('unassigned'), z.string().uuid()])
    .optional()
    .catch(undefined),
  q: optionalText,
  sort: z.enum(['newest', 'oldest', 'title']).catch('newest').default('newest'),
  sourceChatId: optionalUuid,
  status: z.enum(['pending', 'organized']).optional().catch(undefined),
  tagIds,
});

export const syncJobsSearchSchema = z.object({ page });

export const taxonomySearchSchema = z.object({
  kind: z
    .enum(['projects', 'categories', 'tags'])
    .catch('projects')
    .default('projects'),
});

export const telegramSearchSchema = z.object({
  page,
  query: optionalText,
  type: z
    .enum(['saved', 'private', 'group', 'channel'])
    .optional()
    .catch(undefined),
});

export type LinksSearch = z.infer<typeof linksSearchSchema>;
export type SyncJobsSearch = z.infer<typeof syncJobsSearchSchema>;
export type TaxonomySearch = z.infer<typeof taxonomySearchSchema>;
export type TelegramSearch = z.infer<typeof telegramSearchSchema>;
