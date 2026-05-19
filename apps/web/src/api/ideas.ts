import {
  ApiErrorSchema,
  EditIdeaInputSchema,
  EditIdeaUpdateInputSchema,
  IdeaDetailResponseSchema,
  IdeaListSchema,
  IdeaSchema,
  MutationResponseSchema,
  NewIdeaInputSchema,
  NewIdeaUpdateInputSchema,
  type EditIdeaInput,
  type EditIdeaUpdateInput,
  type Idea,
  type IdeaDetailResponse,
  type MutationResponse,
  type NewIdeaInput,
  type NewIdeaUpdateInput,
} from '@idea-garden/shared';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

async function readError(res: Response): Promise<ApiClientError> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return new ApiClientError(res.status, `Server returned ${res.status}`);
  }
  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    return new ApiClientError(res.status, parsed.data.error, parsed.data.details);
  }
  return new ApiClientError(res.status, `Server returned ${res.status}`);
}

async function doFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    throw new ApiClientError(0, err instanceof Error ? err.message : 'Network error');
  }
}

export async function listIdeas(): Promise<Idea[]> {
  const res = await doFetch(`${API_BASE_URL}/api/ideas`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = IdeaListSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function createIdea(input: NewIdeaInput): Promise<Idea> {
  const payload = NewIdeaInputSchema.parse(input);
  const res = await doFetch(`${API_BASE_URL}/api/ideas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = IdeaSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function getIdea(id: string): Promise<IdeaDetailResponse> {
  const res = await doFetch(`${API_BASE_URL}/api/ideas/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = IdeaDetailResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function patchIdea(id: string, input: EditIdeaInput): Promise<MutationResponse> {
  const payload = EditIdeaInputSchema.parse(input);
  const res = await doFetch(`${API_BASE_URL}/api/ideas/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = MutationResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function deleteIdea(id: string): Promise<void> {
  const res = await doFetch(`${API_BASE_URL}/api/ideas/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  // 404 is success-equivalent here — the idea is already gone.
  if (res.ok || res.status === 404) return;
  throw await readError(res);
}

export async function addUpdate(
  ideaId: string,
  input: NewIdeaUpdateInput,
): Promise<MutationResponse> {
  const payload = NewIdeaUpdateInputSchema.parse(input);
  const res = await doFetch(
    `${API_BASE_URL}/api/ideas/${encodeURIComponent(ideaId)}/updates`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = MutationResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function patchUpdate(
  ideaId: string,
  updateId: string,
  input: EditIdeaUpdateInput,
): Promise<MutationResponse> {
  const payload = EditIdeaUpdateInputSchema.parse(input);
  const res = await doFetch(
    `${API_BASE_URL}/api/ideas/${encodeURIComponent(ideaId)}/updates/${encodeURIComponent(updateId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = MutationResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function deleteUpdate(
  ideaId: string,
  updateId: string,
): Promise<MutationResponse> {
  const res = await doFetch(
    `${API_BASE_URL}/api/ideas/${encodeURIComponent(ideaId)}/updates/${encodeURIComponent(updateId)}`,
    {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    },
  );
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = MutationResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}
