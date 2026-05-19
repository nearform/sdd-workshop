import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyTimeline } from './EmptyTimeline.tsx';

describe('<EmptyTimeline>', () => {
  it('renders the headline copy', () => {
    render(<EmptyTimeline />);
    expect(screen.getByText('No waterings yet')).toBeInTheDocument();
  });

  it('renders the muted body copy', () => {
    render(<EmptyTimeline />);
    expect(screen.getByText('Give this idea its first drink')).toBeInTheDocument();
  });

  it('renders the placeholder illustration', () => {
    render(<EmptyTimeline />);
    const img = screen.getByRole('img', { name: /oak/i }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/plants/oak/stage-01.png');
  });
});
