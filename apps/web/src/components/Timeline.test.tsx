import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { IdeaUpdate } from '@idea-garden/shared';
import { Timeline } from './Timeline.tsx';

const NOW = 1746783402000;

const update = (overrides: Partial<IdeaUpdate>): IdeaUpdate => ({
  id: 'A'.repeat(26),
  idea_id: 'B'.repeat(26),
  note: 'a note',
  stage_after: 2,
  created_at: NOW,
  ...overrides,
});

describe('<Timeline>', () => {
  it('renders the EmptyTimeline empty state when updates is empty', () => {
    render(<Timeline updates={[]} now={NOW} />);
    expect(screen.getByText('No waterings yet')).toBeInTheDocument();
  });

  it('renders one TimelineEntry per update in the given order', () => {
    const updates = [
      update({ id: 'A'.repeat(26), note: 'third' }),
      update({ id: 'B'.repeat(26), note: 'second' }),
      update({ id: 'C'.repeat(26), note: 'first' }),
    ];
    render(<Timeline updates={updates} now={NOW} />);
    const notes = screen.getAllByText(/^(first|second|third)$/);
    expect(notes.map((n) => n.textContent)).toEqual(['third', 'second', 'first']);
  });
});
