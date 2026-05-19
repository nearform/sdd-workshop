import { z } from 'zod';

// Step 1 ships with a single species. The enum is intentionally narrow so the
// allowlist can widen later without a schema migration; see specs/001-foundation-homepage/research.md R1.
export const SpeciesSchema = z.enum(['oak']);
export type Species = z.infer<typeof SpeciesSchema>;

export const StageSchema = z.number().int().min(1).max(16);

export const IdeaSchema = z.object({
  id: z.string().length(26),
  title: z.string().min(1).max(80),
  description: z.string().max(500).nullable(),
  species: SpeciesSchema,
  stage: StageSchema,
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const IdeaListSchema = z.array(IdeaSchema);

export const NewIdeaInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(80, 'Title must be 80 characters or fewer'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .nullish()
    .transform((v) => (v != null && v.length > 0 ? v : null)),
});
export type NewIdeaInput = z.input<typeof NewIdeaInputSchema>;
export type NewIdeaPayload = z.output<typeof NewIdeaInputSchema>;

export const UpdateIdeaInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(80, 'Title must be 80 characters or fewer'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .nullish()
    .transform((v) => (v != null && v.length > 0 ? v : null)),
});
export type UpdateIdeaInput = z.input<typeof UpdateIdeaInputSchema>;
export type UpdateIdeaPayload = z.output<typeof UpdateIdeaInputSchema>;

export const IdeaUpdateSchema = z.object({
  id: z.string().length(26),
  idea_id: z.string().length(26),
  note: z.string().min(1).max(500),
  stage_after: StageSchema,
  created_at: z.number().int().nonnegative(),
});
export type IdeaUpdate = z.infer<typeof IdeaUpdateSchema>;

export const IdeaUpdateListSchema = z.array(IdeaUpdateSchema);

export const IdeaDetailSchema = z.object({
  idea: IdeaSchema,
  updates: IdeaUpdateListSchema,
});
export type IdeaDetail = z.infer<typeof IdeaDetailSchema>;

export const NewUpdateInputSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'A note is required')
    .max(500, 'Note must be 500 characters or fewer'),
});
export type NewUpdateInput = z.input<typeof NewUpdateInputSchema>;
export type NewUpdatePayload = z.output<typeof NewUpdateInputSchema>;

export const IdeaWithUpdateSchema = z.object({
  idea: IdeaSchema,
  update: IdeaUpdateSchema,
});
export type IdeaWithUpdate = z.infer<typeof IdeaWithUpdateSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
