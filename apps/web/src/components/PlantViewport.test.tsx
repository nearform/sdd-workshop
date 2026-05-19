import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { PlantViewport, type PlantViewportHandle } from './PlantViewport.tsx';

// jsdom doesn't provide a WebGL context. The viewport detects this and falls
// back to a setTimeout-based stub of playGrowth that still resolves at the
// documented duration. These tests exercise that contract.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('<PlantViewport>', () => {
  it('renders the plant-viewport container', () => {
    const { getByTestId } = render(<PlantViewport species="oak" stage={1} />);
    expect(getByTestId('plant-viewport')).toBeInTheDocument();
  });

  it('exposes an imperative playGrowth that resolves after the animation duration', async () => {
    const ref = createRef<PlantViewportHandle>();
    render(<PlantViewport ref={ref} species="oak" stage={3} />);
    expect(ref.current).toBeTruthy();

    let resolved = false;
    const promise = ref.current!.playGrowth({ from: 3, to: 4, palette: 'growth' });
    promise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(2600);
    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  it('handles from === to (bloom variant) without erroring and still resolves', async () => {
    const ref = createRef<PlantViewportHandle>();
    render(<PlantViewport ref={ref} species="oak" stage={16} />);

    let resolved = false;
    const promise = ref.current!.playGrowth({ from: 16, to: 16, palette: 'bloom' });
    promise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(2600);
    await Promise.resolve();
    expect(resolved).toBe(true);
  });
});
