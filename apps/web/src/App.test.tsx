import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Idea } from '@idea-garden/shared';
import { App } from './App.tsx';

const ULID = 'A'.repeat(26);

const buildIdea = (overrides: Partial<Idea> = {}): Idea => ({
  id: ULID,
  title: 'Build an idea garden',
  description: null,
  species: 'oak',
  stage: 1,
  created_at: Date.now(),
  updated_at: Date.now(),
  ...overrides,
});

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

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

describe('<App> — empty state and creation flow', () => {
  it('renders the empty state when the GET returns []', async () => {
    mockFetch(async () => okJson(200, []));
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /garden is empty/i })).toBeInTheDocument(),
    );
  });

  it('opens the modal when the header "Plant New Seed" button is clicked', async () => {
    mockFetch(async () => okJson(200, []));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => screen.getByRole('heading', { name: /garden is empty/i }));
    await user.click(screen.getByRole('button', { name: /plant new seed/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('prepends a card to the grid on a valid submit and closes the modal', async () => {
    const created = buildIdea({ title: 'New idea', description: 'desc' });
    mockFetch(async (url, init) => {
      if (init?.method === 'POST' && url.endsWith('/api/ideas')) {
        return okJson(201, created);
      }
      return okJson(200, []);
    });

    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => screen.getByRole('heading', { name: /garden is empty/i }));
    await user.click(screen.getByRole('button', { name: /plant new seed/i }));

    await user.type(screen.getByLabelText(/title/i), 'New idea');
    await user.type(screen.getByLabelText(/description/i), 'desc');
    await user.click(screen.getByRole('button', { name: /^plant$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /new idea/i })).toBeInTheDocument();
  });
});

describe('<App> — error surfaces', () => {
  it('shows an error banner when the initial GET fails (no false empty state)', async () => {
    mockFetch(async () => okJson(500, { error: 'internal_error' }));
    render(<App />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /garden is empty/i })).not.toBeInTheDocument();
  });

  it('keeps the modal open and surfaces the error when POST returns 400', async () => {
    mockFetch(async (url, init) => {
      if (init?.method === 'POST' && url.endsWith('/api/ideas')) {
        return okJson(400, {
          error: 'validation',
          details: [{ path: ['title'], message: 'Title is required' }],
        });
      }
      return okJson(200, []);
    });

    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => screen.getByRole('heading', { name: /garden is empty/i }));
    await user.click(screen.getByRole('button', { name: /plant new seed/i }));
    // Provide a *locally valid* title so the modal sends the request and the
    // server-side rejection (mocked here) drives the form-area error path.
    await user.type(screen.getByLabelText(/title/i), 'an idea');
    await user.click(screen.getByRole('button', { name: /^plant$/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe('an idea');
  });
});
