import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { Species } from '@idea-garden/shared';
import { PlantImage } from './PlantImage.tsx';

export type GrowthPalette = 'growth' | 'bloom';

export type PlayGrowthArgs = {
  from: number;
  to: number;
  palette: GrowthPalette;
};

export type PlantViewportHandle = {
  playGrowth: (args: PlayGrowthArgs) => Promise<void>;
};

type PlantViewportProps = {
  species: Species;
  stage: number;
  className?: string;
};

const ANIMATION_DURATION_MS = 2400;
const PARTICLE_COUNT = 720;
const RING_COUNT = 3;

// Phase envelopes as fractions of total duration.
const PHASE = {
  // Core orb pulses bright. Bell shape with peak around 38%.
  coreStart: 0.05,
  coreEnd: 0.7,
  // Particle burst sustained, slightly later peak.
  partStart: 0.1,
  partEnd: 0.95,
  // Rings start staggered.
  ringFirstStart: 0.15,
  ringStagger: 0.12,
  ringDuration: 0.5,
  // From-PNG fade out
  fromFadeStart: 0.28,
  fromFadeEnd: 0.6,
  // To-PNG fade in
  toFadeStart: 0.62,
  toFadeEnd: 0.95,
};

function smoothStep01(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function bell(edge0: number, edge1: number, x: number): number {
  if (x <= edge0 || x >= edge1) return 0;
  const t = (x - edge0) / (edge1 - edge0);
  return Math.sin(t * Math.PI);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function makeRadialTexture(stops: Array<[number, string]>): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (const [stop, color] of stops) grad.addColorStop(stop, color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeParticleSystem(palette: GrowthPalette): {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  setPalette: (palette: GrowthPalette) => void;
} {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const aAngle = new Float32Array(PARTICLE_COUNT);
  const aTilt = new Float32Array(PARTICLE_COUNT);
  const aSpeed = new Float32Array(PARTICLE_COUNT);
  const aLifespan = new Float32Array(PARTICLE_COUNT);
  const aOffset = new Float32Array(PARTICLE_COUNT);
  const aSize = new Float32Array(PARTICLE_COUNT);
  const aColorMix = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    aAngle[i] = Math.random() * Math.PI * 2;
    aTilt[i] = (Math.random() - 0.35) * 1.4; // bias slightly upward
    aSpeed[i] = 1.6 + Math.random() * 4.2;
    aLifespan[i] = 0.55 + Math.random() * 1.05;
    aOffset[i] = Math.random() * 0.25;
    aSize[i] = 0.04 + Math.random() * 0.14;
    aColorMix[i] = Math.random();
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('aAngle', new THREE.BufferAttribute(aAngle, 1));
  geom.setAttribute('aTilt', new THREE.BufferAttribute(aTilt, 1));
  geom.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
  geom.setAttribute('aLifespan', new THREE.BufferAttribute(aLifespan, 1));
  geom.setAttribute('aOffset', new THREE.BufferAttribute(aOffset, 1));
  geom.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  geom.setAttribute('aColorMix', new THREE.BufferAttribute(aColorMix, 1));

  const tex = makeRadialTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.18, 'rgba(255,255,240,0.95)'],
    [0.45, 'rgba(255,225,150,0.55)'],
    [1, 'rgba(255,200,100,0)'],
  ]);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: -1 },
      uIntensity: { value: 0 },
      uTex: { value: tex },
      uColorA: { value: new THREE.Color('#FFE08A') }, // gold
      uColorB: { value: new THREE.Color('#FFB347') }, // warm orange
      uColorC: { value: new THREE.Color('#FFFFFF') }, // hot white core
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aAngle;
      attribute float aTilt;
      attribute float aSpeed;
      attribute float aLifespan;
      attribute float aOffset;
      attribute float aSize;
      attribute float aColorMix;
      uniform float uTime;
      uniform float uIntensity;
      varying float vAlpha;
      varying float vColorMix;
      void main() {
        float age = uTime - aOffset;
        if (age < 0.0 || uIntensity <= 0.001) {
          gl_PointSize = 0.0;
          gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
          vAlpha = 0.0;
          vColorMix = aColorMix;
          return;
        }
        float t = mod(age, aLifespan) / aLifespan;
        // Ease-out radial expansion.
        float dist = (1.0 - pow(1.0 - t, 3.0)) * aSpeed;
        vec3 dir = vec3(cos(aAngle) * cos(aTilt), sin(aTilt), sin(aAngle) * cos(aTilt));
        // Subtle gravity: pull slightly downward over life.
        dir.y -= 0.18 * t;
        vec3 p = position + dir * dist;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * 700.0 * (0.4 + uIntensity * 0.9) / -mv.z;
        // Alpha fades over life and scales with global intensity.
        vAlpha = pow(1.0 - t, 1.8) * uIntensity;
        vColorMix = aColorMix;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      varying float vAlpha;
      varying float vColorMix;
      void main() {
        vec4 t = texture2D(uTex, gl_PointCoord);
        vec3 base = mix(uColorA, uColorB, vColorMix);
        vec3 col = mix(base, uColorC, 0.35) * (1.6 + vAlpha * 1.8);
        gl_FragColor = vec4(col, t.a * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geom, material);
  points.frustumCulled = false;

  const setPalette = (p: GrowthPalette) => {
    if (p === 'bloom') {
      material.uniforms.uColorA!.value.set('#FFC857'); // brighter gold
      material.uniforms.uColorB!.value.set('#FF8A1F'); // hotter orange
    } else {
      material.uniforms.uColorA!.value.set('#FFE08A');
      material.uniforms.uColorB!.value.set('#FFB347');
    }
  };

  return { points, material, setPalette };
}

function makeCoreOrb(): {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
} {
  const tex = makeRadialTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.12, 'rgba(255,255,250,0.95)'],
    [0.32, 'rgba(255,225,150,0.7)'],
    [0.6, 'rgba(255,170,70,0.25)'],
    [1, 'rgba(255,140,40,0)'],
  ]);
  const material = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0, 0, 0);
  return { sprite, material };
}

