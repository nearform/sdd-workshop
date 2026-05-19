import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  EditIdeaInputSchema,
  EditIdeaUpdateInputSchema,
  IdeaDetailResponseSchema,
  IdeaListSchema,
  IdeaSchema,
  IdeaUpdateListSchema,
  IdeaUpdateSchema,
  MutationResponseSchema,
  NewIdeaInputSchema,
  NewIdeaUpdateInputSchema,
  SpeciesSchema,
} from './ideas.schema.ts';

const goodIdea = {
  id: '01J9YX0G6Q1A8C5XKHQ2N3R7VB',
  title: 'Build an idea garden',
  description: 'A playful CRUD app dressed up as a garden.',
  species: 'oak',
  stage: 1,
  created_at: 1746783402123,
  updated_at: 1746783402123,
};

describe('IdeaSchema', () => {
  it('accepts a known-good payload', () => {
    expect(IdeaSchema.parse(goodIdea)).toEqual(goodIdea);
  });

  it('accepts a null description', () => {
    expect(IdeaSchema.parse({ ...goodIdea, description: null }).description).toBeNull();
  });

  it('rejects an id of length 25', () => {
    expect(() => IdeaSchema.parse({ ...goodIdea, id: 'A'.repeat(25) })).toThrow();
  });

  it('rejects an id of length 27', () => {
    expect(() => IdeaSchema.parse({ ...goodIdea, id: 'A'.repeat(27) })).toThrow();
  });

  it('rejects an empty title', () => {
    expect(() => IdeaSchema.parse({ ...goodIdea, title: '' })).toThrow();
  });

  it('rejects a title of length 81', () => {
    expect(() => IdeaSchema.parse({ ...goodIdea, title: 'x'.repeat(81) })).toThrow();
  });

  it('accepts a title at the boundary (1 char)', () => {
    expect(IdeaSchema.parse({ ...goodIdea, title: 'x' }).title).toBe('x');
  });

  it('accepts a title at the boundary (80 chars)', () => {
    const t80 = 'x'.repeat(80);
    expect(IdeaSchema.parse({ ...goodIdea, title: t80 }).title).toBe(t80);
  });

  it('rejects a description of length 501', () => {
    expect(() => IdeaSchema.parse({ ...goodIdea, description: 'x'.repeat(501) })).toThrow();
  });

  it('rejects stage 0', () => {
    expect(() => IdeaSchema.parse({ ...goodIdea, stage: 0 })).toThrow();
  });

  it('rejects stage 17', () => {
    expect(() => IdeaSchema.parse({ ...goodIdea, stage: 17 })).toThrow();
  });

  it('rejects a species not in the allowlist', () => {
    expect(() => IdeaSchema.parse({ ...goodIdea, species: 'redwood' })).toThrow();
  });

  it('rejects a non-integer stage', () => {
    expect(() => IdeaSchema.parse({ ...goodIdea, stage: 1.5 })).toThrow();
  });

  it('rejects a negative created_at', () => {
    expect(() => IdeaSchema.parse({ ...goodIdea, created_at: -1 })).toThrow();
  });
});

describe('NewIdeaInputSchema', () => {
  it('trims whitespace from titles', () => {
    expect(NewIdeaInputSchema.parse({ title: '  hello  ', description: null }).title).toBe('hello');
  });

  it('rejects whitespace-only title', () => {
    expect(() => NewIdeaInputSchema.parse({ title: '   ', description: null })).toThrow();
  });

  it('accepts title-only with description omitted', () => {
    expect(NewIdeaInputSchema.parse({ title: 'idea' })).toEqual({ title: 'idea', description: null });
  });

  it('treats empty-string description as null', () => {
    expect(NewIdeaInputSchema.parse({ title: 'idea', description: '' }).description).toBeNull();
  });

  it('accepts a 500-character description', () => {
    const desc = 'x'.repeat(500);
    expect(NewIdeaInputSchema.parse({ title: 'idea', description: desc }).description).toBe(desc);
  });

  it('rejects a 501-character description', () => {
    expect(() => NewIdeaInputSchema.parse({ title: 'idea', description: 'x'.repeat(501) })).toThrow();
  });

  it('accepts emoji and special characters in titles', () => {
    expect(NewIdeaInputSchema.parse({ title: '🌱 idea' }).title).toBe('🌱 idea');
  });

  it('treats a 1-char title (after trim) as valid', () => {
    expect(NewIdeaInputSchema.parse({ title: ' x ' }).title).toBe('x');
  });

  it('rejects an 81-char title (after trim)', () => {
    expect(() => NewIdeaInputSchema.parse({ title: ` ${'x'.repeat(81)} ` })).toThrow();
  });
});

describe('SpeciesSchema', () => {
  it('exposes the Step 1 allowlist via .options', () => {
    expect(SpeciesSchema.options).toEqual(['oak']);
  });

  it('accepts oak', () => {
    expect(SpeciesSchema.parse('oak')).toBe('oak');
  });
});

describe('ApiErrorSchema', () => {
  it('accepts an error with no details', () => {
    expect(ApiErrorSchema.parse({ error: 'validation' })).toEqual({ error: 'validation' });
  });

  it('accepts an error with arbitrary details', () => {
    const parsed = ApiErrorSchema.parse({ error: 'validation', details: [{ path: ['title'] }] });
    expect(parsed.error).toBe('validation');
    expect(parsed.details).toEqual([{ path: ['title'] }]);
  });
});

