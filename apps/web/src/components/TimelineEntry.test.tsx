import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IdeaUpdate } from '@idea-garden/shared';
import { TimelineEntry } from './TimelineEntry.tsx';

const NOW = 1746783402000;

const makeUpdate = (overrides: Partial<IdeaUpdate> = {}): IdeaUpdate => ({
  id: 'A'.repeat(26),
  idea_id: 'B'.repeat(26),
  note: 'Sketched the logo.',
  stage_after: 4,
  created_at: NOW,
  ...overrides,
});

describe('<TimelineEntry> (US1 scope, read-only)', () => {
  it('renders the note text', () => {
    render(<TimelineEntry update={makeUpdate()} now={NOW} />);
    expect(screen.getByText('Sketched the logo.')).toBeInTheDocument();
  });

  it('renders the note with whitespace-pre-wrap so newlines are preserved', () => {
    const multiline = 'line one\nline two';
    render(<TimelineEntry update={makeUpdate({ note: multiline })} now={NOW} />);
    const note = screen.getByText((_, el) => el?.textContent === multiline);
    expect(note.className).toMatch(/whitespace-pre-wrap/);
    expect(note.textContent).toContain('\n');
  });

  it('renders the relative timestamp', () => {
    render(<TimelineEntry update={makeUpdate({ created_at: NOW - 60_000 })} now={NOW} />);
    expect(screen.getByText('1m ago')).toBeInTheDocument();
  });

  it('renders the level badge for the entry stage_after', () => {
    render(<TimelineEntry update={makeUpdate({ stage_after: 4 })} now={NOW} />);
    expect(screen.getByText('Level 4')).toBeInTheDocument();
  });

  it('does NOT render the overflow menu when neither onEdit nor onDelete is provided (US1)', () => {
    render(<TimelineEntry update={makeUpdate()} now={NOW} />);
    expect(screen.queryByRole('button', { name: /more options/i })).toBeNull();
  });
});

describe('<TimelineEntry> (US4 scope, edit + delete)', () => {
  it('opens the inline edit form pre-filled with the existing note when Edit is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(<TimelineEntry update={makeUpdate({ note: 'original' })} now={NOW} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: /more options/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));
    const textarea = screen.getByRole('textbox', { name: /edit note/i }) as HTMLTextAreaElement;
    expect(textarea.value).toBe('original');
  });

  it('calls onEdit with the trimmed new note when Save is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(<TimelineEntry update={makeUpdate({ note: 'original' })} now={NOW} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: /more options/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));
    const textarea = screen.getByRole('textbox', { name: /edit note/i });
    fireEvent.change(textarea, { target: { value: '  updated  ' } });
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onEdit).toHaveBeenCalledWith('updated');
  });

  it('Cancel discards changes without calling onEdit', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(<TimelineEntry update={makeUpdate({ note: 'original' })} now={NOW} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: /more options/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));
    const textarea = screen.getByRole('textbox', { name: /edit note/i });
    fireEvent.change(textarea, { target: { value: 'changed but cancelled' } });
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText('original')).toBeInTheDocument();
  });

  it('blocks Save on empty / over-length notes with inline validation', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(<TimelineEntry update={makeUpdate({ note: 'original' })} now={NOW} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: /more options/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));
    const textarea = screen.getByRole('textbox', { name: /edit note/i });

    fireEvent.change(textarea, { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText(/required/i)).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'x'.repeat(1001) } });
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText(/1000 characters or fewer/i)).toBeInTheDocument();
  });

  it('calls onDelete exactly once (no confirm) when Delete is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<TimelineEntry update={makeUpdate()} now={NOW} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: /more options/i }));
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
