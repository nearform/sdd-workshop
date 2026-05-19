import { useCallback, useEffect, useState } from 'react';
import type {
  EditIdeaInput,
  EditIdeaUpdateInput,
  Idea,
  MutationResponse,
  NewIdeaInput,
  NewIdeaUpdateInput,
} from '@idea-garden/shared';
import {
  ApiClientError,
  addUpdate as apiAddUpdate,
  createIdea as apiCreateIdea,
  deleteIdea as apiDeleteIdea,
  deleteUpdate as apiDeleteUpdate,
  listIdeas,
  patchIdea as apiPatchIdea,
  patchUpdate as apiPatchUpdate,
} from '../api/ideas.ts';

export type UseIdeasState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  ideas: Idea[];
  error?: string;
};

export type UseIdeasResult = UseIdeasState & {
  createIdea: (input: NewIdeaInput) => Promise<Idea>;
  refresh: () => Promise<void>;
  addUpdate: (ideaId: string, input: NewIdeaUpdateInput) => Promise<MutationResponse>;
  editIdea: (ideaId: string, input: EditIdeaInput) => Promise<MutationResponse>;
  editUpdate: (
    ideaId: string,
    updateId: string,
    input: EditIdeaUpdateInput,
  ) => Promise<MutationResponse>;
  deleteUpdate: (ideaId: string, updateId: string) => Promise<MutationResponse>;
  deleteIdea: (ideaId: string) => Promise<void>;
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
      const created = await apiCreateIdea(input);
      setState((s) => ({
        ...s,
        ideas: s.ideas.map((i) => (i.id === temp.id ? created : i)),
      }));
      return created;
    } catch (err) {
      setState((s) => ({ ...s, ideas: s.ideas.filter((i) => i.id !== temp.id) }));
      throw err;
    }
  }, []);

  const addUpdate = useCallback(
    async (ideaId: string, input: NewIdeaUpdateInput): Promise<MutationResponse> => {
      const result = await apiAddUpdate(ideaId, input);
      setState((s) => ({
        ...s,
        ideas: s.ideas.map((i) => (i.id === ideaId ? result.idea : i)),
      }));
      return result;
    },
    [],
  );

  const editIdea = useCallback(
    async (ideaId: string, input: EditIdeaInput): Promise<MutationResponse> => {
      const result = await apiPatchIdea(ideaId, input);
      setState((s) => ({
        ...s,
        ideas: s.ideas.map((i) => (i.id === ideaId ? result.idea : i)),
      }));
      return result;
    },
    [],
  );

  const editUpdate = useCallback(
    async (
      ideaId: string,
      updateId: string,
      input: EditIdeaUpdateInput,
    ): Promise<MutationResponse> => {
      const result = await apiPatchUpdate(ideaId, updateId, input);
      setState((s) => ({
        ...s,
        ideas: s.ideas.map((i) => (i.id === ideaId ? result.idea : i)),
      }));
      return result;
    },
    [],
  );

  const deleteUpdate = useCallback(
    async (ideaId: string, updateId: string): Promise<MutationResponse> => {
      const result = await apiDeleteUpdate(ideaId, updateId);
      setState((s) => ({
        ...s,
        ideas: s.ideas.map((i) => (i.id === ideaId ? result.idea : i)),
      }));
      return result;
    },
    [],
  );

  const deleteIdea = useCallback(async (ideaId: string): Promise<void> => {
    await apiDeleteIdea(ideaId);
    setState((s) => ({ ...s, ideas: s.ideas.filter((i) => i.id !== ideaId) }));
  }, []);

  return {
    ...state,
    createIdea: create,
    refresh,
    addUpdate,
    editIdea,
    editUpdate,
    deleteUpdate,
    deleteIdea,
  };
}