describe('IdeaListSchema', () => {
  it('accepts an empty array', () => {
    expect(IdeaListSchema.parse([])).toEqual([]);
  });

  it('accepts a list of valid ideas', () => {
    expect(IdeaListSchema.parse([goodIdea])).toHaveLength(1);
  });
});

const goodUpdate = {
  id: '01K0AB0G6Q1A8C5XKHQ2N3R7VB',
  idea_id: '01J9YX0G6Q1A8C5XKHQ2N3R7VB',
  note: 'Sketched the logo on paper.',
  stage_after: 7,
  created_at: 1746825999000,
};

describe('IdeaUpdateSchema', () => {
  it('accepts a known-good payload', () => {
    expect(IdeaUpdateSchema.parse(goodUpdate)).toEqual(goodUpdate);
  });

  it('rejects an empty note', () => {
    expect(() => IdeaUpdateSchema.parse({ ...goodUpdate, note: '' })).toThrow();
  });

  it('rejects a 1001-char note', () => {
    expect(() => IdeaUpdateSchema.parse({ ...goodUpdate, note: 'x'.repeat(1001) })).toThrow();
  });

  it('rejects stage_after 0', () => {
    expect(() => IdeaUpdateSchema.parse({ ...goodUpdate, stage_after: 0 })).toThrow();
  });

  it('rejects stage_after 17', () => {
    expect(() => IdeaUpdateSchema.parse({ ...goodUpdate, stage_after: 17 })).toThrow();
  });

  it('rejects an id that is not 26 chars', () => {
    expect(() => IdeaUpdateSchema.parse({ ...goodUpdate, id: 'short' })).toThrow();
  });
});

describe('IdeaUpdateListSchema', () => {
  it('accepts an empty list', () => {
    expect(IdeaUpdateListSchema.parse([])).toEqual([]);
  });

  it('accepts a list of valid updates', () => {
    expect(IdeaUpdateListSchema.parse([goodUpdate])).toHaveLength(1);
  });
});

describe('NewIdeaUpdateInputSchema', () => {
  it('accepts a valid 1-char note', () => {
    expect(NewIdeaUpdateInputSchema.parse({ note: 'x' }).note).toBe('x');
  });

  it('trims whitespace from notes', () => {
    expect(NewIdeaUpdateInputSchema.parse({ note: '  hello  ' }).note).toBe('hello');
  });

  it('preserves newlines inside the note (trim only strips leading/trailing whitespace)', () => {
    const multi = 'line one\nline two';
    expect(NewIdeaUpdateInputSchema.parse({ note: multi }).note).toBe(multi);
  });

  it('rejects an empty note', () => {
    expect(() => NewIdeaUpdateInputSchema.parse({ note: '' })).toThrow();
  });

  it('rejects a whitespace-only note', () => {
    expect(() => NewIdeaUpdateInputSchema.parse({ note: '   \n\t  ' })).toThrow();
  });

  it('rejects a 1001-char note', () => {
    expect(() => NewIdeaUpdateInputSchema.parse({ note: 'x'.repeat(1001) })).toThrow();
  });
});

describe('EditIdeaInputSchema', () => {
  it('accepts title-only', () => {
    expect(EditIdeaInputSchema.parse({ title: 'new title' }).title).toBe('new title');
  });

  it('accepts description-only', () => {
    expect(EditIdeaInputSchema.parse({ description: 'new desc' }).description).toBe('new desc');
  });

  it('accepts description set to null', () => {
    expect(EditIdeaInputSchema.parse({ description: null }).description).toBeNull();
  });

  it('rejects a body with neither field present', () => {
    expect(() => EditIdeaInputSchema.parse({})).toThrow();
  });

  it('rejects empty title', () => {
    expect(() => EditIdeaInputSchema.parse({ title: '' })).toThrow();
  });

  it('rejects 81-char title', () => {
    expect(() => EditIdeaInputSchema.parse({ title: 'x'.repeat(81) })).toThrow();
  });

  it('rejects 501-char description', () => {
    expect(() => EditIdeaInputSchema.parse({ description: 'x'.repeat(501) })).toThrow();
  });
});

describe('EditIdeaUpdateInputSchema', () => {
  it('accepts a valid note', () => {
    expect(EditIdeaUpdateInputSchema.parse({ note: 'updated note' }).note).toBe('updated note');
  });

  it('rejects an empty note', () => {
    expect(() => EditIdeaUpdateInputSchema.parse({ note: '' })).toThrow();
  });
});

describe('IdeaDetailResponseSchema', () => {
  it('accepts an idea with zero updates', () => {
    const parsed = IdeaDetailResponseSchema.parse({ idea: goodIdea, updates: [] });
    expect(parsed.updates).toEqual([]);
  });

  it('accepts an idea with one update', () => {
    const parsed = IdeaDetailResponseSchema.parse({ idea: goodIdea, updates: [goodUpdate] });
    expect(parsed.updates).toHaveLength(1);
  });
});

describe('MutationResponseSchema', () => {
  it('accepts a response with the update field (insert/edit-update shape)', () => {
    const parsed = MutationResponseSchema.parse({
      idea: goodIdea,
      prev_stage: 1,
      update: goodUpdate,
    });
    expect(parsed.update).toBeDefined();
  });

  it('accepts a response without the update field (delete-update / delete-idea / patch-idea shape)', () => {
    const parsed = MutationResponseSchema.parse({ idea: goodIdea, prev_stage: 1 });
    expect(parsed.update).toBeUndefined();
  });

  it('rejects a prev_stage outside the 1–16 range', () => {
    expect(() => MutationResponseSchema.parse({ idea: goodIdea, prev_stage: 17 })).toThrow();
  });
});
