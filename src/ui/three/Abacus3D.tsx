import { useEffect, useRef, useState } from 'react';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Timer,
  Vector2,
  WebGLRenderer,
  MeshBasicMaterial,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  digitsOf,
  earthY,
  heavenY,
  LAYOUT,
  pushEarth,
  RODS,
  rodFromDigit,
  springStep,
  stepDigit,
  toggleHeaven,
  valueOf,
} from './soroban';

interface BeadInfo {
  mesh: Mesh;
  rod: number;
  kind: 'heaven' | 'earth';
  index: number;
  velocity: number;
}

function woodTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, '#6b3b22');
    gradient.addColorStop(1, '#4a2614');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 70; i += 1) {
      ctx.strokeStyle = `rgba(${30 + (i % 3) * 10}, 14, 6, ${0.08 + (i % 5) * 0.025})`;
      ctx.lineWidth = 0.6 + (i % 4) * 0.4;
      ctx.beginPath();
      const y = (i * 37) % 64;
      ctx.moveTo(0, y);
      for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, y + Math.sin(x / 23 + i) * 2.2);
      ctx.stroke();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function shadowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(40,20,10,0.45)');
    g.addColorStop(1, 'rgba(40,20,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new CanvasTexture(canvas);
}

export interface Abacus3DProps {
  initialValue?: number;
  onValueChange?: (value: number) => void;
  className?: string;
}

/**
 * The only WebGL piece of the app. Loaded lazily after the page is usable; never loaded when the student
 * prefers reduced motion. Beads move with a spring (150–300 ms feel) when tapped or with the keyboard.
 */
