import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Idea, IdeaDetailResponse } from '@idea-garden/shared';
import { ApiClientError } from '../api/ideas.ts';
import { useIdeaDetail } from './useIdeaDetail.ts';

const ULID = 'B'.repeat(26);

const buildIdea = (overrides: Partial<Idea> = {}): Idea => ({
  id: ULID,
  title: 'Persisted idea',
  description: null,
  species: 'oak',
  stage: 1,
  created_at: 1746783402000,
  updated_at: 1746783402000,
  ...overrides,
});

vi.mock('../api/ideas.ts', async () => {
  const actual = await vi.importActual<typeof import('../api/ideas.ts')>('../api/ideas.ts');
  return {
    ...actual,
    getIdea: vi.fn(),
  };
});

import { getIdea } from '../api/ideas.ts';
const getIdeaMock = getIdea as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  getIdeaMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useIdeaDetail', () => {
  it('returns idle when ideaId is null', () => {
    const { result } = renderHook(() => useIdeaDetail(null));
    expect(result.current.status).toBe('idle');
    expect(getIdeaMock).not.toHaveBeenCalled();
  });

  it('starts in loading state when ideaId is provided', async () => {
    let resolve: (v: IdeaDetailResponse) => void = () => {};
    getIdeaMock.mockReturnValueOnce(
      new Promise<IdeaDetailResponse>((r) => {
        resolve = r;
      }),
    );

    const { result } = renderHook(() => useIdeaDetail(ULID));
    expect(result.current.status).toBe('loading');

    resolve({ idea: buildIdea(), updates: [] });
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('resolves to ready with idea + updates on success', async () => {
    const idea = buildIdea();
    getIdeaMock.mockResolvedValueOnce({ idea, updates: [] });

    const { result } = renderHook(() => useIdeaDetail(ULID));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status !== 'ready') throw new Error('not ready');
    expect(result.current.idea).toEqual(idea);
    expect(result.current.updates).toEqual([]);
  });

  it('resolves to not_found on a 404 ApiClientError', async () => {
    getIdeaMock.mockRejectedValueOnce(new ApiClientError(404, 'idea_not_found'));
    const { result } = renderHook(() => useIdeaDetail(ULID));
    await waitFor(() => expect(result.current.status).toBe('not_found'));
  });

  it('resolves to error on a 500 ApiClientError', async () => {
    getIdeaMock.mockRejectedValueOnce(new ApiClientError(500, 'internal_error'));
    const { result } = renderHook(() => useIdeaDetail(ULID));
    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status !== 'error') throw new Error('not error');
    expect(result.current.error).toBe('internal_error');
  });
});
