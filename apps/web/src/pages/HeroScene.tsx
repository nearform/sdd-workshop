import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Segment = {
  mesh: THREE.Mesh;
  startAt: number; // ms after scene start
  duration: number;
  fullScaleY: number;
};

type Leaf = {
  mesh: THREE.Mesh;
  startAt: number;
  duration: number;
  fullScale: number;
};

const PALETTE = {
  trunk: 0x6b4a2b,
  trunkLight: 0x8c6a3f,
  leaf1: 0x4f8c3a,
  leaf2: 0x6ea84d,
  leaf3: 0xc97b3f, // a few warm autumn leaves
  glow: 0xfff2c4,
};

function buildTree(
  scene: THREE.Group,
  segments: Segment[],
  leaves: Leaf[],
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  length: number,
  radius: number,
  depth: number,
  startAt: number,
) {
  const segDuration = 380;

  // Trunk segment as a tapered cylinder
  const geo = new THREE.CylinderGeometry(radius * 0.55, radius, length, 8, 1);
  // Move pivot to base so scaleY grows from the bottom upward
  geo.translate(0, length / 2, 0);

  const colorBlend = THREE.MathUtils.clamp(depth / 5, 0, 1);
  const trunkColor = new THREE.Color(PALETTE.trunk).lerp(
    new THREE.Color(PALETTE.trunkLight),
    colorBlend,
  );

  const mat = new THREE.MeshStandardMaterial({
    color: trunkColor,
    roughness: 0.85,
    metalness: 0.0,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(origin);

  // Orient cylinder along `direction`. Cylinder default points +Y.
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
  mesh.quaternion.copy(quat);

  // Start scale 0 — animates up to 1
  mesh.scale.set(1, 0.001, 1);

  scene.add(mesh);
  segments.push({ mesh, startAt, duration: segDuration, fullScaleY: 1 });

  const tipOffset = direction.clone().normalize().multiplyScalar(length);
  const tipWorld = origin.clone().add(tipOffset);

  if (depth <= 0) {
    // Spawn leaf cluster
    const leafCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < leafCount; i++) {
      const leafGeo = new THREE.IcosahedronGeometry(0.32 + Math.random() * 0.12, 0);
      const isAutumn = Math.random() < 0.18;
      const isLight = Math.random() < 0.4;
      const leafColor = isAutumn
        ? PALETTE.leaf3
        : isLight
          ? PALETTE.leaf2
          : PALETTE.leaf1;
      const leafMat = new THREE.MeshStandardMaterial({
        color: leafColor,
        roughness: 0.6,
        metalness: 0.0,
        flatShading: true,
      });
      const leafMesh = new THREE.Mesh(leafGeo, leafMat);
      leafMesh.position.copy(tipWorld);
      leafMesh.position.x += (Math.random() - 0.5) * 0.7;
      leafMesh.position.y += (Math.random() - 0.5) * 0.5;
      leafMesh.position.z += (Math.random() - 0.5) * 0.7;
      leafMesh.scale.set(0.001, 0.001, 0.001);
      scene.add(leafMesh);
      leaves.push({
        mesh: leafMesh,
        startAt: startAt + segDuration + Math.random() * 200,
        duration: 500 + Math.random() * 300,
        fullScale: 0.9 + Math.random() * 0.4,
      });
    }
    return;
  }

  // Spawn 2-3 child branches
  const childCount = depth >= 3 ? 2 : 2 + (Math.random() < 0.5 ? 1 : 0);
  const childStartAt = startAt + segDuration * 0.55;

  for (let i = 0; i < childCount; i++) {
    // Random rotation around the parent's direction axis
    const around = direction.clone().normalize();
    const angleAround = (i / childCount) * Math.PI * 2 + Math.random() * 0.8;

    // Pick a perpendicular base axis
    const arbitrary =
      Math.abs(around.y) < 0.99
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
    const sideAxis = new THREE.Vector3()
      .crossVectors(around, arbitrary)
      .normalize();

    // Tilt away from parent direction by ~25–55deg, then rotate around parent axis
    const tilt = THREE.MathUtils.degToRad(28 + Math.random() * 28);
    const childDir = around
      .clone()
      .applyAxisAngle(sideAxis, tilt)
      .applyAxisAngle(around, angleAround)
      .normalize();

    const lenScale = 0.68 + Math.random() * 0.12;
    const radScale = 0.62;

    buildTree(
      scene,
      segments,
      leaves,
      tipWorld,
      childDir,
      length * lenScale,
      radius * radScale,
      depth - 1,
      childStartAt,
    );
  }
}

function makeSpores(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const offsets = new Float32Array(count);
  const speeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 1] = Math.random() * 12 - 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    offsets[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.15 + Math.random() * 0.45;
    sizes[i] = 0.04 + Math.random() * 0.09;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));
  geom.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  // Tiny glowing radial gradient texture
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,242,196,1)');
  grad.addColorStop(0.4, 'rgba(255,225,150,0.55)');
  grad.addColorStop(1, 'rgba(255,225,150,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTex: { value: tex },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aOffset;
      attribute float aSpeed;
      attribute float aSize;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        // Drift up + sway
        p.y += mod(uTime * aSpeed + aOffset, 14.0) - 4.0;
        p.x += sin(uTime * 0.4 + aOffset) * 0.4;
        p.z += cos(uTime * 0.3 + aOffset * 1.3) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * 250.0 / -mv.z;
        // Fade based on height for soft tops/bottoms
        float h = clamp((p.y + 4.0) / 12.0, 0.0, 1.0);
        vAlpha = smoothstep(0.0, 0.2, h) * (1.0 - smoothstep(0.7, 1.0, h));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uTex, gl_PointCoord);
        gl_FragColor = vec4(t.rgb, t.a * vAlpha);
      }
    `,
  });

  const pts = new THREE.Points(geom, mat);
  pts.frustumCulled = false;
  return pts;
}

export function HeroScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf6f4ec, 14, 28);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 3.4, 11);
    camera.lookAt(0, 3.5, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xfff5dc, 0.55));
    const sun = new THREE.DirectionalLight(0xfff0c0, 1.4);
    sun.position.set(4, 8, 6);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9fc78f, 0.45);
    rim.position.set(-5, 4, -4);
    scene.add(rim);

    // Ground "halo" — a soft disk at the base of the tree
    const haloGeo = new THREE.CircleGeometry(2.6, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfff2c4,
      transparent: true,
      opacity: 0.4,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.01;
    scene.add(halo);

    // Tree group
    const treeGroup = new THREE.Group();
    scene.add(treeGroup);

    const segments: Segment[] = [];
    const leaves: Leaf[] = [];
    const sceneStart = performance.now();

    buildTree(
      treeGroup,
      segments,
      leaves,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      1.85,
      0.22,
      4,
      sceneStart + 200,
    );

    // Spore particles
    const spores = makeSpores(140);
    scene.add(spores);
    const sporeMat = spores.material as THREE.ShaderMaterial;

    // Mouse parallax target
    const mouse = { x: 0, y: 0 };
    const targetRot = { x: 0, y: 0 };

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouse.x = nx;
      mouse.y = ny;
      targetRot.y = nx * 0.35;
      targetRot.x = -ny * 0.18;
    };
    window.addEventListener('pointermove', onPointerMove);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const animate = () => {
      const now = performance.now();
      const t = (now - sceneStart) / 1000;

      // Animate trunk segments — scaleY ease-out
      for (const s of segments) {
        const local = (now - s.startAt) / s.duration;
        if (local <= 0) continue;
        const k = Math.min(local, 1);
        const eased = 1 - Math.pow(1 - k, 3);
        s.mesh.scale.y = Math.max(0.001, eased * s.fullScaleY);
      }

      // Animate leaves — pop in
      for (const l of leaves) {
        const local = (now - l.startAt) / l.duration;
        if (local <= 0) continue;
        const k = Math.min(local, 1);
        const eased = 1 - Math.pow(1 - k, 4);
        const s = eased * l.fullScale;
        l.mesh.scale.set(s, s, s);
        // Gentle bob once grown
        if (k >= 1) {
          l.mesh.position.y += Math.sin(t * 1.2 + l.mesh.id) * 0.0006;
        }
      }

      // Smooth camera-rig rotation toward mouse target
      treeGroup.rotation.y += (targetRot.y - treeGroup.rotation.y) * 0.04;
      treeGroup.rotation.x += (targetRot.x - treeGroup.rotation.x) * 0.04;
      // Idle drift
      treeGroup.rotation.y += Math.sin(t * 0.18) * 0.0006;

      // Halo pulse
      const pulse = 0.36 + Math.sin(t * 1.6) * 0.08;
      halo.scale.setScalar(1 + Math.sin(t * 1.6) * 0.05);
      (halo.material as THREE.MeshBasicMaterial).opacity = pulse;

      sporeMat.uniforms.uTime!.value = t;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      // Dispose
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
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
}
