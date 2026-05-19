import { useEffect, useState } from 'react';
import type { Idea, IdeaUpdate } from '@idea-garden/shared';
import { ApiClientError, getIdea } from '../api/ideas.ts';

export type UseIdeaDetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; idea: Idea; updates: IdeaUpdate[] }
  | { status: 'not_found' }
  | { status: 'error'; error: string };

export function useIdeaDetail(ideaId: string | null): UseIdeaDetailState {
  const [state, setState] = useState<UseIdeaDetailState>({ status: 'idle' });

  useEffect(() => {
    if (ideaId == null) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    getIdea(ideaId)
      .then((res) => {
        if (cancelled) return;
        setState({ status: 'ready', idea: res.idea, updates: res.updates });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (
          err instanceof ApiClientError &&
          (err.status === 404 || err.message === 'idea_not_found')
        ) {
          setState({ status: 'not_found' });
          return;
        }
        setState({
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to load idea',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [ideaId]);

  return state;
}
