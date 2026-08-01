import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .max(200)
  .transform((value) => value || undefined)
  .optional()
  .catch(undefined);
const optionalUuid = z.string().uuid().optional().catch(undefined);

export const webLinksSearchSchema = z.object({
  categoryId: optionalUuid,
  environment: z
    .enum(['production', 'test', 'development', 'unknown'])
    .optional()
    .catch(undefined),
  linkId: optionalUuid,
  page: z.coerce.number().int().positive().catch(1).default(1),
  projectId: z
    .union([z.literal('unassigned'), z.string().uuid()])
    .optional()
    .catch(undefined),
  q: optionalText,
  sort: z.enum(['newest', 'oldest', 'title']).catch('newest').default('newest'),
  status: z.enum(['pending', 'organized']).optional().catch(undefined),
  view: z.enum(['all', 'recent', 'pending']).catch('all').default('all'),
});

export type WebLinksSearch = z.infer<typeof webLinksSearchSchema>;

export const defaultWebLinksSearch: WebLinksSearch = {
  page: 1,
  sort: 'newest',
  view: 'all',
};
