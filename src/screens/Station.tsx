import { getProjects } from '@/cms/sanityClient';
import Arcade from '@/components/custom/Arcade';
import ProjectMenuModal from '@/components/custom/ProjectMenuModal';
import { mockProjects, mergeWithMockProjects } from '@/data/mockProjects';
import stationAudio from '@/lib/stationAudio';
import { Project } from '@/types/Project';
import { Volume2, VolumeX } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type Rect = { x1: number; x2: number; z1: number; z2: number };
type Interactable = { pos: THREE.Vector3; label: string; action: () => void };

const H = 5; // ceiling height
const EYE = 1.7;
const R = 0.35; // player radius

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  const words = text.split(' ');
  let line = '';
  let n = 0;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + n * lh);
      line = w + ' ';
      if (++n >= maxLines) return;
    } else line = test;
  }
  ctx.fillText(line, x, y + n * lh);
}

function panel(title: string, body: string, w: number, h: number, footer = '', accent = '#e0a030', light = false) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.round((1024 * h) / w);
  const ctx = c.getContext('2d')!;

  // High-tech sci-fi composite background
  ctx.fillStyle = light ? '#f4f3ee' : '#0d0f12';
  ctx.fillRect(0, 0, c.width, c.height);

  // Subtle carbon-tech grid overlay
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < c.width; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
  }
  for (let y = 0; y < c.height; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
  }

  // Futuristic border with corner brackets
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, c.width - 32, c.height - 32);

  // Tech corner brackets
  const bk = 36;
  ctx.fillStyle = accent;
  ctx.fillRect(12, 12, bk, 8);
  ctx.fillRect(12, 12, 8, bk);
  ctx.fillRect(c.width - 12 - bk, 12, bk, 8);
  ctx.fillRect(c.width - 20, 12, 8, bk);
  ctx.fillRect(12, c.height - 20, bk, 8);
  ctx.fillRect(12, c.height - 12 - bk, 8, bk);
  ctx.fillRect(c.width - 12 - bk, c.height - 20, bk, 8);
  ctx.fillRect(c.width - 20, c.height - 12 - bk, 8, bk);

  // Header banner & title
  ctx.fillStyle = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,167,61,0.08)';
  ctx.fillRect(20, 20, c.width - 40, 90);

  ctx.fillStyle = light ? '#111315' : accent;
  ctx.font = 'bold 54px monospace';
  wrap(ctx, title, 50, 84, c.width - 100, 60, 2);

  // Body content
  ctx.fillStyle = light ? '#2b2d30' : '#d8d5cb';
  ctx.font = '32px sans-serif';
  wrap(ctx, body, 50, 175, c.width - 100, 46, Math.floor((c.height - 240) / 46));

  // Footer bar with tech status
  ctx.fillStyle = light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
  ctx.fillRect(20, c.height - 62, c.width - 40, 42);

  ctx.fillStyle = accent;
  ctx.font = 'bold 26px monospace';
  ctx.fillText(footer || '[STATUS // ONLINE]', 50, c.height - 33);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, fog: false }),
  );
  return m;
}

