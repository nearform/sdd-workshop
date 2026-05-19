import { useCallback, useEffect, useState } from 'react';
import type { Idea, NewIdeaInput } from '@idea-garden/shared';
import { ApiClientError, createIdea, listIdeas } from '../api/ideas.ts';

export type UseIdeasState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  ideas: Idea[];
  error?: string;
};

export type UseIdeasResult = UseIdeasState & {
  createIdea: (input: NewIdeaInput) => Promise<Idea>;
  replaceIdea: (idea: Idea) => void;
  removeIdea: (id: string) => void;
  refresh: () => Promise<void>;
};

const TEMP_ID_PREFIX = 'temp-';

function makeTempIdea(input: NewIdeaInput): Idea {
  const now = Date.now();
  return {
    id: `${TEMP_ID_PREFIX}${now}`.padEnd(26, '0').slice(0, 26),
    title: input.title.trim(),
    description: input.description && input.description.length > 0 ? input.description : null,
    species: 'oak',
    stage: 1,
    created_at: now,
    updated_at: now,
  };
}

export function useIdeas(): UseIdeasResult {
  const [state, setState] = useState<UseIdeasState>({ status: 'idle', ideas: [] });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const ideas = await listIdeas();
      setState({ status: 'ready', ideas });
    } catch (err) {
      setState({
        status: 'error',
        ideas: [],
        error: err instanceof ApiClientError ? err.message : 'Failed to load ideas',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (input: NewIdeaInput): Promise<Idea> => {
    const temp = makeTempIdea(input);
    setState((s) => ({ ...s, ideas: [temp, ...s.ideas], status: 'ready' }));
    try {
      const created = await createIdea(input);
      setState((s) => ({
        ...s,
        ideas: s.ideas.map((i) => (i.id === temp.id ? created : i)),
      }));
      return created;
    } catch (err) {
      // Roll back the optimistic prepend
      setState((s) => ({ ...s, ideas: s.ideas.filter((i) => i.id !== temp.id) }));
      throw err;
    }
  }, []);

  const replaceIdea = useCallback((idea: Idea) => {
    setState((s) => ({
      ...s,
      ideas: s.ideas.map((i) => (i.id === idea.id ? idea : i)),
    }));
  }, []);

  const removeIdea = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      ideas: s.ideas.filter((i) => i.id !== id),
    }));
  }, []);

  return {
    ...state,
    createIdea: create,
    replaceIdea,
    removeIdea,
    refresh,
  };
}
