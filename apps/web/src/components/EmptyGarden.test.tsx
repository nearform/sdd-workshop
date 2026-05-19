import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyGarden } from './EmptyGarden.tsx';

describe('<EmptyGarden>', () => {
  it('renders the illustration, headline, body, and CTA', () => {
    render(<EmptyGarden onPlant={() => {}} />);
    expect(screen.getByRole('img', { name: /empty garden/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/garden is empty/i);
    expect(screen.getByText(/plant your first seed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plant your first seed/i })).toBeInTheDocument();
  });

  it('invokes onPlant when the CTA is clicked', async () => {
    const user = userEvent.setup();
    const onPlant = vi.fn();
    render(<EmptyGarden onPlant={onPlant} />);
    await user.click(screen.getByRole('button', { name: /plant your first seed/i }));
    expect(onPlant).toHaveBeenCalledTimes(1);
  });
});
