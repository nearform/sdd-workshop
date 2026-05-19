import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Idea } from '@idea-garden/shared';
import { Garden } from './Garden.tsx';

const NOW = 1746783402000;

const makeIdea = (overrides: Partial<Idea> = {}): Idea => ({
  id: '01J9YX0G6Q1A8C5XKHQ2N3R7VB',
  title: 'Build an idea garden',
  description: 'A playful CRUD app.',
  species: 'oak',
  stage: 1,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

describe('<Garden>', () => {
  it('shows the error state when status is error', () => {
    render(
      <Garden
        status="error"
        ideas={[]}
        error="Network failed"
        onPlant={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Network failed/)).toBeInTheDocument();
  });

  it('shows the loading state when status is loading', () => {
    render(<Garden status="loading" ideas={[]} onPlant={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the empty garden when ready with no ideas', () => {
    render(<Garden status="ready" ideas={[]} onPlant={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByRole('button', { name: /plant your first seed/i })).toBeInTheDocument();
  });

  it('renders an IdeaCard per idea and routes onOpen', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <Garden
        status="ready"
        ideas={[makeIdea()]}
        onPlant={vi.fn()}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Build an idea garden' })).toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith('01J9YX0G6Q1A8C5XKHQ2N3R7VB');
  });
});
