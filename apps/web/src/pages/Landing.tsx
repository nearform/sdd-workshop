import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroScene } from './HeroScene.tsx';
import { PaperGrain } from '../components/PaperGrain.tsx';

type SampleIdea = {
  title: string;
  description: string;
  stage: number;
  watered: string;
};

const SAMPLE_IDEAS: SampleIdea[] = [
  {
    title: 'A weekly newsletter for indie devs',
    description:
      'Short, hand-curated. No sponsors, no SEO. Just five links that made me think this week.',
    stage: 14,
    watered: '2h ago',
  },
  {
    title: 'Garden-themed productivity app',
    description:
      'Treat ideas like plants — water them daily, watch them grow. The chore becomes the reward.',
    stage: 16,
    watered: 'just now',
  },
  {
    title: 'Open-source CLI for resume building',
    description:
      'Markdown in, beautiful PDF out. Versioned. Diff-friendly. Built for engineers who hate Word.',
    stage: 9,
    watered: '1d ago',
  },
  {
    title: 'A short film about my grandfather',
    description:
      'He kept a journal for 60 years. I want to read it back to him on camera and see what he says.',
    stage: 5,
    watered: '3d ago',
  },
  {
    title: 'Run a workshop on spec-driven dev',
    description:
      'Build the same feature twice — once vibe, once spec — and let the room argue about which they trust.',
    stage: 12,
    watered: '5h ago',
  },
  {
    title: 'Learn to make sourdough',
    description: 'Starter named Doug. Day one of many.',
    stage: 2,
    watered: '6d ago',
  },
];

const GROWTH_STAGES = [
  { stage: 1, label: 'Seed', caption: 'A spark. The moment you write it down.' },
  { stage: 5, label: 'Sprout', caption: 'You came back. You added something.' },
  { stage: 10, label: 'Sapling', caption: 'It has roots now. It has a shape.' },
  { stage: 16, label: 'Bloomed', caption: 'The idea you actually built.' },
];

const MARQUEE_WORDS = [
  'a sentence',
  'a sketch',
  'a question',
  'a counter-argument',
  'a half-baked plan',
  'a song lyric',
  'a doodle',
  'a stolen quote',
  'a Tuesday afternoon',
  'a 4am voicenote',
  'a doubt',
  'a what-if',
];

function paddedStage(stage: number): string {
  return String(stage).padStart(2, '0');
}

function PlantImg({
  stage,
  className,
}: {
  stage: number;
  className?: string;
}) {
  return (
    <img
      src={`/plants/oak/stage-${paddedStage(stage)}.png`}
      alt={`Plant at stage ${stage}`}
      className={className ?? 'w-24 h-24 object-contain'}
      draggable={false}
    />
  );
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (revealed) return;
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    obs.observe(el);
    // Safety fallback: if for any reason the observer never fires for
    // an element that's well-anchored in the document, reveal it after
    // a short delay so content is never permanently hidden.
    const fallback = window.setTimeout(() => setRevealed(true), 2500);
    return () => {
      obs.disconnect();
      clearTimeout(fallback);
    };
  }, [revealed]);
  return { ref, revealed };
}

