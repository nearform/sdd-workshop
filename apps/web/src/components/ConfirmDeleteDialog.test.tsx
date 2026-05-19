import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog.tsx';

describe('<ConfirmDeleteDialog>', () => {
  it('renders nothing when open is false', () => {
    render(
      <ConfirmDeleteDialog open={false} ideaTitle="X" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the dialog when open is true', () => {
    render(
      <ConfirmDeleteDialog open ideaTitle="My Idea" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Delete "My Idea"\?/)).toBeInTheDocument();
  });

  it('clicking Cancel calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDeleteDialog open ideaTitle="X" onConfirm={vi.fn()} onCancel={onCancel} />,
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('clicking the destructive button calls onConfirm and disables both buttons', async () => {
    const user = userEvent.setup();
    let resolve: () => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    render(
      <ConfirmDeleteDialog open ideaTitle="X" onConfirm={onConfirm} onCancel={vi.fn()} />,
    );
    const confirmBtn = screen.getByRole('button', { name: /yes, delete forever/i });
    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: /cancel/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
    resolve();
  });

  it('Escape calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDeleteDialog open ideaTitle="X" onConfirm={vi.fn()} onCancel={onCancel} />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('backdrop click calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDeleteDialog open ideaTitle="X" onConfirm={vi.fn()} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByTestId('confirm-delete-backdrop'));
    expect(onCancel).toHaveBeenCalled();
  });
});
