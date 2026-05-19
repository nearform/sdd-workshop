import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Idea } from '@idea-garden/shared';
import { IdeaCard } from './IdeaCard.tsx';

const NOW = 1746783402000;

const makeIdea = (overrides: Partial<Idea> = {}): Idea => ({
  id: '01J9YX0G6Q1A8C5XKHQ2N3R7VB',
  title: 'Build an idea garden',
  description: 'A playful CRUD app dressed up as a garden.',
  species: 'oak',
  stage: 1,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

describe('<IdeaCard>', () => {
  it('renders the full title', () => {
    render(<IdeaCard idea={makeIdea()} now={NOW} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Build an idea garden');
  });

  it('renders the description with line-clamp class', () => {
    render(<IdeaCard idea={makeIdea()} now={NOW} />);
    const desc = screen.getByText(/playful CRUD app/i);
    expect(desc.className).toMatch(/line-clamp-2/);
  });

  it('omits the description block when description is null', () => {
    render(<IdeaCard idea={makeIdea({ description: null })} now={NOW} />);
    expect(screen.queryByText(/playful CRUD app/i)).not.toBeInTheDocument();
  });

  it('renders a Level 1 stage badge', () => {
    render(<IdeaCard idea={makeIdea()} now={NOW} />);
    expect(screen.getByText('Level 1')).toBeInTheDocument();
  });

  it('renders a "just now" caption when created at the reference time', () => {
    render(<IdeaCard idea={makeIdea()} now={NOW} />);
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it('renders the PlantImage with the correct src and alt for the species', () => {
    render(<IdeaCard idea={makeIdea()} now={NOW} />);
    const img = screen.getByRole('img', { name: /oak/i }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/plants/oak/stage-01.png');
  });

  it('renders <script> and emoji in the title as plain text (no HTML injection)', () => {
    const tricky = '🌱 idea <script>alert(1)</script>';
    render(<IdeaCard idea={makeIdea({ title: tricky })} now={NOW} />);
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toBe(tricky);
    // The literal characters are present in textContent and no <script> child was created.
    expect(heading.querySelector('script')).toBeNull();
  });
});