function Reveal({
  as: As = 'div',
  children,
  delay = 0,
  className,
}: {
  as?: 'div' | 'section' | 'article' | 'h2' | 'h3' | 'p' | 'span';
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, revealed } = useReveal<HTMLElement>();
  const Comp = As as React.ElementType;
  return (
    <Comp
      ref={ref as unknown as React.Ref<HTMLElement>}
      className={`reveal ${revealed ? 'reveal-in' : ''} ${className ?? ''}`}
      style={{ transitionDelay: revealed ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Comp>
  );
}

function SampleCard({ idea, index }: { idea: SampleIdea; index: number }) {
  const stageLabel = idea.stage === 16 ? 'Fully bloomed' : `Level ${idea.stage}`;
  const tilt = ((index % 3) - 1) * 0.6;
  return (
    <article
      className="bg-surface rounded-lg border border-border p-card-padding flex flex-col gap-sm w-full card-tilt"
      style={
        {
          ['--tilt' as string]: `${tilt}deg`,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-center h-28">
        <PlantImg stage={idea.stage} />
      </div>
      <h3 className="font-display text-[20px] leading-tight text-on-surface break-words">
        {idea.title}
      </h3>
      <p className="text-body-sm text-on-surface-muted line-clamp-2">{idea.description}</p>
      <div className="flex items-center justify-between mt-auto pt-sm gap-sm">
        <span className="bg-primary-soft text-primary-hover text-caption rounded-full px-sm py-[2px]">
          {stageLabel}
        </span>
        <span className="text-caption text-on-surface-muted">Watered {idea.watered}</span>
      </div>
    </article>
  );
}

function SectionNumber({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-baseline gap-md mb-lg">
      <span className="font-display text-[88px] leading-none text-primary/30 select-none">
        {n}
      </span>
      <span className="text-label-md uppercase tracking-[0.18em] text-on-surface-muted">
        {label}
      </span>
    </div>
  );
}

export function Landing() {
  // Cursor parallax for the floating preview cards in the hero
  const [par, setPar] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setPar({ x, y });
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <main className="min-h-full bg-paper text-ink relative overflow-x-hidden">
      <PaperGrain />

      {/* Floating top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-paper/70 border-b border-ink/5">
        <div className="max-w-[1280px] mx-auto px-xl py-md flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center">
              <PlantImg stage={11} className="w-7 h-7 object-contain" />
            </div>
            <span className="font-display text-[20px] tracking-tight text-ink">
              Idea Garden
            </span>
          </div>
          <Link
            to="/app"
            className="group relative inline-flex items-center gap-sm bg-ink text-paper text-label-md rounded-full pl-md pr-xs py-[6px] hover:bg-primary transition-colors"
          >
            <span>Open my garden</span>
            <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[14px] transition-transform group-hover:translate-x-[2px]">
              →
            </span>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-[120px] pb-2xl overflow-hidden min-h-[800px]">
        {/* Background canvas */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-paper via-paper to-cream" />
          {/* Sun glow behind the tree */}
          <div className="absolute top-[12%] right-[12%] w-[420px] h-[420px] rounded-full bg-amber/20 blur-[80px]" />
          {/* Tree canvas — pinned to the right half of the hero */}
          <div className="absolute right-[-4%] top-[60px] w-[58%] h-[760px] z-0">
            <HeroScene />
          </div>
          {/* Soft fade at the left so headline reads on white-ish bg even if a leaf bleeds in */}
          <div className="absolute inset-y-0 left-0 w-[55%] bg-gradient-to-r from-paper via-paper/95 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1280px] mx-auto px-xl">
          <div className="inline-block max-w-[720px] rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.12)] p-xl">
            <Reveal>
              <span className="inline-flex items-center gap-xs text-label-md uppercase tracking-[0.2em] text-on-surface-muted">
                <span className="w-6 h-px bg-on-surface-muted" /> A garden, for ideas
              </span>
            </Reveal>

            <Reveal delay={120}>
              <h1 className="font-display text-[clamp(40px,5.2vw,76px)] leading-[1.0] tracking-[-0.02em] mt-md max-w-[680px]">
                Plant the
                <br />
                <span className="italic font-light whitespace-nowrap">half-formed thought.</span>
                <br />
                Grow the&nbsp;<span className="text-primary">whole idea.</span>
              </h1>
            </Reveal>

            <Reveal delay={260}>
              <div className="mt-xl max-w-[560px]">
                <p className="text-[18px] leading-[1.65] text-ink/70">
                  Idea Garden is a tiny, single-user app that turns capturing ideas into
                  <em> tending a garden.</em> Every idea is a seed. The more you come back to it —
                  refine it, add notes, argue with yourself — the more it grows. Neglect wilts.
                  Care blooms.
                </p>
                <div className="flex items-center gap-sm mt-lg flex-wrap">
                  <Link
                    to="/app"
                    className="bg-primary text-white text-label-md rounded-full px-lg py-md hover:bg-primary-hover transition-colors"
                  >
                    Plant a seed →
                  </Link>
                  <a
                    href="#how"
                    className="text-label-md text-ink/70 hover:text-ink underline-offset-4 hover:underline"
                  >
                    Watch it grow
                  </a>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Floating preview cards — sit at the bottom-right, near the tree */}
          <div className="hidden lg:block pointer-events-none">
            <div
              className="absolute right-[7%] bottom-[14%] w-[220px] z-20 bg-surface rounded-lg border border-ink/10 shadow-xl p-md pointer-events-auto"
              style={{
                transform: `translate3d(${par.x * 14}px, ${par.y * -10}px, 0) rotate(-5deg)`,
                transition: 'transform 200ms',
              }}
            >
              <div className="flex items-center justify-center h-16">
                <PlantImg stage={16} className="w-16 h-16 object-contain" />
              </div>
              <p className="font-display text-[16px] mt-sm leading-tight">Garden-themed app</p>
              <span className="bg-primary-soft text-primary-hover text-caption rounded-full px-sm py-[2px] mt-sm inline-block">
                Fully bloomed
              </span>
            </div>
            <div
              className="absolute right-[33%] bottom-[6%] w-[200px] z-20 bg-surface rounded-lg border border-ink/10 shadow-lg p-md pointer-events-auto"
              style={{
                transform: `translate3d(${par.x * -10}px, ${par.y * 12}px, 0) rotate(3deg)`,
                transition: 'transform 200ms',
              }}
            >
              <div className="flex items-center justify-center h-16">
                <PlantImg stage={4} className="w-16 h-16 object-contain" />
              </div>
              <p className="font-display text-[16px] mt-sm leading-tight">Indie newsletter</p>
              <span className="bg-primary-soft text-primary-hover text-caption rounded-full px-sm py-[2px] mt-sm inline-block">
                Level 4
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-ink/10 bg-cream py-md overflow-hidden relative">
        <div className="marquee whitespace-nowrap font-display text-[44px] tracking-[-0.02em] text-ink/85 flex">
          <div className="marquee-track flex gap-xl pr-xl">
            {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((w, i) => (
              <span key={i} className="flex items-center gap-xl">
                <span className="italic">{w}</span>
                <span className="text-primary">✿</span>
              </span>
            ))}
          </div>
          <div className="marquee-track flex gap-xl pr-xl" aria-hidden>
            {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((w, i) => (
              <span key={`b${i}`} className="flex items-center gap-xl">
                <span className="italic">{w}</span>
                <span className="text-primary">✿</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-xl">
        {/* MANIFESTO */}
        <section className="py-2xl grid md:grid-cols-12 gap-xl items-start">
          <div className="md:col-span-5">
            <SectionNumber n="01" label="The metaphor" />
          </div>
          <div className="md:col-span-7">
            <Reveal>
              <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-[-0.02em]">
                Most ideas die not because they were bad,
                <span className="italic text-primary"> but because nobody came back to them.</span>
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-[17px] leading-[1.7] text-ink/70 mt-lg max-w-xl">
                They get scribbled into a Notes app, buried under groceries and meeting agendas,
                and quietly forgotten. The Idea Garden gives every idea a body. A seed at first.
                A sprout once you revisit it. A sapling when you start shaping it. And — if you
                keep watering it — a fully bloomed plant that you can be proud of.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <p className="text-[17px] leading-[1.7] text-ink/70 mt-md max-w-xl">
                The act of tending becomes its own reward. The chore, somewhere along the way,
                turns into a habit you actually look forward to.
              </p>
            </Reveal>
          </div>
        </section>

        {/* GROWTH STAGES */}
        <section className="py-2xl">
          <div className="grid md:grid-cols-12 gap-xl items-end mb-xl">
            <div className="md:col-span-5">
              <SectionNumber n="02" label="The growth loop" />
              <Reveal>
                <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-[-0.02em]">
                  From <span className="italic">seed</span> to <span className="text-primary">bloom</span>, in sixteen quiet stages.
                </h2>
              </Reveal>
            </div>
            <div className="md:col-span-6 md:col-start-7">
              <Reveal>
                <p className="text-[16px] leading-[1.7] text-ink/70 max-w-md">
                  Every time you add an update — a thought, a sketch, a counter-argument — your
                  plant advances one stage. Long enough to feel earned. Short enough to feel
                  possible.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {GROWTH_STAGES.map((s, i) => (
              <Reveal key={s.stage} delay={i * 80}>
                <div className="bg-surface rounded-lg border border-ink/10 p-md flex flex-col items-center text-center group hover:border-primary transition-colors">
                  <div className="h-32 flex items-center justify-center stage-float">
                    <PlantImg stage={s.stage} className="w-28 h-28 object-contain" />
                  </div>
                  <span className="font-display text-[14px] tracking-[0.2em] uppercase text-on-surface-muted mt-sm">
                    Stage {paddedStage(s.stage)}
                  </span>
                  <h3 className="font-display text-[24px] mt-xs leading-tight">{s.label}</h3>
                  <p className="text-body-sm text-on-surface-muted mt-xs">{s.caption}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* GARDEN AT A GLANCE */}
        <section className="py-2xl">
          <div className="grid md:grid-cols-12 gap-xl items-end mb-xl">
            <div className="md:col-span-7">
              <SectionNumber n="03" label="Your garden, at a glance" />
              <Reveal>
                <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-[-0.02em]">
                  One page. <span className="italic">Every idea.</span>
                  <br /> Every stage.
                </h2>
              </Reveal>
            </div>
            <div className="md:col-span-5">
              <Reveal>
                <p className="text-[16px] leading-[1.7] text-ink/70">
                  This is what your garden could look like a few weeks in. Each card is one
                  idea. The plant tells you the stage. The timestamp tells you whether it's
                  thriving or thirsty. No tags. No folders. No projects-inside-projects.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-grid-gutter">
            {SAMPLE_IDEAS.map((idea, i) => (
              <Reveal key={idea.title} delay={i * 60}>
                <SampleCard idea={idea} index={i} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-2xl scroll-mt-xl">
          <SectionNumber n="04" label="How it works" />
          <Reveal>
            <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-[-0.02em] mb-xl">
              Plant. <span className="italic">Water.</span> <span className="text-primary">Bloom.</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-md">
            {[
              {
                step: '01',
                title: 'Plant a seed',
                body: 'Click "Plant New Seed", give it a title, and — optionally — a sentence or two. The idea is now alive in your garden as a tiny seed.',
              },
              {
                step: '02',
                title: 'Water it',
                body: 'Open the idea. Add an update — a new angle, a question, a link, a sketch. Each watering advances the plant one growth stage and keeps it from wilting.',
              },
              {
                step: '03',
                title: 'Watch it bloom',
                body: 'Stage 16 is fully bloomed. By then you have a rich timeline of how the thought evolved — and a plant you can be a little proud of.',
              },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 100}>
                <div className="bg-surface rounded-lg border border-ink/10 p-lg flex flex-col h-full hover:border-primary transition-colors">
                  <span className="font-display italic text-[64px] leading-none text-primary/40">
                    {s.step}
                  </span>
                  <h3 className="font-display text-[28px] mt-md leading-tight">{s.title}</h3>
                  <p className="text-[15px] leading-[1.65] text-ink/70 mt-sm">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* WHY */}
        <section className="py-2xl">
          <SectionNumber n="05" label="Why a garden" />
          <Reveal>
            <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-[-0.02em] mb-xl max-w-4xl">
              Notes apps reward writing.
              <br />
              <span className="italic text-primary">Gardens reward returning.</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-md">
            {[
              {
                title: 'Visible momentum',
                body: 'You can see, at a glance, which ideas are alive. A grid of plants is a status report your future self will actually read.',
              },
              {
                title: 'A reason to come back',
                body: 'A plant only grows when you tend it. The metaphor turns "review my notes" — a chore — into something you actually want to do.',
              },
              {
                title: 'Honesty about neglect',
                body: 'A withering plant is hard to ignore. The garden tells you, kindly, which ideas you have been pretending to care about.',
              },
              {
                title: 'A timeline, for free',
                body: 'Each watering is an entry. By stage 16, every idea carries its own history — how it started, how it changed, what it became.',
              },
              {
                title: 'No ceremony',
                body: 'No tags. No folders. No projects. The cost of capturing a thought is one click and one sentence. The garden does the organising.',
              },
              {
                title: 'A small dopamine reward',
                body: 'Watering an idea plays a tiny growth animation. It is silly. It is also, demonstrably, a reason to open the app tomorrow.',
              },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 60}>
                <div className="bg-surface rounded-lg border border-ink/10 p-lg h-full">
                  <h3 className="font-display text-[22px] leading-tight">{card.title}</h3>
                  <p className="text-[15px] leading-[1.65] text-ink/70 mt-sm">{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* RITUAL */}
        <section className="py-2xl">
          <Reveal>
            <div className="bg-ink text-paper rounded-xl p-2xl md:p-[64px] grid md:grid-cols-[1fr_auto] gap-xl items-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-[260px] h-[260px] rounded-full bg-primary/30 blur-[60px]" />
              <div className="relative">
                <SectionNumber n="06" label="The ritual" />
                <h2 className="font-display text-[clamp(32px,4vw,52px)] leading-[1.05] tracking-[-0.02em]">
                  Five minutes a day.
                  <br />
                  <span className="italic text-primary-soft">That is the whole pitch.</span>
                </h2>
                <p className="text-[16px] leading-[1.7] text-paper/80 mt-md max-w-xl">
                  Open Idea Garden with your morning coffee. Pick the plant that looks
                  thirstiest. Add one sentence — a question, a doubt, a link, anything. Watch it
                  grow one stage. Close the tab. Two weeks of that and your garden is in motion.
                  Two months and you have at least one idea in full bloom.
                </p>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 m-auto w-44 h-44 rounded-full bg-primary/30 blur-[40px]" />
                <PlantImg stage={16} className="relative w-48 h-48 object-contain" />
              </div>
            </div>
          </Reveal>
        </section>

        {/* FINAL CTA */}
        <section className="py-2xl text-center">
          <Reveal>
            <h2 className="font-display text-[clamp(40px,7vw,96px)] leading-[0.95] tracking-[-0.02em] max-w-4xl mx-auto">
              Your garden is empty.
              <br />
              <span className="italic text-primary">That is the most exciting thing about it.</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-[17px] leading-[1.7] text-ink/70 max-w-xl mx-auto mt-lg">
              Plant the first seed. It takes ten seconds and a single sentence. The rest is just
              showing up.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <Link
              to="/app"
              className="inline-flex items-center gap-sm bg-primary text-white text-label-md rounded-full pl-lg pr-xs py-[8px] hover:bg-primary-hover transition-colors mt-xl group"
            >
              <span>Plant your first seed</span>
              <span className="w-9 h-9 rounded-full bg-white text-primary flex items-center justify-center text-[16px] transition-transform group-hover:translate-x-[3px]">
                →
              </span>
            </Link>
          </Reveal>
        </section>

        <footer className="border-t border-ink/10 py-lg flex items-center justify-between text-caption text-on-surface-muted">
          <span>Idea Garden — a small CRUD app dressed up as a garden.</span>
          <span className="italic font-display text-[14px]">tend something today.</span>
        </footer>
      </div>
    </main>
  );
}

