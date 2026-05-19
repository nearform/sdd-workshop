type LeafConfig = {
  left: string;
  delay: string;
  duration: string;
  color: string;
  opacity: number;
  size: number;
  flip?: boolean;
};

const LEAVES: LeafConfig[] = [
  { left: '6%', delay: '0s', duration: '26s', color: '#4F8C3A', opacity: 0.32, size: 22 },
  { left: '17%', delay: '-7s', duration: '32s', color: '#8C6A3F', opacity: 0.26, size: 18, flip: true },
  { left: '31%', delay: '-16s', duration: '24s', color: '#4F8C3A', opacity: 0.3, size: 16 },
  { left: '48%', delay: '-3s', duration: '34s', color: '#C97B3F', opacity: 0.22, size: 24, flip: true },
  { left: '63%', delay: '-19s', duration: '28s', color: '#4F8C3A', opacity: 0.3, size: 20 },
  { left: '78%', delay: '-11s', duration: '23s', color: '#8C6A3F', opacity: 0.28, size: 18, flip: true },
  { left: '91%', delay: '-25s', duration: '36s', color: '#4F8C3A', opacity: 0.26, size: 26 },
];

function Leaf({ left, delay, duration, color, opacity, size, flip }: LeafConfig) {
  const height = (size / 24) * 32;
  return (
    <svg
      className="leaf-drift"
      width={size}
      height={height}
      viewBox="0 0 24 32"
      style={
        {
          left,
          ['--leaf-delay' as string]: delay,
          ['--leaf-duration' as string]: duration,
          ['--leaf-opacity' as string]: opacity,
          ['--leaf-color' as string]: color,
          opacity,
          transform: flip ? 'scaleX(-1)' : undefined,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <path
        d="M12 1 C 2 8, 2 22, 12 31 C 22 22, 22 8, 12 1 Z"
        fill="currentColor"
      />
      <path
        d="M12 3 L 12 29"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="0.5"
        fill="none"
      />
      <path
        d="M12 10 L 8 14 M12 14 L 16 18 M12 18 L 8 22 M12 22 L 16 26"
        stroke="rgba(0,0,0,0.14)"
        strokeWidth="0.4"
        fill="none"
      />
    </svg>
  );
}

export function LeavesLayer() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
    >
      {LEAVES.map((leaf, i) => (
        <Leaf key={i} {...leaf} />
      ))}
    </div>
  );
}
