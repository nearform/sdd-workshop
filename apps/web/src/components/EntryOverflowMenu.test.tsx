import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryOverflowMenu } from './EntryOverflowMenu.tsx';

describe('<EntryOverflowMenu>', () => {
  it('opens the menu on trigger click', async () => {
    const user = userEvent.setup();
    render(<EntryOverflowMenu onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.queryByRole('menu')).toBeNull();
    await user.click(screen.getByRole('button', { name: /more options/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closes the menu on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <span data-testid="outside">outside</span>
        <EntryOverflowMenu onEdit={() => {}} onDelete={() => {}} />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: /more options/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('invokes onEdit and closes when Edit is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<EntryOverflowMenu onEdit={onEdit} onDelete={() => {}} />);
    await user.click(screen.getByRole('button', { name: /more options/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('invokes onDelete and closes when Delete is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<EntryOverflowMenu onEdit={() => {}} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: /more options/i }));
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
