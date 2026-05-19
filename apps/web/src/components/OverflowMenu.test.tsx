import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverflowMenu } from './OverflowMenu.tsx';

describe('<OverflowMenu>', () => {
  it('renders the (⋮) trigger', () => {
    render(<OverflowMenu items={[{ label: 'Foo', onSelect: () => {} }]} />);
    expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument();
  });

  it('opens on click and renders each item with the right label and styling', async () => {
    const user = userEvent.setup();
    render(
      <OverflowMenu
        items={[
          { label: 'Edit', onSelect: () => {} },
          { label: 'Delete', onSelect: () => {}, destructive: true },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /more options/i }));
    const edit = screen.getByRole('menuitem', { name: /edit/i });
    const del = screen.getByRole('menuitem', { name: /delete/i });
    expect(edit.className).toMatch(/text-on-surface/);
    expect(del.className).toMatch(/text-error/);
  });

  it('invokes onSelect and closes the menu', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<OverflowMenu items={[{ label: 'Do it', onSelect }]} />);
    await user.click(screen.getByRole('button', { name: /more options/i }));
    await user.click(screen.getByRole('menuitem', { name: /do it/i }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <span data-testid="outside">outside</span>
        <OverflowMenu items={[{ label: 'x', onSelect: () => {} }]} />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: /more options/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<OverflowMenu items={[{ label: 'x', onSelect: () => {} }]} />);
    await user.click(screen.getByRole('button', { name: /more options/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
