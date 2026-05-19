import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LevelBadge } from './LevelBadge.tsx';

describe('<LevelBadge>', () => {
  it('renders "Level 1" for stage 1', () => {
    render(<LevelBadge stage={1} />);
    expect(screen.getByText('Level 1')).toBeInTheDocument();
  });

  it('renders "Level 15" for stage 15', () => {
    render(<LevelBadge stage={15} />);
    expect(screen.getByText('Level 15')).toBeInTheDocument();
  });

  it('renders "Fully bloomed" for stage 16', () => {
    render(<LevelBadge stage={16} />);
    expect(screen.getByText('Fully bloomed')).toBeInTheDocument();
  });

  it('applies the design.md badge-stage classes consistently', () => {
    const { rerender } = render(<LevelBadge stage={3} />);
    const level = screen.getByText('Level 3');
    expect(level.className).toMatch(/rounded-full/);
    expect(level.className).toMatch(/text-caption/);

    rerender(<LevelBadge stage={16} />);
    const bloom = screen.getByText('Fully bloomed');
    expect(bloom.className).toMatch(/rounded-full/);
    expect(bloom.className).toMatch(/italic/);
  });
});