export default function Abacus3D({ initialValue = 2026, onValueChange, className = '' }: Abacus3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const digitsRef = useRef<number[]>(digitsOf(initialValue));
  const [selectedRod, setSelectedRod] = useState(RODS - 1);
  const selectedRef = useRef(selectedRod);
  const notify = useRef(onValueChange);
  useEffect(() => {
    notify.current = onValueChange;
  }, [onValueChange]);
  const apiRef = useRef<{ setDigits: (d: number[]) => void; highlight: (rod: number) => void } | null>(null);

  useEffect(() => {
    const container = host.current;
    if (!container) return;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'pan-y';

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    const camera = new PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.25, 10.5);

    scene.add(new AmbientLight(new Color('#fff1e3'), 0.35));
    const key = new DirectionalLight(new Color('#fff4e8'), 2.1);
    key.position.set(3.5, 5, 6);
    scene.add(key);
    const rim = new DirectionalLight(new Color('#ffb3bd'), 0.9);
    rim.position.set(-5, 2, -4);
    scene.add(rim);

    const abacus = new Group();
    scene.add(abacus);
    const disposables: { dispose: () => void }[] = [envTexture, pmrem];

    const wood = woodTexture();
    const woodMat = new MeshStandardMaterial({ map: wood, roughness: 0.48, metalness: 0.05, color: new Color('#ffffff') });
    disposables.push(wood, woodMat);
    const spacing = 0.86;
    const width = RODS * spacing + 0.7;
    const frame = (w: number, h: number, d: number, x: number, y: number) => {
      const geometry = new RoundedBoxGeometry(w, h, d, 3, 0.07);
      disposables.push(geometry);
      const mesh = new Mesh(geometry, woodMat);
      mesh.position.set(x, y, 0);
      abacus.add(mesh);
    };
    frame(width + 0.5, 0.32, 0.62, 0, LAYOUT.frameTopInner + 0.16);
    frame(width + 0.5, 0.32, 0.62, 0, LAYOUT.frameBottomInner - 0.16);
    frame(0.3, 3.1 + 0.32, 0.62, -width / 2 - 0.1, 0);
    frame(0.3, 3.1 + 0.32, 0.62, width / 2 + 0.1, 0);
    frame(width, LAYOUT.beamTop - LAYOUT.beamBottom, 0.44, 0, (LAYOUT.beamTop + LAYOUT.beamBottom) / 2);

    const rodGeometry = new CylinderGeometry(0.032, 0.032, 3.1, 16);
    const rodMat = new MeshStandardMaterial({ color: new Color('#cdb27a'), metalness: 0.85, roughness: 0.28 });
    disposables.push(rodGeometry, rodMat);

    // Bicone bead profile (rotated around Y by LatheGeometry).
    const profile = [
      [0.0, -0.17],
      [0.07, -0.165],
      [0.22, -0.07],
      [0.3, -0.02],
      [0.31, 0],
      [0.3, 0.02],
      [0.22, 0.07],
      [0.07, 0.165],
      [0.0, 0.17],
    ].map(([x, y]) => new Vector2(x, y));
    const beadGeometry = new LatheGeometry(profile, 40);
    const heavenMat = new MeshPhysicalMaterial({ color: new Color('#b3122e'), roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.18 });
    const earthMat = new MeshPhysicalMaterial({ color: new Color('#f1e6d4'), roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    const selectedMat = new MeshPhysicalMaterial({ color: new Color('#f6d9a8'), roughness: 0.3, clearcoat: 0.7, emissive: new Color('#7a4a00'), emissiveIntensity: 0.25 });
    disposables.push(beadGeometry, heavenMat, earthMat, selectedMat);

    const beads: BeadInfo[] = [];
    for (let r = 0; r < RODS; r += 1) {
      const x = (r - (RODS - 1) / 2) * spacing;
      const rod = new Mesh(rodGeometry, rodMat);
      rod.position.set(x, 0, 0);
      abacus.add(rod);
      const state = rodFromDigit(digitsRef.current[r] ?? 0);
      const heaven = new Mesh(beadGeometry, heavenMat);
      heaven.position.set(x, heavenY(state.heaven), 0);
      heaven.userData.bead = beads.length;
      abacus.add(heaven);
      beads.push({ mesh: heaven, rod: r, kind: 'heaven', index: 0, velocity: 0 });
      for (let j = 0; j < 4; j += 1) {
        const bead = new Mesh(beadGeometry, earthMat);
        bead.position.set(x, earthY(j, j < state.earth), 0);
        bead.userData.bead = beads.length;
        abacus.add(bead);
        beads.push({ mesh: bead, rod: r, kind: 'earth', index: j, velocity: 0 });
      }
    }

    const shadowTex = shadowTexture();
    const shadowMat = new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    const shadowGeo = new PlaneGeometry(7.5, 2.2);
    disposables.push(shadowTex, shadowMat, shadowGeo);
    const shadow = new Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -2.15, 0.2);
    scene.add(shadow);

    abacus.rotation.set(-0.08, -0.32, 0.02);

    const targetOf = (bead: BeadInfo): number => {
      const state = rodFromDigit(digitsRef.current[bead.rod] ?? 0);
      return bead.kind === 'heaven' ? heavenY(state.heaven) : earthY(bead.index, bead.index < state.earth);
    };

    // Render on demand: the loop runs only while something moves and stops when everything settles.
    let running = false;
    let calmFrames = 0;
    const wake = () => {
      if (running) return;
      running = true;
      calmFrames = 0;
      renderer.setAnimationLoop(loop);
    };

    const highlight = (rod: number) => {
      for (const bead of beads) {
        if (bead.kind === 'earth') bead.mesh.material = bead.rod === rod ? selectedMat : earthMat;
      }
      wake();
    };
    apiRef.current = {
      setDigits: (d) => {
        digitsRef.current = d;
        wake();
      },
      highlight,
    };

    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let tiltX = 0;
    let tiltY = 0;

    const pick = (event: PointerEvent): BeadInfo | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(beads.map((b) => b.mesh as Object3D), false)[0];
      const index = hit?.object.userData.bead as number | undefined;
      return index === undefined ? null : (beads[index] ?? null);
    };

    const onPointerDown = (event: PointerEvent) => {
      const bead = pick(event);
      if (!bead) return;
      const digits = [...digitsRef.current];
      const current = digits[bead.rod] ?? 0;
      digits[bead.rod] = bead.kind === 'heaven' ? toggleHeaven(current) : pushEarth(current, bead.index);
      digitsRef.current = digits;
      selectedRef.current = bead.rod;
      setSelectedRod(bead.rod);
      notify.current?.(valueOf(digits));
      wake();
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      tiltX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      tiltY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      renderer.domElement.style.cursor = pick(event) ? 'pointer' : 'default';
      wake();
    };
    const onPointerLeave = () => {
      tiltX = 0;
      tiltY = 0;
      wake();
    };
    const onScroll = () => wake();
    window.addEventListener('scroll', onScroll, { passive: true });
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    const resize = () => {
      const { width: w, height: h } = container.getBoundingClientRect();
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.position.z = w / h < 1 ? 13.5 : 10.5;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) wake();
    });
    visibility.observe(container);

    const timer = new Timer();
    function loop(time: number) {
      if (!visible || document.hidden) {
        renderer.setAnimationLoop(null);
        running = false;
        return;
      }
      timer.update(time);
      const dt = Math.min(timer.getDelta(), 1 / 30);
      let moving = false;
      for (const bead of beads) {
        const target = targetOf(bead);
        const next = springStep(bead.mesh.position.y, bead.velocity, target, dt);
        bead.mesh.position.y = next.position;
        bead.velocity = next.velocity;
        if (Math.abs(next.position - target) > 1e-4 || Math.abs(next.velocity) > 1e-3) moving = true;
      }
      const scroll = Math.min(window.scrollY / 600, 1);
      const ry = -0.32 + tiltX * 0.22 + scroll * 0.35;
      const rx = -0.08 + tiltY * 0.1 - scroll * 0.12;
      abacus.rotation.y += (ry - abacus.rotation.y) * 0.1;
      abacus.rotation.x += (rx - abacus.rotation.x) * 0.1;
      if (Math.abs(ry - abacus.rotation.y) > 1e-4 || Math.abs(rx - abacus.rotation.x) > 1e-4) moving = true;
      renderer.render(scene, camera);
      calmFrames = moving ? 0 : calmFrames + 1;
      if (calmFrames > 20) {
        renderer.setAnimationLoop(null);
        running = false;
      }
    }
    wake();

    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibility.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      apiRef.current = null;
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let rod = selectedRef.current;
    const digits = [...digitsRef.current];
    if (event.key === 'ArrowLeft') rod = Math.max(0, rod - 1);
    else if (event.key === 'ArrowRight') rod = Math.min(RODS - 1, rod + 1);
    else if (event.key === 'ArrowUp') digits[rod] = stepDigit(digits[rod] ?? 0, 1);
    else if (event.key === 'ArrowDown') digits[rod] = stepDigit(digits[rod] ?? 0, -1);
    else return;
    event.preventDefault();
    selectedRef.current = rod;
    setSelectedRod(rod);
    digitsRef.current = digits;
    apiRef.current?.setDigits(digits);
    apiRef.current?.highlight(rod);
    notify.current?.(valueOf(digits));
  };


  return (
    <div
      ref={host}
      className={`relative h-full w-full outline-none ${className}`}
      tabIndex={0}
      role="application"
      aria-roledescription="ábaco interactivo"
      aria-label={`Ábaco 3D. Flechas izquierda y derecha eligen la varilla ${selectedRod + 1}; arriba y abajo cambian su dígito.`}
      onKeyDown={onKeyDown}
      onFocus={() => apiRef.current?.highlight(selectedRef.current)}
      onBlur={() => apiRef.current?.highlight(-1)}
    />
  );
}