function makeRing(color: string): {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
} {
  const geom = new THREE.RingGeometry(0.92, 1.0, 96);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        // soften the inner/outer edge of the ring
        float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float soft = pow(edge, 2.5);
        gl_FragColor = vec4(uColor * 2.2, soft * uOpacity);
      }
    `,
  });
  const mesh = new THREE.Mesh(geom, material);
  mesh.scale.set(0.01, 0.01, 1);
  return { mesh, material };
}

export const PlantViewport = forwardRef<PlantViewportHandle, PlantViewportProps>(
  function PlantViewport({ species, stage, className }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const handleRef = useRef<PlantViewportHandle | null>(null);
    const fromStageRef = useRef<number>(stage);
    const toStageRef = useRef<number>(stage);

    // PNG layer state.
    const [displayStage, setDisplayStage] = useState(stage);
    const [outgoingStage, setOutgoingStage] = useState<number | null>(null);
    const [fromOpacity, setFromOpacity] = useState(0);
    const [toOpacity, setToOpacity] = useState(1);

    useEffect(() => {
      setDisplayStage(stage);
    }, [stage]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      let hasWebGL = false;
      try {
        const probeCanvas = document.createElement('canvas');
        hasWebGL =
          !!probeCanvas.getContext('webgl2') || !!probeCanvas.getContext('webgl');
      } catch {
        hasWebGL = false;
      }
      if (!hasWebGL) {
        handleRef.current = {
          playGrowth: () =>
            new Promise<void>((resolve) =>
              window.setTimeout(resolve, ANIMATION_DURATION_MS),
            ),
        };
        return;
      }

      const width = container.clientWidth || 320;
      const height = container.clientHeight || 320;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, 0, 6);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // Bloom blooms HDR-ish values. Disable tone mapping so the
      // bright shader outputs don't get crushed back to LDR before bloom samples.
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.pointerEvents = 'none';
      // UnrealBloomPass composites with alpha=1, so the canvas would
      // paint solid black over the PNG at rest. Hide it until the
      // animation starts and reveal it on demand.
      renderer.domElement.style.opacity = '0';
      renderer.domElement.style.transition = 'opacity 120ms linear';
      // Treat the bloom canvas as an additive overlay: dark pixels become
      // a no-op against the PNG behind it, bright (bloomed) pixels glow through.
      renderer.domElement.style.mixBlendMode = 'multiply';
      container.appendChild(renderer.domElement);

      // Post-processing — bloom turns bright pixels into real glow.
      const composer = new EffectComposer(renderer);
      composer.setSize(width, height);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        1.65, // strength
        0.85, // radius
        0.04, // threshold
      );
      composer.addPass(bloomPass);

      // Core orb — a billboard sprite with a soft radial gradient.
      const { sprite: coreOrb, material: coreMat } = makeCoreOrb();
      scene.add(coreOrb);

      // Three concentric shockwave rings facing the camera.
      const rings: Array<{ mesh: THREE.Mesh; material: THREE.ShaderMaterial }> = [];
      const ringColors = ['#FFE08A', '#FFD27A', '#FFB347'];
      for (let i = 0; i < RING_COUNT; i++) {
        const r = makeRing(ringColors[i] ?? '#FFE08A');
        // Face the camera.
        r.mesh.rotation.x = 0;
        rings.push(r);
        scene.add(r.mesh);
      }

      // Particle burst.
      const { points: particles, material: particleMat, setPalette } =
        makeParticleSystem('growth');
      scene.add(particles);

      let animActive = false;
      let animStart = 0;
      let animPalette: GrowthPalette = 'growth';
      let burstStart = 0;
      let animResolve: (() => void) | null = null;

      const playGrowth = ({ from, to, palette }: PlayGrowthArgs): Promise<void> => {
        return new Promise<void>((resolve) => {
          if (animResolve) {
            const r = animResolve;
            animResolve = null;
            r();
          }
          fromStageRef.current = from;
          toStageRef.current = to;

          setOutgoingStage(from);
          setDisplayStage(from);
          setFromOpacity(1);
          setToOpacity(0);

          setPalette(palette);

          animActive = true;
          animPalette = palette;
          animStart = performance.now();
          burstStart = animStart;
          particleMat.uniforms.uTime!.value = -1;
          particleMat.uniforms.uIntensity!.value = 0;
          coreMat.opacity = 0;
          coreOrb.scale.set(0, 0, 0);
          for (const ring of rings) {
            ring.material.uniforms.uOpacity!.value = 0;
            ring.mesh.scale.set(0.01, 0.01, 1);
          }
          // Reveal the bloom canvas for the duration of the animation.
          renderer.domElement.style.opacity = '1';
          animResolve = resolve;

          window.setTimeout(() => {
            if (animResolve === resolve) {
              const r = animResolve;
              animResolve = null;
              r();
            }
          }, ANIMATION_DURATION_MS + 60);
        });
      };

      handleRef.current = { playGrowth };

      const onResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
        bloomPass.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      let raf = 0;
      const tick = () => {
        const now = performance.now();

        if (animActive) {
          const t = THREE.MathUtils.clamp(
            (now - animStart) / ANIMATION_DURATION_MS,
            0,
            1,
          );

          // Core orb — bell shape with hot peak.
          const coreT = bell(PHASE.coreStart, PHASE.coreEnd, t);
          // Eased growth so it punches through.
          const coreScale =
            coreT > 0
              ? (animPalette === 'bloom' ? 10 : 8.5) * easeOutCubic(coreT)
              : 0;
          coreOrb.scale.set(coreScale, coreScale, 1);
          coreMat.opacity = Math.min(1.2, coreT * 1.4);

          // Particle burst — keep particles streaming for the whole peak.
          const partT = bell(PHASE.partStart, PHASE.partEnd, t);
          particleMat.uniforms.uTime!.value = (now - burstStart) / 1000;
          particleMat.uniforms.uIntensity!.value = partT * (animPalette === 'bloom' ? 1.7 : 1.4);

          // Shockwave rings — staggered, expanding, fading.
          for (let i = 0; i < rings.length; i++) {
            const startAt = PHASE.ringFirstStart + i * PHASE.ringStagger;
            const rt = (t - startAt) / PHASE.ringDuration;
            const ring = rings[i]!;
            if (rt > 0 && rt < 1) {
              const eased = easeOutCubic(rt);
              const r = 0.4 + eased * (animPalette === 'bloom' ? 7.5 : 6);
              ring.mesh.scale.set(r, r, 1);
              ring.material.uniforms.uOpacity!.value = (1 - rt) * 0.95;
            } else {
              ring.material.uniforms.uOpacity!.value = 0;
              ring.mesh.scale.set(0.01, 0.01, 1);
            }
          }

          // PNG cross-fade. From-PNG dips deep at the peak; to-PNG resolves after.
          const fromO = 1 - smoothStep01(PHASE.fromFadeStart, PHASE.fromFadeEnd, t);
          const toO = smoothStep01(PHASE.toFadeStart, PHASE.toFadeEnd, t);
          setFromOpacity(fromO);
          setToOpacity(toO);
          // Swap the to-PNG image past the peak so it emerges from the cocoon.
          if (t >= 0.6) {
            setDisplayStage(toStageRef.current);
          }

          if (t >= 1) {
            animActive = false;
            coreMat.opacity = 0;
            coreOrb.scale.set(0, 0, 0);
            for (const ring of rings) {
              ring.material.uniforms.uOpacity!.value = 0;
              ring.mesh.scale.set(0.01, 0.01, 1);
            }
            particleMat.uniforms.uIntensity!.value = 0;
            // Hide the bloom canvas — the PNG now owns the viewport again.
            renderer.domElement.style.opacity = '0';
            setOutgoingStage(null);
            setFromOpacity(0);
            setToOpacity(1);
            setDisplayStage(toStageRef.current);
            if (animResolve) {
              const r = animResolve;
              animResolve = null;
              r();
            }
          }
        }

        // Only render through the composer while the animation is active.
        // Otherwise we'd paint a solid-black opaque frame over the PNG.
        if (animActive) {
          composer.render();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.geometry.dispose();
            const mat = m.material as THREE.Material | THREE.Material[];
            if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
            else mat.dispose();
          }
          if ((obj as THREE.Points).isPoints) {
            const p = obj as THREE.Points;
            p.geometry.dispose();
            (p.material as THREE.Material).dispose();
          }
          if ((obj as THREE.Sprite).isSprite) {
            const s = obj as THREE.Sprite;
            (s.material as THREE.Material).dispose();
          }
        });
        composer.dispose?.();
        bloomPass.dispose?.();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
        handleRef.current = null;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        playGrowth: (args) => {
          const h = handleRef.current;
          if (!h) {
            return new Promise<void>((resolve) =>
              window.setTimeout(resolve, ANIMATION_DURATION_MS),
            );
          }
          return h.playGrowth(args);
        },
      }),
      [],
    );

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden rounded-lg bg-gradient-to-b from-paper to-cream/30 border border-border ${className ?? ''}`}
        data-testid="plant-viewport"
      >
        {/* Outgoing (from) PNG */}
        {outgoingStage != null && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white"
            style={{ opacity: fromOpacity, transition: 'opacity 40ms linear' }}
          >
            <PlantImage
              species={species}
              stage={outgoingStage}
              className="w-3/4 h-3/4 object-contain"
            />
          </div>
        )}
        {/* Current / incoming (to) PNG */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-white"
          style={{ opacity: toOpacity, transition: 'opacity 40ms linear' }}
        >
          <PlantImage
            species={species}
            stage={displayStage}
            className="w-3/4 h-3/4 object-contain"
          />
        </div>
      </div>
    );
  },
);
