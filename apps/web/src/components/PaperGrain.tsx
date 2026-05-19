export function PaperGrain() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.07] mix-blend-multiply"
      width="100%"
      height="100%"
    >
      <filter id="paperGrainFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paperGrainFilter)" />
    </svg>
  );
}
