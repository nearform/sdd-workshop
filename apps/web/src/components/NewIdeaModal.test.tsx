import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewIdeaModal } from './NewIdeaModal.tsx';

function renderModal(overrides: Partial<React.ComponentProps<typeof NewIdeaModal>> = {}) {
  const onClose = vi.fn();
  const onCreate = vi.fn().mockResolvedValue(undefined);
  const utils = render(
    <NewIdeaModal open={true} onClose={onClose} onCreate={onCreate} {...overrides} />,
  );
  return { ...utils, onClose, onCreate };
}

describe('<NewIdeaModal>', () => {
  it('renders title and description fields when open', () => {
    renderModal();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('does not render anything when open=false', () => {
    const { container } = renderModal({ open: false });
    expect(container.firstChild).toBeNull();
  });

  it('invokes onCreate with the trimmed title on valid submit', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderModal();
    await user.type(screen.getByLabelText(/title/i), '  hello  ');
    await user.type(screen.getByLabelText(/description/i), 'hi there');
    await user.click(screen.getByRole('button', { name: /^plant$/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith({ title: 'hello', description: 'hi there' });
  });

  it('shows an inline error and does not call onCreate when title is missing', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderModal();
    await user.click(screen.getByRole('button', { name: /^plant$/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows an inline error when title exceeds 80 characters', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderModal();
    await user.type(screen.getByLabelText(/title/i), 'x'.repeat(81));
    await user.click(screen.getByRole('button', { name: /^plant$/i }));
    expect(screen.getByText(/title must be 80 characters/i)).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows an inline error when description exceeds 500 characters', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderModal();
    await user.type(screen.getByLabelText(/title/i), 'ok');
    // userEvent.type is slow on long strings; use fireEvent via paste
    await user.click(screen.getByLabelText(/description/i));
    await user.paste('x'.repeat(501));
    await user.click(screen.getByRole('button', { name: /^plant$/i }));
    expect(screen.getByText(/description must be 500 characters/i)).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('closes via Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via the X button', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via backdrop click', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the dialog body', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables the submit button while a submission is in flight', async () => {
    const user = userEvent.setup();
    let resolveCreate: (() => void) | undefined;
    const onCreate = vi.fn().mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolveCreate = r;
        }),
    );
    render(<NewIdeaModal open={true} onClose={() => {}} onCreate={onCreate} />);
    await user.type(screen.getByLabelText(/title/i), 'hello');
    await user.click(screen.getByRole('button', { name: /^plant$/i }));
    expect(screen.getByRole('button', { name: /^plant$/i })).toBeDisabled();
    // Drain the pending submission so React can flush state before teardown.
    await act(async () => {
      resolveCreate?.();
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^plant$/i })).not.toBeDisabled(),
    );
  });
});