const Station: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [game, setGame] = useState<string | null>(null);
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const joy = useRef({ x: 0, y: 0 });
  const look = useRef({ x: 0, y: 0 });
  const want = useRef({ jump: false, act: false });
  const stick = useRef({ x: 0, y: 0 });
  const knob = useRef<HTMLDivElement>(null);
  const moveStick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > 52) {
      dx = (dx / m) * 52;
      dy = (dy / m) * 52;
    }
    joy.current = { x: dx / 52, y: dy / 52 };
    knob.current!.style.transform = `translate(${dx}px,${dy}px)`;
  };
  const resetStick = () => {
    joy.current = { x: 0, y: 0 };
    if (knob.current) knob.current.style.transform = '';
  };
  const [started, setStarted] = useState(false);
  const [built, setBuilt] = useState(false);
  const [projectsDone, setProjectsDone] = useState(false);
  const [projects, setProjects] = useState<Project[]>(import.meta.env.PROD ? [] : mockProjects);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const activeProjectRef = useRef<Project | null>(null);
  activeProjectRef.current = activeProject;
  const projectsRef = useRef<Project[]>(import.meta.env.PROD ? [] : mockProjects);
  projectsRef.current = projects;

  const openProject = useCallback((p: Project) => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setActiveProject(p);
  }, []);

  const closeProject = useCallback(() => {
    setActiveProject(null);
  }, []);

  const gameRef = useRef<string | null>(null);
  gameRef.current = game;
  // leaving a game re-locks the mouse straight away (runs inside the key press, so the browser allows it)
  const exitGame = useCallback(() => {
    setGame(null);
    (mountRef.current as (HTMLDivElement & { lock?: () => void }) | null)?.lock?.();
  }, []);

  useEffect(() => {
    const giveUp = setTimeout(() => {
      setProjects((curr) => (curr && curr.length ? curr : (import.meta.env.PROD ? [] : mockProjects)));
      setProjectsDone(true);
    }, 4000); // never hang on a slow CMS
    getProjects()
      .then((data) => {
        const merged = mergeWithMockProjects(data);
        setProjects(merged);
      })
      .catch((err) => {
        console.warn('Failed to load CMS projects:', err);
        setProjects(import.meta.env.PROD ? [] : mockProjects);
      })
      .finally(() => setProjectsDone(true));
    return () => clearTimeout(giveUp);
  }, []);

  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1 : 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020203);
    scene.fog = new THREE.FogExp2(0x0c0d10, 0.014);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ';

    // one warm lamp that follows the player; cheaper than lighting every room
    const lamp = new THREE.PointLight(0xfff2dc, 40, 14);
    camera.add(lamp);
    scene.add(camera);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4), new THREE.HemisphereLight(0xfff6e8, 0x55575a, 0.8));

    // --- outer space: stars + planet (visible through the open hub dome)
    const sp = new Float32Array(3 * 2500);
    for (let i = 0; i < sp.length; i += 3) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(500);
      sp.set([v.x, v.y, v.z], i);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, fog: false })));
    const pc = document.createElement('canvas');
    pc.width = 1024;
    pc.height = 512;
    const px = pc.getContext('2d')!;

    // 1. Rich planetary atmospheric gradient base
    const grad = px.createLinearGradient(0, 0, 0, 512);
    const bands = [
      { p: 0.0, c: '#2b1008' },
      { p: 0.12, c: '#6e3019' },
      { p: 0.22, c: '#b86236' },
      { p: 0.32, c: '#f0d3b0' },
      { p: 0.42, c: '#9c4826' },
      { p: 0.50, c: '#d48852' },
      { p: 0.60, c: '#e8cbb0' },
      { p: 0.72, c: '#8c3a1c' },
      { p: 0.84, c: '#52200f' },
      { p: 1.0, c: '#240a04' },
    ];
    bands.forEach((b) => grad.addColorStop(b.p, b.c));
    px.fillStyle = grad;
    px.fillRect(0, 0, 1024, 512);

    // 2. High-frequency turbulent atmospheric shear waves
    for (let y = 10; y < 500; y += 8) {
      const freq = 0.015 + (y % 30) * 0.002;
      const amp = 6 + (y % 20) * 0.7;
      const alpha = 0.08 + (Math.sin(y * 0.1) * 0.5 + 0.5) * 0.12;
      px.strokeStyle = y % 2 === 0 ? `rgba(255,230,200,${alpha})` : `rgba(40,15,5,${alpha * 1.2})`;
      px.lineWidth = 4 + (y % 5) * 2;
      px.beginPath();
      for (let x = 0; x <= 1024; x += 12) {
        const dy = Math.sin(x * freq + y * 0.05) * amp + Math.cos(x * 0.03) * (amp * 0.5);
        if (x === 0) px.moveTo(x, y + dy);
        else px.lineTo(x, y + dy);
      }
      px.stroke();
    }

    // 3. Great Amber Storm Eye (giant swirling anticyclone)
    const stormX = 640;
    const stormY = 280;
    for (let r = 70; r > 8; r -= 6) {
      px.fillStyle = r % 12 === 0 ? 'rgba(215, 95, 40, 0.4)' : 'rgba(245, 180, 120, 0.35)';
      px.beginPath();
      px.ellipse(stormX + Math.sin(r) * 8, stormY, r * 1.6, r * 0.85, 0.08, 0, Math.PI * 2);
      px.fill();
    }

    // 4. Fine cloud whorls and eddies
    for (let k = 0; k < 600; k++) {
      const ex = Math.random() * 1024;
      const ey = Math.random() * 512;
      const ew = 15 + Math.random() * 80;
      const eh = 3 + Math.random() * 12;
      px.fillStyle = Math.random() > 0.4 ? `rgba(255,245,230,${Math.random() * 0.15})` : `rgba(30,10,5,${Math.random() * 0.18})`;
      px.beginPath();
      px.ellipse(ex, ey, ew, eh, (Math.random() - 0.5) * 0.2, 0, Math.PI * 2);
      px.fill();
    }

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(28, 64, 48),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(pc), roughness: 0.88, metalness: 0.08, fog: false }),
    );
    planet.position.set(-30, 60, -60);
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(31.5, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0xffa764, transparent: true, opacity: 0.14, side: THREE.BackSide, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }),
    );
    atmo.position.copy(planet.position);
    scene.add(planet, atmo);
    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(200, 150, 100);
    scene.add(sun);

    // --- materials: ISS-style rack panels (white/grey, blue rails, labelled equipment)
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const toTex = (c: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      return t;
    };
    const LABELS = ['POWER', 'EXPRESS RACK 4', 'HRF ULTRASOUND', 'DECK', 'TO NOD 1', 'HATCH EXIT', 'O2 SUPPLY', 'N2 VENT', 'STOWAGE', 'COOLANT', 'DATA', 'AVIONICS', 'FIRE PORT', 'COMM 2', 'LIFE SUPPORT', 'THERMAL', 'SAMPLE', 'SCIENCE'];

    // High-fidelity procedural ISS Rack Texture Generator
    const rackTex = (seed: number, narrow = false) => {
      const S = 1024;
      const WD = narrow ? 360 : S;
      const c = document.createElement('canvas');
      c.width = WD;
      c.height = S;
      const g = c.getContext('2d')!;
      let rs = seed * 7919 + 13;
      const rnd = () => ((rs = (rs * 9301 + 49297) % 233280) / 233280);
      const label = () => LABELS[Math.floor(rnd() * LABELS.length)];

      // Rack sub-cell generator with 3D bevels, instruments, and crisp text
      const cell = (x: number, y: number, w: number, h: number) => {
        // Base metallic panel with brushed contrast
        const baseColors = ['#e1ded7', '#d8d5ce', '#ebe8e1', '#d2cfc8'];
        g.fillStyle = baseColors[Math.floor(rnd() * baseColors.length)];
        g.fillRect(x, y, w, h);

        // Subtle horizontal brushed metal grain
        g.fillStyle = 'rgba(255,255,255,0.06)';
        for (let gy = y + 2; gy < y + h - 2; gy += 4) {
          g.fillRect(x, gy, w, 1.5);
        }

        // Inner frame bevel
        g.strokeStyle = '#4e5052';
        g.lineWidth = 3;
        g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

        // Ambient occlusion shadows around edges
        for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [
          [x, 0, x + 16, 0, x, y, 16, h],
          [x + w, 0, x + w - 16, 0, x + w - 16, y, 16, h],
          [0, y, 0, y + 16, x, y, w, 16],
          [0, y + h, 0, y + h - 16, x, y + h - 16, w, 16]
        ]) {
          const gr = g.createLinearGradient(x0, y0, x1, y1);
          gr.addColorStop(0, 'rgba(0,0,0,0.38)');
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr;
          g.fillRect(rx, ry, rw, rh);
        }

        // 3D light reflection highlight on top edge
        g.strokeStyle = 'rgba(255,255,255,0.75)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x + 4, y + 4);
        g.lineTo(x + w - 4, y + 4);
        g.stroke();

        // Realistic countersunk hex bolts at corners with cross slots
        for (const [sx, sy] of [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]]) {
          // Bolt rim
          g.fillStyle = '#636569';
          g.beginPath(); g.arc(x + sx, y + sy, 4.5, 0, Math.PI * 2); g.fill();
          // Bolt center
          g.fillStyle = '#1c1d1f';
          g.beginPath(); g.arc(x + sx, y + sy, 2.5, 0, Math.PI * 2); g.fill();
          // Cross slot highlight
          g.strokeStyle = '#9ca0a6';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x + sx - 2, y + sy); g.lineTo(x + sx + 2, y + sy);
          g.moveTo(x + sx, y + sy - 2); g.lineTo(x + sx, y + sy + 2);
          g.stroke();
        }

        let t = Math.floor(rnd() * 9);
        if (t === 7 && rnd() < 0.7) t = 3;
        const ix = x + 18;
        const iy = y + 18;
        const iw = w - 36;
        const ih = h - 36;

        if (t === 0) {
          // Type 0: High-precision Analog Dial Gauge Cluster
          const n = Math.max(1, Math.min(4, Math.floor(iw / 110)));
          for (let i = 0; i < n; i++) {
            const cx = ix + (iw * (i + 0.5)) / n;
            const cy = iy + ih * 0.44;
            const r = Math.max(8, Math.min(ih * 0.38, iw / n / 2.3));

            // Outer chrome bezel
            g.fillStyle = '#1e1f21';
            g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#7c8088';
            g.lineWidth = 2;
            g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();

            // Gauge face
            g.fillStyle = '#f8f6f0';
            g.beginPath(); g.arc(cx, cy, r * 0.84, 0, Math.PI * 2); g.fill();

            // Colored warning arcs (green nominal, yellow alert, red danger)
            g.lineWidth = 3;
            g.strokeStyle = '#22c55e'; // Green
            g.beginPath(); g.arc(cx, cy, r * 0.76, Math.PI * 0.8, Math.PI * 1.6); g.stroke();
            g.strokeStyle = '#eab308'; // Yellow
            g.beginPath(); g.arc(cx, cy, r * 0.76, Math.PI * 1.6, Math.PI * 1.95); g.stroke();
            g.strokeStyle = '#ef4444'; // Red
            g.beginPath(); g.arc(cx, cy, r * 0.76, Math.PI * 1.95, Math.PI * 2.2); g.stroke();

            // Radial tick marks
            g.strokeStyle = '#222';
            g.lineWidth = 1.2;
            for (let k = 0; k <= 8; k++) {
              const a = Math.PI * 0.8 + (k / 8) * Math.PI * 1.4;
              g.beginPath();
              g.moveTo(cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58);
              g.lineTo(cx + Math.cos(a) * r * 0.76, cy + Math.sin(a) * r * 0.76);
              g.stroke();
            }

            // Needle with drop shadow
            const needleAngle = Math.PI * 0.8 + rnd() * Math.PI * 1.4;
            g.strokeStyle = 'rgba(0,0,0,0.3)';
            g.lineWidth = 2.5;
            g.beginPath(); g.moveTo(cx + 1, cy + 1); g.lineTo(cx + Math.cos(needleAngle) * r * 0.7 + 1, cy + Math.sin(needleAngle) * r * 0.7 + 1); g.stroke();

            g.strokeStyle = '#dc2626';
            g.lineWidth = 2;
            g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(needleAngle) * r * 0.7, cy + Math.sin(needleAngle) * r * 0.7); g.stroke();

            // Needle center pin
            g.fillStyle = '#111';
            g.beginPath(); g.arc(cx, cy, 3, 0, Math.PI * 2); g.fill();

            // Gauge label
            g.fillStyle = '#1e293b';
            g.font = 'bold 12px monospace';
            g.textAlign = 'center';
            g.fillText(label().slice(0, 8), cx, cy + r + 15);
          }
        } else if (t === 1) {
          // Type 1: Switchboard / Circuit Breaker Array
          const rows = Math.max(1, Math.min(4, Math.floor(ih / 38)));
          const cols = Math.max(2, Math.floor(iw / 32));
          for (let r = 0; r < rows; r++) {
            for (let q = 0; q < cols; q++) {
              const sx = ix + q * 32;
              const sy = iy + r * 38;
              // Recessed switch well
              g.fillStyle = '#1a1c1e';
              g.fillRect(sx, sy, 22, 28);
              g.strokeStyle = '#4b5563';
              g.lineWidth = 1;
              g.strokeRect(sx, sy, 22, 28);

              // Switch body
              const active = rnd() > 0.4;
              g.fillStyle = active ? '#3b82f6' : '#27272a';
              g.fillRect(sx + 3, sy + (active ? 3 : 13), 16, 12);

              // Chrome lever/knob
              g.fillStyle = active ? '#e0f2fe' : '#71717a';
              g.fillRect(sx + 7, sy + (active ? 5 : 15), 8, 8);

              // Mini LED indicator
              g.fillStyle = active ? '#22c55e' : '#ef4444';
              g.beginPath(); g.arc(sx + 11, sy - 3, 2, 0, Math.PI * 2); g.fill();
            }
          }
        } else if (t === 2) {
          // Type 2: Multi-pin Avionics Connectors & Test Ports
          for (let r = 0; r * 40 < ih - 20; r++) {
            for (let q = 0; q * 40 < iw - 20; q++) {
              const cx = ix + 18 + q * 40;
              const cy = iy + 18 + r * 40;
              g.fillStyle = '#26282b'; g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.fill();
              g.strokeStyle = '#64748b'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.stroke();
              g.fillStyle = '#d97706'; g.beginPath(); g.arc(cx, cy, 10, 0, Math.PI * 2); g.fill();
              g.fillStyle = '#0f172a'; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
            }
          }
        } else if (t === 3) {
          // Type 3: Prominent Stenciled Technical Bay Label
          g.fillStyle = '#f8fafc';
          g.fillRect(ix, iy, iw, ih);
          g.strokeStyle = '#0f172a';
          g.lineWidth = 2.5;
          g.strokeRect(ix, iy, iw, ih);

          // Diagonal corner cuts
          g.fillStyle = '#0f172a';
          g.beginPath(); g.moveTo(ix, iy); g.lineTo(ix + 12, iy); g.lineTo(ix, iy + 12); g.fill();
          g.beginPath(); g.moveTo(ix + iw, iy); g.lineTo(ix + iw - 12, iy); g.lineTo(ix + iw, iy + 12); g.fill();

          g.fillStyle = '#09090b';
          g.font = `bold ${Math.max(14, Math.min(38, ih * 0.38))}px monospace`;
          g.textAlign = 'center';
          g.fillText(label(), ix + iw / 2, iy + ih * 0.48, iw - 16);

          g.fillStyle = '#475569';
          g.font = 'bold 11px monospace';
          g.fillText(`SYS REF // ${Math.floor(rnd() * 899 + 100)}-E`, ix + iw / 2, iy + ih * 0.78, iw - 16);
        } else if (t === 4) {
          // Type 4: Precision Heat Dissipation Louver Grill
          g.fillStyle = '#232528';
          g.fillRect(ix, iy, iw, ih);
          g.strokeStyle = '#3f3f46';
          g.lineWidth = 1.5;
          g.strokeRect(ix, iy, iw, ih);

          const step = Math.max(7, Math.floor(ih / 16));
          for (let yy = iy + 8; yy < iy + ih - 8; yy += step) {
            // Slat shadow
            g.fillStyle = '#09090b';
            g.fillRect(ix + 8, yy, iw - 16, step * 0.5);
            // Slat metallic lip
            g.fillStyle = '#52525b';
            g.fillRect(ix + 8, yy + step * 0.5, iw - 16, 1.5);
          }
        } else if (t === 5) {
          // Type 5: Glowing Digital VFD / LED Telemetry Display
          g.fillStyle = '#111215';
          g.fillRect(ix, iy, iw, ih);
          g.strokeStyle = '#27272a';
          g.lineWidth = 2;
          g.strokeRect(ix, iy, iw, ih);

          // Screen bezel
          g.fillStyle = '#05100a';
          g.fillRect(ix + 8, iy + 8, iw - 16, ih - 16);
          g.strokeStyle = '#10b981';
          g.lineWidth = 1;
          g.globalAlpha = 0.35;
          g.strokeRect(ix + 8, iy + 8, iw - 16, ih - 16);
          g.globalAlpha = 1;

          // Glowing matrix readout
          g.fillStyle = '#34d399';
          g.font = 'bold 12px monospace';
          g.textAlign = 'left';
          const val1 = (100 + rnd() * 40).toFixed(1);
          const val2 = (20 + rnd() * 12).toFixed(1);
          g.fillText(`> ${label().slice(0, 10)}: OK`, ix + 14, iy + 26);
          g.fillText(`> PRESS: ${val1} kPa`, ix + 14, iy + 44);
          if (ih > 64) g.fillText(`> TEMP : ${val2} °C`, ix + 14, iy + 62);
        } else if (t === 6) {
          // Type 6: Heavy Duty Recessed Handles & Quick-Release Latches
          g.fillStyle = '#1c1e22';
          for (const hx of [ix + iw * 0.2, ix + iw * 0.6]) {
            g.beginPath();
            g.roundRect(hx, iy + ih * 0.28, iw * 0.2, ih * 0.26, 6);
            g.fill();
            g.strokeStyle = '#52525b';
            g.lineWidth = 1.5;
            g.stroke();
          }
          // Latch fasteners
          for (const fx of [ix + 12, ix + iw - 12]) {
            g.fillStyle = '#3f3f46';
            g.beginPath(); g.arc(fx, iy + ih * 0.72, 9, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#d4d4d8';
            g.fillRect(fx - 6, iy + ih * 0.72 - 1.5, 12, 3);
          }
        } else if (t === 7) {
          // Type 7: Industrial Hazard Chevron & Emergency Warning Placard
          g.fillStyle = '#eab308';
          g.fillRect(ix, iy, iw, ih);

          // Diagonal black hazard stripes
          g.fillStyle = '#18181b';
          const stripeW = 18;
          for (let sx = -ih; sx < iw + ih; sx += stripeW * 2) {
            g.beginPath();
            g.moveTo(ix + sx, iy);
            g.lineTo(ix + sx + stripeW, iy);
            g.lineTo(ix + sx + stripeW - ih, iy + ih);
            g.lineTo(ix + sx - ih, iy + ih);
            g.closePath();
            g.fill();
          }

          // Center badge
          const bw = Math.min(iw - 20, 160);
          const bh = Math.min(ih - 12, 44);
          g.fillStyle = '#09090b';
          g.fillRect(ix + (iw - bw) / 2, iy + (ih - bh) / 2, bw, bh);
          g.strokeStyle = '#facc15';
          g.lineWidth = 2;
          g.strokeRect(ix + (iw - bw) / 2, iy + (ih - bh) / 2, bw, bh);

          g.fillStyle = '#facc15';
          g.font = 'bold 12px monospace';
          g.textAlign = 'center';
          g.fillText('! WARNING !', ix + iw / 2, iy + (ih - bh) / 2 + 18);
          g.fillStyle = '#e4e4e7';
          g.font = '10px monospace';
          g.fillText(label().slice(0, 12), ix + iw / 2, iy + (ih - bh) / 2 + 34);
        } else {
          // Type 8: Blue Aerospace Division Rail Bar
          g.fillStyle = '#1d4ed8';
          g.fillRect(ix, iy + ih * 0.22, iw, ih * 0.56);
          g.strokeStyle = '#60a5fa';
          g.lineWidth = 1.5;
          g.strokeRect(ix, iy + ih * 0.22, iw, ih * 0.56);

          g.fillStyle = '#ffffff';
          g.font = `bold ${Math.max(12, Math.min(26, ih * 0.32))}px monospace`;
          g.textAlign = 'center';
          g.fillText(label(), ix + iw / 2, iy + ih * 0.56, iw - 12);
        }
      };

      let y = 0;
      while (y < S) {
        let h = Math.min([128, 160, 192, 256][Math.floor(rnd() * 4)], S - y);
        if (S - y - h < 110) h = S - y;
        const cols = narrow || rnd() < 0.3 ? 1 : rnd() < 0.6 ? 2 : 3;
        for (let q = 0; q < cols; q++) cell((WD / cols) * q, y, WD / cols, h);
        if (rnd() < 0.5) {
          g.fillStyle = '#2563eb';
          g.fillRect(0, y + h - 6, WD, 6);
        }
        y += h;
      }
      return toTex(c);
    };

    const racks = [1, 2, 3, 4].map((n) => rackTex(n));
    const rackFronts = [5, 6, 7, 8].map((n) => rackTex(n, true));

    // High-resolution Sci-Fi Wall Bulkhead Texture [Color map, Emissive map]
    const panelCache = new Map<string, THREE.CanvasTexture[]>();
    const panelTex = (neon: string) => {
      const hit = panelCache.get(neon);
      if (hit) return hit;
      const mk = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 1024;
        return c;
      };

      // 1. Color Map
      const a = mk();
      const g = a.getContext('2d')!;

      // Deep sci-fi titanium plate
      g.fillStyle = '#181a1e';
      g.fillRect(0, 0, 1024, 1024);

      // Micro carbon-fiber hex weave pattern
      g.fillStyle = 'rgba(255,255,255,0.025)';
      for (let y = 0; y < 1024; y += 16) {
        for (let x = 0; x < 1024; x += 16) {
          if ((x / 16 + y / 16) % 2 === 0) {
            g.fillRect(x, y, 14, 14);
          }
        }
      }

      // 3D Beveled plate seams
      g.strokeStyle = '#0a0b0d';
      g.lineWidth = 12;
      g.strokeRect(6, 6, 1012, 1012);

      // Vertical divide
      g.beginPath();
      g.moveTo(512, 0); g.lineTo(512, 1024);
      g.stroke();

      // Top light bevel
      g.strokeStyle = 'rgba(255,255,255,0.18)';
      g.lineWidth = 2;
      g.strokeRect(14, 14, 996, 996);

      // Recessed conduit channels
      g.fillStyle = '#101114';
      g.fillRect(18, 220, 988, 44);
      g.fillRect(18, 320, 988, 24);

      // Corner heavy-duty titanium mounting brackets
      g.fillStyle = '#282b31';
      for (const x of [40, 460, 564, 984]) {
        for (const y of [40, 984]) {
          g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#4b5563'; g.lineWidth = 2; g.stroke();
          // Hex center
          g.fillStyle = '#0f1115';
          g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#282b31';
        }
      }

      // Stenciled technical labels
      g.fillStyle = '#64748b';
      g.font = 'bold 22px monospace';
      g.textAlign = 'left';
      g.fillText('BULKHEAD SEC // 08-A', 50, 180);
      g.fillText('STATION INTEGRITY 100%', 550, 180);

      // 2. Emissive Map
      const e = mk();
      const h = e.getContext('2d')!;
      h.fillStyle = '#000';
      h.fillRect(0, 0, 1024, 1024);

      // Soft glowing neon conduit rails
      h.fillStyle = neon;
      for (const [y, hh] of [[232, 20], [328, 10]]) {
        // Soft atmospheric halo
        h.globalAlpha = 0.25;
        h.fillRect(0, y - 24, 1024, hh + 48);
        // Bright core
        h.globalAlpha = 0.95;
        h.fillRect(0, y, 1024, hh);
      }

      const res = [toTex(a), toTex(e)];
      panelCache.set(neon, res);
      return res;
    };

    // High-resolution Industrial Floor Tiles [Color map, Emissive map]
    const floorTexs = (() => {
      const mk = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        return c;
      };

      // 1. Color Map
      const a = mk();
      const g = a.getContext('2d')!;
      g.fillStyle = '#191b1f';
      g.fillRect(0, 0, 512, 512);

      // Raised diamond tread-plate / steel grip pattern
      g.fillStyle = 'rgba(255,255,255,0.04)';
      for (let y = 16; y < 496; y += 24) {
        for (let x = 16; x < 496; x += 24) {
          g.beginPath();
          g.ellipse(x, y, 6, 2, Math.PI / 4, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.ellipse(x + 12, y + 12, 6, 2, -Math.PI / 4, 0, Math.PI * 2);
          g.fill();
        }
      }

      // Tile border frame
      g.strokeStyle = '#0c0d0f';
      g.lineWidth = 10;
      g.strokeRect(4, 4, 504, 504);

      // Light bevel on inner edge
      g.strokeStyle = 'rgba(255,255,255,0.14)';
      g.lineWidth = 2;
      g.strokeRect(10, 10, 492, 492);

      // Center maintenance access hatch
      g.fillStyle = '#22252a';
      g.beginPath(); g.arc(256, 256, 44, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#374151'; g.lineWidth = 3; g.beginPath(); g.arc(256, 256, 44, 0, Math.PI * 2); g.stroke();

      // Corner heavy bolts
      g.fillStyle = '#475569';
      for (const [bx, by] of [[28, 28], [484, 28], [28, 484], [484, 484]]) {
        g.beginPath(); g.arc(bx, by, 6, 0, Math.PI * 2); g.fill();
      }

      // 2. Emissive Map: Glowing floor path guide strips
      const e = mk();
      const h = e.getContext('2d')!;
      h.fillStyle = '#000';
      h.fillRect(0, 0, 512, 512);

      h.strokeStyle = '#ff9a3a';
      h.globalAlpha = 0.28;
      h.lineWidth = 16;
      h.strokeRect(0, 0, 512, 512);

      h.globalAlpha = 0.95;
      h.lineWidth = 5;
      h.strokeRect(0, 0, 512, 512);

      return [toTex(a), toTex(e)];
    })();
    const glow = (c: number, k = 1.4) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
    const colorOf = (grp: THREE.Group): number => grp.userData.color ?? 0xe0a030;
    const panelGray = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, metalness: 0.4 });
    const black = new THREE.MeshStandardMaterial({ color: 0x1f2022, roughness: 0.6, metalness: 0.3 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x3a2a10, emissive: 0xffa73d, emissiveIntensity: 0.9, roughness: 0.5 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x9fa1a3, metalness: 0.6, roughness: 0.45 });
    let neonNow = '#ffa73d'; // accent for whatever is being built (set per room)
    const domeMat = () => {
      const [m, e] = panelTex(neonNow).map((t) => {
        const c = t.clone();
        c.needsUpdate = true;
        c.repeat.set(8, 2);
        return c;
      });
      return new THREE.MeshStandardMaterial({ map: m, emissiveMap: e, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.6, metalness: 0.3, side: THREE.BackSide });
    };
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xb7c4cc, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.14, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
    const gc = document.createElement('canvas');
    gc.width = gc.height = 256;
    const gx = gc.getContext('2d')!;
    for (const [off, w, a] of [[40, 30, 0.5], [110, 10, 0.35], [150, 50, 0.25], [230, 12, 0.4]]) {
      const gr = gx.createLinearGradient(off - w, 0, off + w, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.5, `rgba(220,235,255,${a})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      gx.fillStyle = gr;
      gx.save();
      gx.transform(1, 0, -0.5, 1, 60, 0);
      gx.fillRect(off - w - 60, 0, w * 2, 256);
      gx.restore();
    }
    const glareMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });

    const world = new THREE.Group();
    scene.add(world);
    const rects: Rect[] = [];
    const things: Interactable[] = [];
    const TAU = Math.PI * 2;
    const circles: { cx: number; cz: number; r: number }[] = [];
    // solid props as circles in world space; the player can't walk into them
    const blockers: { x: number; z: number; r: number; h: number }[] = [];
    const nrm = (t: number) => ((t % TAU) + TAU) % TAU;
    // polar position on a circle (angle from +z toward +x) plus the rotation that faces the centre
    const pol = (cx: number, cz: number, r: number, t: number) => [cx + r * Math.sin(t), cz + r * Math.cos(t), t + Math.PI] as const;
    // wall material from a random rack texture; world=true for geometry whose UVs are in metres
    const wallMat = (len: number, h: number, side: THREE.Side = THREE.DoubleSide, world = false) => {
      const [m, e] = panelTex(neonNow).map((t) => {
        const c = t.clone();
        c.needsUpdate = true;
        if (world) c.repeat.set(1 / 3, 1 / 3);
        else c.repeat.set(Math.max(0.3, len / 3), Math.max(0.3, h / 3));
        return c;
      });
      return new THREE.MeshStandardMaterial({ map: m, emissiveMap: e, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.6, metalness: 0.3, side });
    };
    const floorMat = (w: number, d: number, lift = false) => {
      const [m, e] = floorTexs.map((t) => {
        const c = t.clone();
        c.needsUpdate = true;
        c.repeat.set(w / 4, d / 4);
        return c;
      });
      return new THREE.MeshStandardMaterial({ map: m, emissiveMap: e, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.55, polygonOffset: lift, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }); // lift: tunnel floors overlap the room floors, win the depth fight
    };


    const cableMats = [0xeceae2, 0xd6d4cc, 0x161616, 0x3d6b3a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
    // cables clamped through a list of points, slight sag between clamps
    const cableThrough = (g: THREE.Object3D, clamps: THREE.Vector3[], offset: (k: number) => THREE.Vector3) => {
      cableMats.forEach((mat, k) => {
        const o = offset(k);
        const pts: THREE.Vector3[] = [];
        clamps.forEach((c, i) => {
          pts.push(c.clone().add(o));
          const nx = clamps[i + 1];
          if (nx) pts.push(c.clone().lerp(nx, 0.5).add(o).add(new THREE.Vector3(0, -0.05 - k * 0.01, 0)));
        });
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 5, 0.016, 4), mat));
      });
      clamps.forEach((c) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), steel);
        b.position.copy(c).add(new THREE.Vector3(0, -0.02, 0));
        g.add(b);
      });
    };
    const floorCable = (g: THREE.Object3D, mat: THREE.Material) => {
      const pts = [[0, 0.02, -0.4], [0.25, 0.02, -0.9], [0.1, 0.02, -1.4], [0.3, 0.02, -1.9]].map(([a, b, c]) => new THREE.Vector3(a, b, c));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.016, 4), mat));
    };

    // blue handrail arc along a circle
    const rim = (grp: THREE.Group, cx: number, cz: number, r: number, t0: number, t1: number, y: number) => {
      const g = new THREE.TorusGeometry(r, 0.05, 6, Math.max(4, Math.ceil((t1 - t0) * r * 2)), t1 - t0);
      g.rotateZ(Math.PI / 2 - t1);
      const m = new THREE.Mesh(g, blueMat);
      m.rotation.x = Math.PI / 2;
      m.position.set(cx, y, cz);
      grp.add(m);
    };
    // curved wall piece from t0 to t1, y0..y1
    const cylArc = (grp: THREE.Group, cx: number, cz: number, r: number, t0: number, t1: number, y0: number, y1: number) => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, y1 - y0, Math.max(4, Math.ceil((t1 - t0) * r * 2)), 1, true, t0, t1 - t0),
        wallMat((t1 - t0) * r, y1 - y0),
      );
      m.position.set(cx, (y0 + y1) / 2, cz);
      grp.add(m);
      rim(grp, cx, cz, r - 0.05, t0, t1, y0 + 0.9);
    };
    // rounded-rectangle profile: half width hw, height top, corner radius r
    const prof = <P extends THREE.Path>(p: P, hw: number, top: number, r: number, y0 = 0): P => {
      p.moveTo(-hw, y0);
      p.lineTo(hw, y0);
      p.lineTo(hw, top - r);
      p.absarc(hw - r, top - r, r, 0, Math.PI / 2, false);
      p.lineTo(-hw + r, top);
      p.absarc(-hw + r, top - r, r, Math.PI / 2, Math.PI, false);
      p.lineTo(-hw, y0);
      return p;
    };
    const archShape = () => prof(new THREE.Shape(), 3, 4.4, 1.2);
    // doorway on a round room's wall: filler panel + heavy frame so the wall meets the tunnel mouth
    const doorFrame = (grp: THREE.Group, cx: number, cz: number, Rr: number, t: number) => {
      const d = Math.sqrt(Rr * Rr - 9);
      const g = new THREE.Group();
      g.position.set(cx + d * Math.sin(t), 0, cz + d * Math.cos(t));
      g.rotation.y = t;
      const outer = new THREE.Shape([new THREE.Vector2(-3, 0), new THREE.Vector2(3, 0), new THREE.Vector2(3, H), new THREE.Vector2(-3, H)]);
      outer.holes.push(prof(new THREE.Path(), 3, 4.4, 1.2));
      g.add(new THREE.Mesh(new THREE.ShapeGeometry(outer, 16), wallMat(6, H, THREE.DoubleSide, true)));
      // both outlines reach below the floor so no coplanar sill across the doorway (it z-fought the floors)
      const fr = prof(new THREE.Shape(), 3.3, 4.7, 1.4, -0.3);
      fr.holes.push(prof(new THREE.Path(), 3, 4.4, 1.2, -0.2));
      const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(fr, { depth: 0.4, bevelEnabled: false, curveSegments: 10 }), panelGray);
      frame.position.z = -0.2;
      g.add(frame);
      for (const sx of [-3.05, 3.05]) {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), blueMat);
        h.position.set(sx, 1.4, 0.3);
        g.add(h);
      }
      grp.add(g);
    };
    // round room: floor, domed roof (optional skylight), curved rack walls with doors and glass windows
    const roundRoom = (grp: THREE.Group, cx: number, cz: number, Rr: number, doors: number[], windows: [number, number][], holeR = 0) => {
      circles.push({ cx, cz, r: Rr });
      const fl = new THREE.Mesh(new THREE.CircleGeometry(Rr, 64), floorMat(2 * Rr, 2 * Rr));
      fl.rotation.x = -Math.PI / 2;
      fl.position.set(cx, 0, cz);
      grp.add(fl);
      const cap = Rr * 0.25;
      const Rs = (Rr * Rr + cap * cap) / (2 * cap);
      const tmax = Math.asin(Rr / Rs);
      const ts = holeR ? Math.asin(holeR / Rs) : 0;
      const baseY = H - Rs * Math.cos(tmax);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(Rs, 64, 24, 0, TAU, ts, tmax - ts), domeMat());
      dome.position.set(cx, baseY, cz);
      grp.add(dome);
      const domeY = (r: number) => baseY + Math.sqrt(Rs * Rs - r * r);
      // fluorescent ring lamp
      const lr = holeR ? Rr * 0.8 : Rr * 0.55;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(lr, 0.12, 8, 64), glow(0xfff6e4, 1.1));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cx, domeY(lr) - 0.05, cz);
      grp.add(ring);
      if (holeR) {
        const sr = new THREE.Mesh(new THREE.TorusGeometry(holeR, 0.15, 8, 64), steel);
        sr.rotation.x = Math.PI / 2;
        sr.position.set(cx, domeY(holeR), cz);
        const sg = new THREE.Mesh(new THREE.CircleGeometry(holeR, 48), glassMat);
        sg.rotation.x = Math.PI / 2;
        sg.position.copy(sr.position);
        grp.add(sr, sg);
      }
      const rl = new THREE.PointLight(0xfff2dc, 26, 22);
      rl.position.set(cx, H - 1, cz);
      grp.add(rl);
      const cuts = [...doors.map((t) => ({ t: nrm(t), h: Math.asin(3 / Rr), win: false })), ...windows.map(([t, h]) => ({ t: nrm(t), h, win: true }))].sort((a, b) => a.t - b.t);
      cuts.forEach((c, i) => {
        const n = cuts[(i + 1) % cuts.length];
        const a = c.t + c.h;
        const b = (i === cuts.length - 1 ? n.t + TAU : n.t) - n.h;
        if (b > a) cylArc(grp, cx, cz, Rr, a, b, 0, H);
        // one neat cable run along the wall above the doors' sign line
        if (b > a) {
          const n = Math.max(1, Math.ceil(((b - a) * Rr) / 1.6));
          const clamps = Array.from({ length: n + 1 }, (_, i) => {
            const t = a + ((b - a) * i) / n;
            return new THREE.Vector3(cx + (Rr - 0.1) * Math.sin(t), 3.5, cz + (Rr - 0.1) * Math.cos(t));
          });
          cableThrough(grp, clamps, (k) => new THREE.Vector3(0, 0.035 * k, 0));
        }
        if (!c.win) return;
        const [t0, t1] = [c.t - c.h, c.t + c.h];
        cylArc(grp, cx, cz, Rr, t0, t1, 0, 1.1);
        cylArc(grp, cx, cz, Rr, t0, t1, 3.9, H);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(Rr - 0.06, Rr - 0.06, 2.8, 32, 1, true, t0, t1 - t0), glassMat);
        glass.position.set(cx, 2.5, cz);
        grp.add(glass);
        const glare = new THREE.Mesh(new THREE.CylinderGeometry(Rr - 0.08, Rr - 0.08, 2.8, 32, 1, true, t0, t1 - t0), glareMat);
        glare.position.copy(glass.position);
        grp.add(glare);
        for (const t of [t0, t1]) {
          const mu = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.8, 8), panelGray);
          mu.position.set(cx + (Rr - 0.05) * Math.sin(t), 2.5, cz + (Rr - 0.05) * Math.cos(t));
          grp.add(mu);
        }
      });
      doors.forEach((t) => doorFrame(grp, cx, cz, Rr, t));
    };
    // squared tunnel between two points (local x = width; built along +z then rotated).
    const tunnel = (grp: THREE.Group, x1: number, z1: number, x2: number, z2: number) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const g = new THREE.Group();
      g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      g.rotation.y = Math.atan2(x2 - x1, z2 - z1);
      const sm = wallMat(3, 3, THREE.BackSide, true);
      const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape(), { depth: len, bevelEnabled: false, curveSegments: 10 }), [new THREE.MeshBasicMaterial({ visible: false }), sm]);
      shell.position.z = -len / 2;
      g.add(shell);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(6, len), floorMat(6, len, true));
      fl.rotation.x = -Math.PI / 2;
      fl.position.y = 0.02;
      g.add(fl);
      // fluorescent strips along the upper corners + blue handrails
      for (const sx of [-1, 1]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, len), glow(0xfff6e4, 1.1));
        lamp.position.set(sx * 1.3, 4.38, 0);
        g.add(lamp);
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), blueMat);
        rail.rotation.x = Math.PI / 2;
        rail.position.set(sx * 2.78, 1.3, 0);
        g.add(rail);
        for (let z = -len / 2 + 1; z < len / 2; z += 2) {
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6), steel);
          st.rotation.z = Math.PI / 2;
          st.position.set(sx * 2.87, 1.3, z);
          g.add(st);
        }
        const pr = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, len, 10), steel);
        pr.rotation.x = Math.PI / 2;
        pr.position.set(sx * 2.45, 3.5, 0);
        g.add(pr);
        const clamps: THREE.Vector3[] = [];
        for (let z = -len / 2 + 0.5; z <= len / 2 - 0.5; z += 2.5) clamps.push(new THREE.Vector3(sx * 2.92, 2.2, z));
        cableThrough(g, clamps, (k) => new THREE.Vector3(-sx * 0.03 * (k % 2), 0.03 * (k >> 1), 0));
      }
      grp.add(g);
    };
    const place = (grp: THREE.Group, m: THREE.Object3D, x: number, y: number, z: number, rotY: number) => {
      m.position.set(x, y, z);
      m.rotation.y = rotY;
      grp.add(m);
    };
    // --- props
    const anim: ((t: number) => void)[] = [];
    // four readouts that fill the whole frame; neighbouring screens never share one
    let screenCount = 0;
    const drawScreen = (g: CanvasRenderingContext2D, v: number, color: string, t: number, ph: number) => {
      const W = 256;
      const H = 128;
      g.fillStyle = '#060c09';
      g.fillRect(0, 0, W, H);

      // Cyber grid background
      g.strokeStyle = color;
      g.lineWidth = 1;
      g.globalAlpha = 0.18;
      g.beginPath();
      for (let y = 24; y < H; y += 24) { g.moveTo(0, y); g.lineTo(W, y); }
      for (let x = 32; x < W; x += 32) { g.moveTo(x, 0); g.lineTo(x, H); }
      g.stroke();

      // Top status header
      g.globalAlpha = 0.95;
      g.fillStyle = color;
      g.font = 'bold 12px monospace';
      const titles = ['OSCILLOSCOPE // CH1-2', 'SUBSYSTEM TELEMETRY', 'SPECTRAL ANALYZER', 'CORE LOG // SYS-NET'];
      g.fillText(titles[v], 8, 16);

      // Status indicator pill
      g.fillStyle = color;
      g.fillRect(W - 48, 6, 40, 12);
      g.fillStyle = '#000';
      g.font = 'bold 9px monospace';
      g.fillText('ACTIVE', W - 44, 15);

      if (v === 0) {
        // Mode 0: Dual high-fidelity animated oscilloscope waveforms with glow
        g.shadowColor = color;
        g.shadowBlur = 4;
        for (let k = 0; k < 2; k++) {
          g.strokeStyle = k === 0 ? color : '#38bdf8';
          g.lineWidth = k === 0 ? 2 : 1.5;
          g.globalAlpha = k === 0 ? 0.95 : 0.65;
          g.beginPath();
          for (let x = 0; x <= W; x += 3) {
            const y = H / 2 + 8 + Math.sin(x / (14 + k * 8) + t * (2.2 + k * 0.8) + ph) * 28 * Math.cos(t * 0.4 + x * 0.01);
            if (x === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
        }
        g.shadowBlur = 0;
      } else if (v === 1) {
        // Mode 1: Three precision HUD arc gauges with digital readout
        for (let k = 0; k < 3; k++) {
          const cx = 42 + k * 86;
          const cy = 84;
          const val = 0.5 + 0.42 * Math.sin(t * 1.2 + k * 2.1 + ph);

          // Gauge track
          g.strokeStyle = 'rgba(255,255,255,0.15)';
          g.lineWidth = 5;
          g.beginPath(); g.arc(cx, cy, 26, Math.PI * 0.85, Math.PI * 2.15); g.stroke();

          // Active arc
          g.strokeStyle = color;
          g.lineWidth = 5;
          g.beginPath(); g.arc(cx, cy, 26, Math.PI * 0.85, Math.PI * 0.85 + Math.PI * 1.3 * val); g.stroke();

          // Value & Sub-label
          g.fillStyle = '#f8fafc';
          g.font = 'bold 13px monospace';
          g.textAlign = 'center';
          g.fillText(`${Math.round(val * 100)}%`, cx, cy + 4);
          g.fillStyle = color;
          g.font = '9px monospace';
          g.fillText(['PWR', 'PSI', 'TMP'][k], cx, cy + 22);
        }
        g.textAlign = 'left';
      } else if (v === 2) {
        // Mode 2: Animated Multi-Band Spectrum Waterfall Analyzer
        const numBars = 16;
        const bw = Math.floor((W - 24) / numBars) - 2;
        for (let k = 0; k < numBars; k++) {
          const val = Math.max(0.1, Math.min(1.0, Math.sin(t * 2.5 + k * 0.5 + ph) * 0.5 + 0.5 + Math.sin(t * 5 + k * 1.2) * 0.2));
          const bh = (H - 38) * val;
          const bx = 12 + k * (bw + 2);
          const by = H - 8 - bh;

          // Bar gradient
          g.fillStyle = color;
          g.globalAlpha = 0.85;
          g.fillRect(bx, by, bw, bh);

          // Peak hold dot
          g.fillStyle = '#ffffff';
          g.globalAlpha = 1;
          g.fillRect(bx, Math.max(22, by - 3), bw, 2);
        }
      } else {
        // Mode 3: Real-time Terminal Telemetry Stream
        const logs = [
          '> CORE_LINK: ESTABLISHED (0.4ms)',
          '> NAV_SAT // SYNC 101.4 GHz',
          '> THRUSTER VECTOR: STABLE',
          '> CABIN ATMOSPHERE: 101.3 kPa',
          '> POWER GRID A/B: BALANCED',
          '> ENCRYPTED PACKET: 0x8F94',
          '> BUFFER HEALTH: OPTIMAL',
        ];
        const off = Math.floor(t * 1.8 + ph);
        g.font = '10px monospace';
        for (let k = 0; k < 6; k++) {
          g.fillStyle = k === 5 ? '#f8fafc' : color;
          g.globalAlpha = 0.5 + (k / 5) * 0.5;
          g.fillText(logs[(off + k) % logs.length], 8, 36 + k * 16);
        }
      }
      g.globalAlpha = 1;
    };
    const ui = (kind: 'btn' | 'screen', color: string) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 128;
      const g = c.getContext('2d')!;
      let redraw: ((t: number) => void) | null = null;
      g.fillStyle = kind === 'btn' ? '#cfcdc6' : '#07130c';
      g.fillRect(0, 0, 256, 128);
      if (kind === 'btn') {
        const cols = ['#2c2d2f', '#e3b524', '#b8402e', '#2f5fa8'];
        for (let k = 0; k < 40; k++) {
          g.fillStyle = cols[Math.floor(Math.random() * 4)];
          g.fillRect(10 + (k % 10) * 24, 12 + Math.floor(k / 10) * 22, 16, 14);
        }
      } else {
        // live readout, redrawn in the render loop: each screen takes the next of four readouts
        const v = screenCount++ % 4;
        const ph = Math.random() * 10;
        redraw = (t: number) => drawScreen(g, v, color, t, ph);
        redraw(0);
      }
      const tx = new THREE.CanvasTexture(c);
      tx.colorSpace = THREE.SRGBColorSpace;
      if (redraw) {
        const draw = redraw;
        let last = -1;
        anim.push((t) => {
          const f = Math.floor(t * 15); // 15 fps is plenty for a monitor and cheap on the CPU
          if (f === last) return;
          last = f;
          draw(t);
          tx.needsUpdate = true;
        });
      }
      return new THREE.MeshBasicMaterial({ map: tx, toneMapped: false });
    };
    // wide=true: desk-front slice (full width, half height); otherwise a whole narrow rack front
    const rackMat = (wide = false) => {
      const t = (wide ? racks : rackFronts)[Math.floor(Math.random() * 4)].clone();
      t.needsUpdate = true;
      if (wide) {
        t.repeat.set(1, 0.5);
        t.offset.set(0, Math.random() < 0.5 ? 0 : 0.5);
      }
      return new THREE.MeshStandardMaterial({ map: t, color: 0x55585d, roughness: 0.55, metalness: 0.3 });
    };
    const prop = (grp: THREE.Group, x: number, z: number, ry: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      grp.add(g);
      return g;
    };
    // add circles at local offsets of a prop group (rotated by its yaw)
    const block = (g: THREE.Group, r: number, h: number, ...at: [number, number][]) =>
      at.forEach(([lx, lz]) => {
        const c = Math.cos(g.rotation.y);
        const sn = Math.sin(g.rotation.y);
        blockers.push({ x: g.position.x + lx * c + lz * sn, z: g.position.z - lx * sn + lz * c, r, h });
      });
    const lb = (g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material = panelGray) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(0.06, w / 3, h / 3, d / 3)), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    const lp = (g: THREE.Group, w: number, h: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z);
      m.rotation.x = rx;
      g.add(m);
    };
    const pipe = (grp: THREE.Object3D, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, r = 0.14, mat: THREE.Material = steel) => {
      const a = new THREE.Vector3(x1, y1, z1);
      const b = new THREE.Vector3(x2, y2, z2);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10), mat);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      grp.add(m);
    };
    const btnGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12);
    const btnMats = [0xb8402e, 0xe3b524, 0x3f9a5a, 0x2f5fa8, 0xe8e6de].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.2 }));
    // push-button (axis up by default, rx = PI/2 to face +z)
    const btn = (g: THREE.Object3D, x: number, y: number, z: number, k: number, rx = 0) => {
      const m = new THREE.Mesh(btnGeo, btnMats[k % btnMats.length]);
      m.position.set(x, y, z);
      m.rotation.x = rx;
      g.add(m);
    };
    // toggle switch: small base + lever
    const toggle = (g: THREE.Object3D, x: number, y: number, z: number, rx = 0) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.04), black);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), steel);
      l.position.y = 0.03;
      l.rotation.z = 0.3;
      const t = new THREE.Group();
      t.add(b, l);
      t.position.set(x, y, z);
      t.rotation.x = rx;
      g.add(t);
    };
    // workstation: desk, button panel, two screens, laptop on an arm (front = +z of the prop)
    const consoleDesk = (grp: THREE.Group, x: number, z: number, ry: number, color: number) => {
      const g = prop(grp, x, z, ry);
      const c = '#' + new THREE.Color(color).getHexString();
      lb(g, 1.8, 0.9, 0.8, 0, 0.45, 0, rackMat(true));
      lp(g, 1.7, 0.7, ui('btn', c), 0, 1.02, 0.12, -0.9);
      lb(g, 1.8, 0.04, 0.05, 0, 0.92, 0.42, blueMat);
      for (const sx of [-0.45, 0.45]) {
        lb(g, 0.84, 0.54, 0.05, sx, 1.65, -0.2, black);
        lp(g, 0.78, 0.48, ui('screen', c), sx, 1.65, -0.17, -0.15);
      }
      lb(g, 0.1, 0.7, 0.1, 0, 1.2, -0.25, steel);
      pipe(g, 0.85, 1.0, -0.1, 0.95, 1.9, 0.1, 0.02, steel);
      lb(g, 0.4, 0.02, 0.3, 0.95, 1.9, 0.2, black);
      for (let i = 0; i < 8; i++) btn(g, -0.7 + i * 0.2, 0.93, 0.37, i);
      for (const x of [-0.8, -0.65, 0.65, 0.8]) toggle(g, x, 0.92, 0.28);
      floorCable(g, cableMats[0]);
      floorCable(g, cableMats[2]);
      block(g, 0.6, 0.92, [-0.55, 0.1], [0, 0.1], [0.55, 0.1]);
    };
    const rack = (grp: THREE.Group, x: number, z: number, ry: number) => {
      const g = prop(grp, x, z, ry);
      lb(g, 1, 2.8, 0.8, 0, 1.4, 0);
      lp(g, 0.94, 2.7, rackMat(), 0, 1.4, 0.405);
      lb(g, 1.02, 0.04, 0.82, 0, 0.6, 0, blueMat);
      for (const dx of [-0.25, 0, 0.25]) pipe(g, dx, 2.8, -0.1, dx, 5.3, -0.1, 0.02, cableMats[dx ? 1 : 0]);
      for (let r = 0; r < 2; r++) for (let q = 0; q < 3; q++) btn(g, -0.25 + q * 0.25, 1.0 + r * 0.3, 0.42, r * 3 + q, Math.PI / 2);
      for (let i = 0; i < 4; i++) {
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), glow(i % 2 ? 0x57e389 : 0xe3b524, 1.2));
        led.position.set(-0.3 + i * 0.2, 1.8, 0.41);
        g.add(led);
      }
      toggle(g, -0.3, 2.1, 0.41, Math.PI / 2);
      toggle(g, 0.3, 2.1, 0.41, Math.PI / 2);
      floorCable(g, cableMats[1]);
      block(g, 0.55, 2.8, [-0.2, 0], [0.2, 0]);
    };
    // soft stowage bag with a strap
    const crate = (grp: THREE.Group, x: number, z: number, s: number, ry: number) => {
      const g = prop(grp, x, z, ry);
      const m = new THREE.Mesh(new RoundedBoxGeometry(s, s, s, 4, s * 0.15), new THREE.MeshStandardMaterial({ color: 0xe9e7df, roughness: 0.95 }));
      m.position.y = s / 2;
      g.add(m);
      lb(g, s + 0.02, 0.05, s + 0.02, 0, s * 0.7, 0, black);
      block(g, s * 0.75, s, [0, 0]);
    };
    // central workstation island: drum with rack panels, blue rail, gooseneck arm with laptop
    const island = (grp: THREE.Group, x: number, z: number) => {
      const t = racks[0].clone();
      t.needsUpdate = true;
      t.repeat.set(2, 0.34);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.0, 40), new THREE.MeshStandardMaterial({ map: t, color: 0x50535a, roughness: 0.5, metalness: 0.3 }));
      drum.position.set(x, 0.5, z);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.08, 40), panelGray);
      top.position.set(x, 1.04, z);
      const rl = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.04, 6, 48), blueMat);
      rl.rotation.x = Math.PI / 2;
      rl.position.set(x, 1.12, z);
      grp.add(drum, top, rl);
      blockers.push({ x, z, r: 1.4, h: 1.12 });
      // three stations: a laptop lying on the top plus a monitor on a clamped two-joint arm
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU + 0.4;
        const g = prop(grp, x + Math.sin(a) * 0.8, z + Math.cos(a) * 0.8, a);
        lb(g, 0.44, 0.025, 0.3, 0, 1.1, 0.12, black);
        const lid = new THREE.Group();
        lid.position.set(0, 1.115, -0.03);
        lid.rotation.x = -0.35;
        lb(lid, 0.44, 0.28, 0.015, 0, 0.14, 0, black);
        lp(lid, 0.4, 0.24, ui('screen', '#ffb347'), 0, 0.14, 0.009);
        g.add(lid);
        // stations 0 and 2 get a dual-monitor setup, station 1 a single monitor
        const duo = k !== 1;
        for (const mx of duo ? [-0.34, 0.34] : [0]) {
          lb(g, 0.09, 0.04, 0.09, mx, 1.12, -0.45, steel); // clamp
          pipe(g, mx, 1.12, -0.45, mx, 1.5, -0.45, 0.014, steel);
          pipe(g, mx, 1.5, -0.45, mx, 1.58, -0.2, 0.011, steel);
          const mon = new THREE.Group();
          mon.position.set(mx, 1.64, -0.17);
          mon.rotation.set(-0.1, duo ? -Math.sign(mx) * 0.25 : 0, 0);
          lb(mon, 0.6, 0.37, 0.03, 0, 0, 0, black);
          lp(mon, 0.55, 0.32, ui('screen', '#ffb347'), 0, 0, 0.017);
          g.add(mon);
        }
      }
    };
    // animated attract screen drawn per game
    const art = (g: CanvasRenderingContext2D, game: string, t: number, hex: string, title: string) => {
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, 256, 192);
      g.fillStyle = hex;
      if (game === 'snake') {
        for (let i = 0; i < 14; i++) g.fillRect(40 + i * 11, 70 + Math.sin(t * 3 - i * 0.5) * 22, 9, 9);
        g.fillRect(40 + ((t * 40) % 150), 140, 8, 8);
      } else if (game === 'pong') {
        const by = 96 + Math.sin(t * 2.2) * 50;
        g.fillRect(14, by - 20 + Math.sin(t * 2.2 + 0.3) * 8, 6, 40);
        g.fillRect(236, by - 20, 6, 40);
        g.fillRect(128 + Math.cos(t * 1.1) * 100, by, 8, 8);
        for (let y = 0; y < 192; y += 16) g.fillRect(127, y, 2, 8);
      } else if (game === 'breakout') {
        for (let r = 0; r < 4; r++) for (let q = 0; q < 8; q++) g.fillRect(14 + q * 29, 20 + r * 14, 25, 10);
        g.fillRect(100 + Math.sin(t * 1.5) * 70, 170, 50, 7);
        g.fillRect(124 + Math.sin(t * 1.5) * 70, 120 + Math.sin(t * 4) * 20, 7, 7);
      } else {
        g.fillStyle = '#2a2d33';
        g.fillRect(0, 0, 256, 192);
        g.fillStyle = hex;
        for (let y = -20; y < 192; y += 30) g.fillRect(126, ((y + t * 90) % 210) - 20, 4, 16);
        g.fillRect(112 + Math.sin(t * 1.3) * 60, 130, 30, 16);
      }
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(0, 0, 256, 38);
      g.fillStyle = hex;
      g.font = 'bold 24px monospace';
      g.textAlign = 'center';
      g.fillText(title, 128, 28);
      if (Math.floor(t * 2) % 2) {
        g.font = '14px monospace';
        g.fillText('PRESS E TO PLAY', 128, 182);
      }
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 0; y < 192; y += 3) g.fillRect(0, y, 256, 1);
    };
    const cabinet = (grp: THREE.Group, x: number, z: number, ry: number, title: string, color: number, game: string) => {
      const g = prop(grp, x, z, ry);
      const hex = '#' + new THREE.Color(color).getHexString();
      lb(g, 1, 2, 0.9, 0, 1, 0, black);
      // side art stripes
      for (const sx of [-0.505, 0.505]) lb(g, 0.012, 1.6, 0.7, sx, 1, 0, glow(color, 0.6));
      // animated screen, set slightly proud of the bezel
      const sc = document.createElement('canvas');
      sc.width = 256;
      sc.height = 192;
      const x2 = sc.getContext('2d')!;
      art(x2, game, 0, hex, title);
      const st = new THREE.CanvasTexture(sc);
      st.colorSpace = THREE.SRGBColorSpace;
      lb(g, 0.88, 0.7, 0.06, 0, 1.5, 0.44, black);
      lp(g, 0.8, 0.6, new THREE.MeshBasicMaterial({ map: st, toneMapped: false }), 0, 1.5, 0.48, -0.15);
      let last = 0;
      anim.push((t) => {
        if (t - last < 0.12) return;
        last = t;
        art(x2, game, t, hex, title);
        st.needsUpdate = true;
      });
      // lit marquee with the game title
      const mc2 = document.createElement('canvas');
      mc2.width = 256;
      mc2.height = 64;
      const m2 = mc2.getContext('2d')!;
      m2.fillStyle = hex;
      m2.fillRect(0, 0, 256, 64);
      m2.fillStyle = '#0b0b0c';
      m2.font = 'bold 34px sans-serif';
      m2.textAlign = 'center';
      m2.fillText(title, 128, 44, 240);
      const mt = new THREE.CanvasTexture(mc2);
      mt.colorSpace = THREE.SRGBColorSpace;
      lb(g, 0.96, 0.34, 0.28, 0, 2.1, 0.1, black);
      lp(g, 0.9, 0.225, new THREE.MeshBasicMaterial({ map: mt, toneMapped: false }), 0, 2.1, 0.245);
      // control deck: tilted panel, joystick, six buttons, start buttons
      const deck = lb(g, 0.96, 0.1, 0.5, 0, 0.98, 0.6, panelGray);
      deck.rotation.x = 0.2;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), steel);
      stick.position.set(-0.27, 1.08, 0.62);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), btnMats[0]);
      ball.position.set(-0.27, 1.15, 0.62);
      g.add(stick, ball);
      for (let i = 0; i < 6; i++) btn(g, -0.02 + (i % 3) * 0.1, 1.035 + 0.003, 0.56 + Math.floor(i / 3) * 0.1, i + 1);
      btn(g, 0.34, 1.035, 0.5, 4);
      btn(g, 0.4, 1.035, 0.5, 3);
      // coin door, speaker grille, floor plate
      lb(g, 0.3, 0.26, 0.03, 0, 0.45, 0.46, panelGray);
      lp(g, 0.1, 0.08, glow(0xe3b524, 1), 0, 0.5, 0.48);
      lb(g, 0.03, 0.1, 0.02, 0, 0.4, 0.48, black);
      for (let k = 0; k < 4; k++) lb(g, 0.5, 0.012, 0.02, 0, 1.92 - k * 0.025, 0.455, panelGray);
      for (const sx of [-0.5, 0.5]) lb(g, 0.04, 2, 0.04, sx, 1, 0.46, blueMat);
      block(g, 0.65, 2, [-0.25, 0.2], [0.25, 0.2]);
      things.push({ pos: new THREE.Vector3(x, 1.5, z), label: `Play ${title}`, action: () => setGame(game) });
    };

    // --- hub: round, domed, round skylight; doors N / E / W
    const hubG = new THREE.Group();
    hubG.userData.color = 0xe0a030;
    world.add(hubG);
    const D = Math.sqrt(100 - 9); // tunnel mouth distance from hub centre
    const DR = Math.sqrt(81 - 9); // same for the 9m rooms
    const signAt = [Math.PI / 2 + 0.5, (3 * Math.PI) / 2 + 0.5];
    neonNow = '#ffa73d';
    roundRoom(hubG, 0, 0, 10, [Math.PI / 2, (3 * Math.PI) / 2], [], 6);
    island(hubG, 0, 0);
    things.push({
      pos: new THREE.Vector3(0, 1.2, 0),
      label: 'Open Projects Archive',
      action: () => {
        const p = projectsRef.current[0] || (import.meta.env.PROD ? null : mockProjects[0]);
        if (p) openProject(p);
      },
    });
    const sign = (grp: THREE.Group, cx: number, cz: number, r: number, t: number, text: string) => {
      const [x, z, ry] = pol(cx, cz, r, t);
      place(grp, panel(text, '', 2.8, 0.8, '', '#ffa73d'), x, 2.6, z, ry);
    };
    sign(hubG, 0, 0, 9.85, signAt[0], 'ARCADE');
    sign(hubG, 0, 0, 9.85, signAt[1], 'COMMAND DECK');
    for (const t of [-0.45, 0.45]) consoleDesk(hubG, ...pol(0, 0, 8.9, t), 0xffb347);
    for (const t of [Math.PI - 0.7, Math.PI + 0.7]) rack(hubG, ...pol(0, 0, 9.2, t));
    crate(hubG, ...(pol(0, 0, 8.6, 1.0).slice(0, 2) as [number, number]), 1.2, 0.3);
    crate(hubG, ...(pol(0, 0, 8.7, 1.25).slice(0, 2) as [number, number]), 0.8, 0.9);
    crate(hubG, ...(pol(0, 0, 8.6, 5.3).slice(0, 2) as [number, number]), 1, -0.4);

    // --- east: Arcade (round room centred at x=27)
    const aboutG = new THREE.Group();
    aboutG.userData.color = 0xc8553d;
    world.add(aboutG);
    const AC = 27;
    neonNow = '#ffa73d';
    tunnel(aboutG, D, 0, AC - DR, 0);
    rects.push({ x1: 9, x2: 19, z1: -3, z2: 3 });
    roundRoom(aboutG, AC, 0, 9, [(3 * Math.PI) / 2], [[Math.PI / 2, 0.65]]);
    cabinet(aboutG, ...pol(AC, 0, 8.1, Math.PI - 0.45), 'SNAKE', 0x7fb069, 'snake');
    cabinet(aboutG, ...pol(AC, 0, 8.1, Math.PI), 'PONG', 0xe0a030, 'pong');
    cabinet(aboutG, ...pol(AC, 0, 8.1, Math.PI + 0.45), 'BREAKOUT', 0xc8553d, 'breakout');
    cabinet(aboutG, ...pol(AC, 0, 8.1, Math.PI - 0.9), 'PROJECT MAP', 0x4aa3df, 'drive');
    for (const t of [0.3, 0.65]) consoleDesk(aboutG, ...pol(AC, 0, 7.9, t), 0xe0a030);
    for (const t of [5.4, 5.75]) rack(aboutG, ...pol(AC, 0, 8.2, t));
    crate(aboutG, ...(pol(AC, 0, 7.5, 4.0).slice(0, 2) as [number, number]), 1, 0.5);

    // --- west: Command deck (round room centred at x=-27)
    const contactG = new THREE.Group();
    contactG.userData.color = 0x8fb85a;
    world.add(contactG);
    const CC = -27;
    neonNow = '#ffa73d';
    tunnel(contactG, -D, 0, CC + DR, 0);
    rects.push({ x1: -19, x2: -9, z1: -3, z2: 3 });
    roundRoom(contactG, CC, 0, 9, [Math.PI / 2], [[(3 * Math.PI) / 2, 0.7], [Math.PI, 0.3], [0, 0.3]]);
    island(contactG, CC, 0);
    things.push({
      pos: new THREE.Vector3(CC, 1.2, 0),
      label: 'Access Project Terminal',
      action: () => {
        const p = projectsRef.current[0] || (import.meta.env.PROD ? null : mockProjects[0]);
        if (p) openProject(p);
      },
    });
    for (const t of [0.6, 0.95, 2.1, 2.5, 3.72, 5.7]) consoleDesk(contactG, ...pol(CC, 0, 7.9, t), 0xffb347);

    // --- outside the windows: a moon to the west, drifting rocks to the east
    const mc = document.createElement('canvas');
    mc.width = 1024;
    mc.height = 512;
    const mx = mc.getContext('2d')!;

    // 1. Lunar regolith highland base
    mx.fillStyle = '#b0b5be';
    mx.fillRect(0, 0, 1024, 512);

    // Subtle surface dust variation
    for (let k = 0; k < 1200; k++) {
      mx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      mx.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
    }

    // 2. Dark volcanic basalt plains (Lunar Maria)
    const maria = [
      { x: 340, y: 220, rx: 140, ry: 95, rot: 0.1 },
      { x: 520, y: 190, rx: 110, ry: 80, rot: -0.2 },
      { x: 260, y: 320, rx: 90, ry: 60, rot: 0.3 },
      { x: 680, y: 260, rx: 130, ry: 75, rot: 0.15 },
      { x: 440, y: 340, rx: 80, ry: 50, rot: -0.1 },
    ];
    maria.forEach((m) => {
      mx.fillStyle = 'rgba(42, 46, 54, 0.78)';
      mx.beginPath();
      mx.ellipse(m.x, m.y, m.rx, m.ry, m.rot, 0, Math.PI * 2);
      mx.fill();
    });

    // 3. Realistic impact craters with lit rims and deep drop shadows
    const craters = [
      { x: 420, y: 240, r: 28 },
      { x: 580, y: 360, r: 38 }, // Tycho equivalent
      { x: 280, y: 160, r: 24 }, // Copernicus
      { x: 740, y: 180, r: 32 },
      { x: 160, y: 280, r: 20 },
      { x: 860, y: 320, r: 26 },
      { x: 490, y: 110, r: 22 },
    ];

    // Radial ejecta ray streaks (like Tycho's rays across the moon)
    craters.forEach((cr) => {
      if (cr.r >= 26) {
        mx.strokeStyle = 'rgba(255,255,255,0.22)';
        mx.lineWidth = 1.5;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
          mx.beginPath();
          mx.moveTo(cr.x + Math.cos(a) * cr.r, cr.y + Math.sin(a) * cr.r);
          mx.lineTo(cr.x + Math.cos(a) * (cr.r + 90 + Math.random() * 60), cr.y + Math.sin(a) * (cr.r + 90 + Math.random() * 60));
          mx.stroke();
        }
      }
    });

    // Draw crater bowls
    craters.forEach((cr) => {
      // Lit outer rim (sun from top-left)
      mx.fillStyle = 'rgba(255,255,255,0.85)';
      mx.beginPath(); mx.arc(cr.x - 2, cr.y - 2, cr.r, 0, Math.PI * 2); mx.fill();

      // Deep shadowed bowl
      mx.fillStyle = '#1c1f26';
      mx.beginPath(); mx.arc(cr.x + 2, cr.y + 2, cr.r * 0.9, 0, Math.PI * 2); mx.fill();

      // Sunlit interior floor
      mx.fillStyle = '#6e7480';
      mx.beginPath(); mx.arc(cr.x - 1, cr.y - 1, cr.r * 0.65, 0, Math.PI * 2); mx.fill();

      // Central peak
      mx.fillStyle = '#e2e8f0';
      mx.beginPath(); mx.arc(cr.x - 2, cr.y - 2, 2.5, 0, Math.PI * 2); mx.fill();
    });

    // 4. Hundreds of secondary micro-craters
    for (let k = 0; k < 350; k++) {
      const cx = Math.random() * 1024;
      const cy = Math.random() * 512;
      const cr = 2 + Math.random() * 6;
      mx.fillStyle = 'rgba(255,255,255,0.5)';
      mx.beginPath(); mx.arc(cx - 1, cy - 1, cr, 0, Math.PI * 2); mx.fill();
      mx.fillStyle = 'rgba(20,24,30,0.6)';
      mx.beginPath(); mx.arc(cx + 1, cy + 1, cr * 0.85, 0, Math.PI * 2); mx.fill();
    }
    const moon = new THREE.Mesh(new THREE.SphereGeometry(22, 48, 32), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(mc), roughness: 1, fog: false }));
    moon.position.set(-95, 8, 6);
    scene.add(moon);
    const rocks = Array.from({ length: 14 }, () => {
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + Math.random() * 3, 1), new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 1, flatShading: true }));
      r.position.set(45 + Math.random() * 60, (Math.random() - 0.3) * 30, (Math.random() - 0.5) * 70);
      scene.add(r);
      return r;
    });
    anim.push((t) => rocks.forEach((r, k) => { r.rotation.x = t * 0.05 * (k % 3 + 1); r.rotation.y = t * 0.04 * (k % 4 + 1); }));

    // --- player
    const pos = new THREE.Vector3(0, EYE, 6);    let yaw = 0;
    let pitch = 0;
    const keys: Record<string, boolean> = {};
    let isLocked = false;
    let active = false; // boarded: movement works even when the mouse is not locked (e.g. after Esc)
    const inside = (x: number, z: number) => circles.some((c) => (x - c.cx) ** 2 + (z - c.cz) ** 2 <= c.r * c.r) || rects.some((r) => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2);
    // fy = feet height; props lower than fy + 0.25 can be stepped or jumped onto
    const free = (x: number, z: number, fy = 0) =>
      inside(x - R, z - R) && inside(x + R, z - R) && inside(x - R, z + R) && inside(x + R, z + R) && !blockers.some((b) => b.h > fy + 0.25 && (x - b.x) ** 2 + (z - b.z) ** 2 < (b.r + R) ** 2);
    const support = (x: number, z: number) => blockers.reduce((m, b) => ((x - b.x) ** 2 + (z - b.z) ** 2 < b.r * b.r ? Math.max(m, b.h) : m), 0);

    let current: Interactable | null = null;
    const onKey = (e: KeyboardEvent) => {
      stationAudio.resume();
      if (e.type === 'keydown' && (gameRef.current || activeProjectRef.current)) return; // the arcade or project modal owns the keyboard
      keys[e.code] = e.type === 'keydown';
      if (active && e.code === 'Space') e.preventDefault();
      if (e.type === 'keydown' && e.code === 'KeyE') want.current.act = true;
    };
    const onMouse = (e: MouseEvent) => {
      if (!isLocked) return;
      yaw -= e.movementX * 0.002;
      pitch = Math.max(-1.4, Math.min(1.4, pitch - e.movementY * 0.002));
    };
    const onLock = () => {
      isLocked = document.pointerLockElement === renderer.domElement;
      setLocked(isLocked);
    };
    const doLock = () => {
      active = true;
      setStarted(true);
      stationAudio.resume();
      if (touch) {
        isLocked = true;
        setLocked(true);
      } else (renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => {});
    };
    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('resize', onResize);
    document.addEventListener('pointerlockchange', onLock);
    renderer.domElement.addEventListener('click', () => !touch && doLock());
    // exposed so the start overlay can lock too
    (mount as HTMLDivElement & { lock?: () => void }).lock = doLock;

    const clock = new THREE.Clock();
    const fwd = new THREE.Vector3();
    let vy = 0;
    let jumpH = 0;
    let raf = 0;
    let lastPrompt = '';
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (active && !gameRef.current) {
        const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.current.y;
        const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.current.x;
        const len = Math.max(1, Math.hypot(f, s));
        yaw -= look.current.x * 0.005;
        pitch = Math.max(-1.4, Math.min(1.4, pitch - look.current.y * 0.005));
        look.current.x = look.current.y = 0;
        const sup = support(pos.x, pos.z);
        if ((keys.Space || want.current.jump) && jumpH <= sup + 0.01) vy = 5.6;
        vy -= 14 * dt;
        jumpH += vy * dt;
        if (jumpH <= sup) {
          jumpH = sup;
          vy = 0;
        }
        const sp = (keys.ShiftLeft ? 7 : 4) * dt;
        const dx = ((-Math.sin(yaw) * f + Math.cos(yaw) * s) / len) * sp;
        const dz = ((-Math.cos(yaw) * f - Math.sin(yaw) * s) / len) * sp;
        const movedX = free(pos.x + dx, pos.z, jumpH);
        const movedZ = free(pos.x, pos.z + dz, jumpH);
        if (movedX) pos.x += dx;
        if (movedZ) pos.z += dz;
        pos.y = EYE + jumpH + (vy === 0 && (f || s) ? Math.sin(t * 9) * 0.03 : 0);

        // Walking footsteps audio
        if (vy === 0 && jumpH <= sup + 0.05 && (Math.abs(f) > 0.1 || Math.abs(s) > 0.1) && (movedX || movedZ)) {
          stationAudio.playFootstep(Boolean(keys.ShiftLeft));
        }
      }
      camera.position.copy(pos);
      camera.rotation.set(pitch, yaw, 0);
      planet.rotation.y += dt * 0.02;
      anim.forEach((f) => f(t));

      camera.getWorldDirection(fwd);
      current = null;
      let best = 4.5;
      for (const th of things) {
        const dx = th.pos.x - pos.x;
        const dz = th.pos.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d < best && (dx * fwd.x + dz * fwd.z) / (d || 1) > 0.5) {
          best = d;
          current = th;
        }
      }
      const p = current ? current.label : '';
      if (want.current.act && current && active && !gameRef.current) current.action();
      want.current.act = false;
      if (p !== lastPrompt) setPrompt((lastPrompt = p));
      renderer.render(scene, camera);
    };
    loop();
    setBuilt(true);

    return () => {
      cancelAnimationFrame(raf);
      stationAudio.stop();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onLock);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black text-white">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
      {locked && <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 pointer-events-none" />}
      {prompt && (
        <div
          className="absolute z-20 bottom-28 sm:bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-black/90 border-2 border-amber-400 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.5)] active:scale-95 active:bg-amber-400/20 transition-all text-xs sm:text-sm font-mono font-bold tracking-wider select-none cursor-pointer flex items-center gap-2 whitespace-nowrap"
          onPointerDown={(e) => {
            e.stopPropagation();
            want.current.act = true;
          }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span>{touch ? `TAP: ${prompt}` : `PRESS E: ${prompt}`}</span>
        </div>
      )}
      {touch && locked && !game && (
        <>
          {/* fixed joystick: always visible, bottom left */}
          <div
            className="absolute left-6 bottom-8 w-32 h-32 rounded-full border-2 border-amber-300/50 bg-black/30 touch-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              moveStick(e);
            }}
            onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && moveStick(e)}
            onPointerUp={resetStick}
            onPointerCancel={resetStick}
          >
            <div ref={knob} className="absolute left-1/2 top-1/2 -ml-6 -mt-6 w-12 h-12 rounded-full bg-amber-300/60 pointer-events-none" />
          </div>
          <div
            className="absolute right-0 top-0 w-1/2 h-full touch-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              stick.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
              look.current.x += e.clientX - stick.current.x;
              look.current.y += e.clientY - stick.current.y;
              stick.current = { x: e.clientX, y: e.clientY };
            }}
          />
          <button
            className="absolute right-6 bottom-10 w-20 h-20 rounded-full bg-amber-300/25 border-2 border-amber-300/60 text-sm touch-none select-none"
            onPointerDown={() => (want.current.jump = true)}
            onPointerUp={() => (want.current.jump = false)}
            onPointerCancel={() => (want.current.jump = false)}
          >
            Jump
          </button>
        </>
      )}
      {game && (
        <Arcade
          game={game}
          projects={projects}
          onExit={exitGame}
        />
      )}
      <ProjectMenuModal
        project={activeProject}
        projects={projects.length ? projects : (import.meta.env.PROD ? [] : mockProjects)}
        isOpen={Boolean(activeProject && !game)}
        onClose={closeProject}
        onSelectProject={setActiveProject}
      />
      {started && !game && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-black/75 backdrop-blur px-3 py-1.5 text-xs font-mono text-amber-300 hover:bg-amber-400/20 hover:border-amber-400 transition cursor-pointer shadow-lg"
            onClick={() => {
              const muted = stationAudio.toggleMute();
              setIsMuted(muted);
            }}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Audio ON'}</span>
          </button>

          <button
            className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/75 backdrop-blur px-3.5 py-1.5 text-xs font-mono text-amber-300 hover:bg-amber-400/20 hover:border-amber-400 transition cursor-pointer shadow-lg"
            onClick={() => {
              const p = projects[0] || (import.meta.env.PROD ? null : mockProjects[0]);
              if (p) openProject(p);
            }}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Projects ({projects.length})</span>
          </button>
        </div>
      )}
      {!(built && projectsDone) && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black px-6 text-center">
          <p className="text-xs uppercase tracking-[0.5em] text-amber-300/80">Emilio&apos;s Station</p>
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-300 transition-all duration-500"
              style={{ width: `${10 + (built ? 45 : 0) + (projectsDone ? 45 : 0)}%` }}
            />
          </div>
          <p className="text-sm text-white/60">{!built ? 'Building the station…' : 'Loading projects…'}</p>
        </div>
      )}
      {!started && !game && (
        <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_center,rgba(10,10,12,0.72),rgba(0,0,0,0.95))] px-6 py-10">
          <div className="w-full max-w-xl text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.5em] text-amber-300/80">Interactive portfolio</p>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">Emilio&apos;s Station</h1>
            <p className="mt-4 text-white/70">Walk the station, play the arcade, and drive the map to explore my projects.</p>
            <button
              className="mt-8 rounded-full border border-amber-300 bg-amber-300/10 px-10 py-3 text-lg font-semibold text-amber-200 shadow-[0_0_30px_rgba(255,167,61,0.25)] transition hover:bg-amber-300/25 cursor-pointer"
              onClick={() => (mountRef.current as (HTMLDivElement & { lock?: () => void }) | null)?.lock?.()}
            >
              {touch ? 'Tap to board' : 'Click to board'}
            </button>
          </div>
        </div>
      )}
      {started && !locked && !game && !touch && (
        <button
          className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-amber-300/60 bg-black/70 px-5 py-2 text-sm text-amber-200"
          onClick={() => (mountRef.current as (HTMLDivElement & { lock?: () => void }) | null)?.lock?.()}
        >
          Click to look around (WASD still works)
        </button>
      )}
    </div>
  );
};

export default Station;
