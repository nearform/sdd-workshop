import {
  ApiErrorSchema,
  IdeaDetailSchema,
  IdeaListSchema,
  IdeaSchema,
  IdeaWithUpdateSchema,
  NewIdeaInputSchema,
  NewUpdateInputSchema,
  UpdateIdeaInputSchema,
  type Idea,
  type IdeaDetail,
  type IdeaWithUpdate,
  type NewIdeaInput,
  type NewUpdateInput,
  type UpdateIdeaInput,
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

export async function listIdeas(): Promise<Idea[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/ideas`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    throw new ApiClientError(0, err instanceof Error ? err.message : 'Network error');
  }
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = IdeaListSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function createIdea(input: NewIdeaInput): Promise<Idea> {
  // Local validation: callers should never POST a payload the schema rejects.
  // If they do, the throw surfaces immediately as a programmer error rather
  // than a 400 round-trip.
  const payload = NewIdeaInputSchema.parse(input);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/ideas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new ApiClientError(0, err instanceof Error ? err.message : 'Network error');
  }
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = IdeaSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function getIdea(id: string): Promise<IdeaDetail> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/ideas/${id}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    throw new ApiClientError(0, err instanceof Error ? err.message : 'Network error');
  }
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = IdeaDetailSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function updateIdea(id: string, input: UpdateIdeaInput): Promise<Idea> {
  const payload = UpdateIdeaInputSchema.parse(input);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/ideas/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new ApiClientError(0, err instanceof Error ? err.message : 'Network error');
  }
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = IdeaSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function addUpdate(id: string, input: NewUpdateInput): Promise<IdeaWithUpdate> {
  const payload = NewUpdateInputSchema.parse(input);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/ideas/${id}/updates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new ApiClientError(0, err instanceof Error ? err.message : 'Network error');
  }
  if (!res.ok) throw await readError(res);
  const json = await res.json();
  const parsed = IdeaWithUpdateSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(500, 'Malformed response from server', parsed.error.flatten());
  }
  return parsed.data;
}

export async function deleteIdea(id: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/ideas/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    throw new ApiClientError(0, err instanceof Error ? err.message : 'Network error');
  }
  if (!res.ok) throw await readError(res);
}
