import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateForm } from './UpdateForm.tsx';

describe('<UpdateForm>', () => {
  it('renders inline validation for an empty submission and never calls onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<UpdateForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /water/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it('rejects whitespace-only submissions', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<UpdateForm onSubmit={onSubmit} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '   \n  ' } });
    await user.click(screen.getByRole('button', { name: /water/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects 1001-char submissions with an inline error', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<UpdateForm onSubmit={onSubmit} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'a'.repeat(1001) } });
    await user.click(screen.getByRole('button', { name: /water/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the trimmed note and clears the textarea on success', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<UpdateForm onSubmit={onSubmit} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '  sketched a logo  ' } });
    await user.click(screen.getByRole('button', { name: /water/i }));
    expect(onSubmit).toHaveBeenCalledWith('sketched a logo');
    // microtask
    await Promise.resolve();
    expect(textarea.value).toBe('');
  });

  it('renders an inline error and preserves the textarea text on a rejected submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('server boom'));
    render(<UpdateForm onSubmit={onSubmit} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'a sketch' } });
    await user.click(screen.getByRole('button', { name: /water/i }));
    await screen.findByText('server boom');
    expect(textarea.value).toBe('a sketch');
  });

  it('disables the submit button while the request is in flight (no double-submit)', async () => {
    const user = userEvent.setup();
    let resolve: () => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    render(<UpdateForm onSubmit={onSubmit} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'a note' } });
    const button = screen.getByRole('button', { name: /water/i });
    await user.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    resolve();
  });
});
