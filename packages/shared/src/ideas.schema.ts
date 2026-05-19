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

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const IdeaUpdateSchema = z.object({
  id: z.string().length(26),
  idea_id: z.string().length(26),
  note: z.string().min(1).max(1000),
  stage_after: StageSchema,
  created_at: z.number().int().nonnegative(),
});
export type IdeaUpdate = z.infer<typeof IdeaUpdateSchema>;

export const IdeaUpdateListSchema = z.array(IdeaUpdateSchema);

export const NewIdeaUpdateInputSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'Note is required')
    .max(1000, 'Note must be 1000 characters or fewer'),
});
export type NewIdeaUpdateInput = z.input<typeof NewIdeaUpdateInputSchema>;
export type NewIdeaUpdatePayload = z.output<typeof NewIdeaUpdateInputSchema>;

export const EditIdeaInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(80, 'Title must be 80 characters or fewer')
      .optional(),
    description: z
      .union([z.string().max(500, 'Description must be 500 characters or fewer'), z.null()])
      .optional(),
  })
  .refine(
    (data) => data.title !== undefined || data.description !== undefined,
    { message: 'At least one of title or description must be present' },
  );
export type EditIdeaInput = z.infer<typeof EditIdeaInputSchema>;

export const EditIdeaUpdateInputSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'Note is required')
    .max(1000, 'Note must be 1000 characters or fewer'),
});
export type EditIdeaUpdateInput = z.input<typeof EditIdeaUpdateInputSchema>;

export const IdeaDetailResponseSchema = z.object({
  idea: IdeaSchema,
  updates: IdeaUpdateListSchema,
});
export type IdeaDetailResponse = z.infer<typeof IdeaDetailResponseSchema>;

export const MutationResponseSchema = z.object({
  idea: IdeaSchema,
  prev_stage: StageSchema,
  update: IdeaUpdateSchema.optional(),
});
export type MutationResponse = z.infer<typeof MutationResponseSchema>;
