import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditIdeaForm } from './EditIdeaForm.tsx';

describe('<EditIdeaForm>', () => {
  it('renders pre-filled values', () => {
    render(
      <EditIdeaForm
        initialTitle="old title"
        initialDescription="old desc"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect((screen.getByLabelText(/Title/i) as HTMLInputElement).value).toBe('old title');
    expect((screen.getByLabelText(/Description/i) as HTMLTextAreaElement).value).toBe(
      'old desc',
    );
  });

  it('blocks Save with an inline error when title is empty', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditIdeaForm
        initialTitle="something"
        initialDescription={null}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it('blocks Save on 81-char title', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditIdeaForm
        initialTitle="x"
        initialDescription={null}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'x'.repeat(81) } });
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('blocks Save on 501-char description', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditIdeaForm
        initialTitle="x"
        initialDescription={null}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'x'.repeat(501) },
    });
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Save calls onSave with trimmed title and description mapped to null when empty', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditIdeaForm
        initialTitle="  renamed  "
        initialDescription=""
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith({ title: 'renamed', description: null });
  });

  it('Cancel calls onCancel without onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <EditIdeaForm
        initialTitle="x"
        initialDescription={null}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('disables submit while saving', async () => {
    const user = userEvent.setup();
    let resolve: () => void = () => {};
    const onSave = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    render(
      <EditIdeaForm
        initialTitle="x"
        initialDescription={null}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );
    const button = screen.getByRole('button', { name: /save/i });
    await user.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    resolve();
  });
});
