import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Idea } from '@idea-garden/shared';
import { useIdeas } from './useIdeas.ts';

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

const okJson = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useIdeas — list fetch (T034, US2 re-fetch)', () => {
  it('fetches the list on mount and exposes ready state', async () => {
    const idea = buildIdea();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okJson(200, [idea])),
    );

    const { result } = renderHook(() => useIdeas());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.ideas).toEqual([idea]);
  });

  it('refresh() re-fetches and replaces the in-memory list', async () => {
    const first = buildIdea({ title: 'first' });
    const second = buildIdea({ id: 'C'.repeat(26), title: 'second' });
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return calls === 1 ? okJson(200, [first]) : okJson(200, [second, first]);
      }),
    );

    const { result } = renderHook(() => useIdeas());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.ideas).toEqual([first]);

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.ideas).toEqual([second, first]);
  });

  it('exposes an error state when the GET fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okJson(500, { error: 'internal_error' })),
    );

    const { result } = renderHook(() => useIdeas());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.ideas).toEqual([]);
    expect(result.current.error).toBeDefined();
  });
});

describe('useIdeas — createIdea optimistic prepend', () => {
  it('prepends the temp idea immediately, replaces with server result on success', async () => {
    const created = buildIdea({ id: 'D'.repeat(26), title: 'New' });
    let pendingCreate: ((res: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit | undefined) => {
        if (init?.method === 'POST') {
          return new Promise<Response>((resolve) => {
            pendingCreate = resolve;
          });
        }
        return okJson(200, []);
      }),
    );

    const { result } = renderHook(() => useIdeas());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let promise: Promise<Idea>;
    act(() => {
      promise = result.current.createIdea({ title: 'New', description: null });
    });
    // Optimistic temp present
    expect(result.current.ideas).toHaveLength(1);
    expect(result.current.ideas[0]?.title).toBe('New');
    expect(result.current.ideas[0]?.id.startsWith('temp-')).toBe(true);

    // Server resolves
    pendingCreate?.(okJson(201, created));
    await act(async () => {
      await promise!;
    });
    expect(result.current.ideas).toEqual([created]);
  });

  it('rolls back the optimistic prepend on a server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit | undefined) => {
        if (init?.method === 'POST') {
          return okJson(500, { error: 'internal_error' });
        }
        return okJson(200, []);
      }),
    );

    const { result } = renderHook(() => useIdeas());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await expect(
        result.current.createIdea({ title: 'New', description: null }),
      ).rejects.toThrow();
    });
    expect(result.current.ideas).toEqual([]);
  });
});
