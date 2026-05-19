import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  IdeaListSchema,
  IdeaSchema,
  NewIdeaInputSchema,
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
