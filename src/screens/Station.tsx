import { getProjects } from '@/cms/sanityClient';
import Arcade from '@/components/custom/Arcade';
import { Project } from '@/types/Project';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
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
  ctx.fillStyle = light ? '#efeee8' : '#14110c';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, c.width - 24, c.height - 24);
  ctx.fillStyle = light ? '#15171a' : accent;
  ctx.font = 'bold 64px sans-serif';
  wrap(ctx, title, 50, 105, c.width - 100, 70, 2);
  ctx.fillStyle = '#d6d0c4';
  ctx.font = '36px sans-serif';
  wrap(ctx, body, 50, 215, c.width - 100, 48, Math.floor((c.height - 300) / 48));
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(footer, 50, c.height - 40);
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
  const navigate = useNavigate();
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
  const [projects, setProjects] = useState<Project[]>([]);
  const openProject = useCallback((p: Project) => navigate(`/projects/${p.id}`, { state: { project: p } }), [navigate]);
  const gameRef = useRef<string | null>(null);
  gameRef.current = game;
  // leaving a game re-locks the mouse straight away (runs inside the key press, so the browser allows it)
  const exitGame = useCallback(() => {
    setGame(null);
    (mountRef.current as (HTMLDivElement & { lock?: () => void }) | null)?.lock?.();
  }, []);

  useEffect(() => {
    const giveUp = setTimeout(() => setProjectsDone(true), 6000); // never hang on a slow CMS
    getProjects()
      .then(setProjects)
      .catch(() => {})
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
    pc.width = 512;
    pc.height = 256;
    const px = pc.getContext('2d')!;
    const grad = px.createLinearGradient(0, 0, 0, 256);
    ['#6b3420', '#b5653a', '#8c4a2b', '#d9a06a', '#9a5532', '#4a2416'].forEach((c, k, a) => grad.addColorStop(k / (a.length - 1), c));
    px.fillStyle = grad;
    px.fillRect(0, 0, 512, 256);
    for (let k = 0; k < 400; k++) {
      px.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
      px.beginPath();
      px.ellipse(Math.random() * 512, Math.random() * 256, 10 + Math.random() * 70, 2 + Math.random() * 8, 0, 0, 7);
      px.fill();
    }
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(28, 64, 48),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(pc), roughness: 1, fog: false }),
    );
    planet.position.set(-30, 60, -60);
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(31, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0xff9d5c, transparent: true, opacity: 0.12, side: THREE.BackSide, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }),
    );
    atmo.position.copy(planet.position);
    scene.add(planet, atmo);
    const sun = new THREE.DirectionalLight(0xffffff, 3);
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
    const rackTex = (seed: number, narrow = false) => {
      const S = 1024;
      const WD = narrow ? 360 : S; // narrow = one column, matches a 0.94 x 2.7 m rack front
      const c = document.createElement('canvas');
      c.width = WD;
      c.height = S;
      const g = c.getContext('2d')!;
      let rs = seed * 7919 + 13;
      const rnd = () => ((rs = (rs * 9301 + 49297) % 233280) / 233280);
      const label = () => LABELS[Math.floor(rnd() * LABELS.length)];
      const cell = (x: number, y: number, w: number, h: number) => {
        g.fillStyle = ['#dcdad3', '#d2d0c9', '#e5e3dd', '#cbcac4'][Math.floor(rnd() * 4)];
        g.fillRect(x, y, w, h);
        g.strokeStyle = '#6a6b68';
        g.lineWidth = 3;
        g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
        for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[x, 0, x + 16, 0, x, y, 16, h], [x + w, 0, x + w - 16, 0, x + w - 16, y, 16, h], [0, y, 0, y + 16, x, y, w, 16], [0, y + h, 0, y + h - 16, x, y + h - 16, w, 16]]) {
          const gr = g.createLinearGradient(x0, y0, x1, y1);
          gr.addColorStop(0, 'rgba(0,0,0,0.32)');
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr;
          g.fillRect(rx, ry, rw, rh);
        }
        g.strokeStyle = 'rgba(255,255,255,0.55)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x + 4, y + 5);
        g.lineTo(x + w - 4, y + 5);
        g.stroke();
        g.fillStyle = '#85867f';
        for (const [sx, sy] of [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]]) {
          g.beginPath();
          g.arc(x + sx, y + sy, 4, 0, 7);
          g.fill();
        }
        let t = Math.floor(rnd() * 9);
        if (t === 7 && rnd() < 0.7) t = 3;
        const ix = x + 18;
        const iy = y + 18;
        const iw = w - 36;
        const ih = h - 36;
        if (t === 0) {
          const n = Math.max(1, Math.min(4, Math.floor(iw / 110)));
          for (let i = 0; i < n; i++) {
            const cx = ix + (iw * (i + 0.5)) / n;
            const cy = iy + ih * 0.45;
            const r = Math.max(4, Math.min(ih * 0.38, iw / n / 2.3));
            g.fillStyle = '#2a2a2b';
            g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
            g.fillStyle = '#f2f0e8';
            g.beginPath(); g.arc(cx, cy, r * 0.82, 0, 7); g.fill();
            g.strokeStyle = '#222';
            g.lineWidth = 1.5;
            for (let k = 0; k < 9; k++) {
              const a = Math.PI * 0.8 + (k / 8) * Math.PI * 1.4;
              g.beginPath();
              g.moveTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6);
              g.lineTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
              g.stroke();
            }
            const a = Math.PI * 0.8 + rnd() * Math.PI * 1.4;
            g.lineWidth = 2.5;
            g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7); g.stroke();
            g.fillStyle = '#222';
            g.font = '13px sans-serif';
            g.textAlign = 'center';
            g.fillText(label(), cx, cy + r + 17);
          }
        } else if (t === 1) {
          const rows = Math.max(1, Math.min(4, Math.floor(ih / 38)));
          const cols = Math.max(2, Math.floor(iw / 30));
          for (let r = 0; r < rows; r++)
            for (let q = 0; q < cols; q++) {
              const sx = ix + q * 30;
              const sy = iy + r * 38;
              g.fillStyle = rnd() > 0.85 ? '#e3b524' : '#2c2d2f';
              g.fillRect(sx, sy, 18, 26);
              g.fillStyle = '#d8d8d4';
              g.fillRect(sx + 6, sy + (rnd() > 0.5 ? 2 : 14), 6, 10);
            }
        } else if (t === 2) {
          for (let r = 0; r * 38 < ih - 20; r++)
            for (let q = 0; q * 38 < iw - 20; q++) {
              const cx = ix + 16 + q * 38;
              const cy = iy + 16 + r * 38;
              g.fillStyle = '#36383b'; g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.fill();
              g.fillStyle = '#b79b4a'; g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.fill();
              g.fillStyle = '#111'; g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
            }
        } else if (t === 3) {
          g.fillStyle = '#f4f3ee';
          g.fillRect(ix, iy, iw, ih);
          g.strokeStyle = '#222';
          g.lineWidth = 2;
          g.strokeRect(ix, iy, iw, ih);
          g.fillStyle = '#16181b';
          g.font = `bold ${Math.max(14, Math.min(40, ih * 0.4))}px sans-serif`;
          g.textAlign = 'center';
          g.fillText(label(), ix + iw / 2, iy + ih * 0.55, iw - 10);
        } else if (t === 4) {
          g.fillStyle = '#38393b';
          g.fillRect(ix, iy, iw, ih);
          g.fillStyle = '#121213';
          for (let yy = iy + 6; yy < iy + ih - 4; yy += 9) g.fillRect(ix + 8, yy, iw - 16, 3);
        } else if (t === 5) {
          g.fillStyle = '#17181a';
          g.fillRect(ix, iy, iw, ih);
          g.fillStyle = '#08150d';
          g.fillRect(ix + 8, iy + 8, iw - 16, ih - 16);
          g.fillStyle = '#5fe08a';
          g.font = '13px monospace';
          g.textAlign = 'left';
          for (let yy = iy + 26; yy < iy + ih - 8; yy += 16) g.fillText(label() + ' ' + Math.floor(rnd() * 9999), ix + 14, yy);
        } else if (t === 6) {
          g.fillStyle = '#1b1c1e';
          for (const hx of [ix + iw * 0.2, ix + iw * 0.6]) {
            g.beginPath();
            g.roundRect(hx, iy + ih * 0.3, iw * 0.2, ih * 0.22, 8);
            g.fill();
          }
          g.fillStyle = '#2f3032';
          for (const fx of [ix + 10, ix + iw - 10]) { g.beginPath(); g.arc(fx, iy + ih * 0.75, 11, 0, 7); g.fill(); g.fillStyle = '#9a9b97'; g.fillRect(fx - 7, iy + ih * 0.75 - 1.5, 14, 3); g.fillStyle = '#2f3032'; }
        } else if (t === 7) {
          g.fillStyle = '#e3b524';
          g.fillRect(ix, iy, Math.min(iw, ih * 1.5), ih);
          g.fillStyle = '#111';
          g.beginPath();
          g.moveTo(ix + 40, iy + 10); g.lineTo(ix + 70, iy + 60); g.lineTo(ix + 10, iy + 60); g.closePath(); g.fill();
          g.font = 'bold 28px sans-serif';
          g.textAlign = 'left';
          g.fillText('!', ix + 34, iy + 54);
          g.font = 'bold 13px sans-serif';
          g.fillText('WARNING', ix + 84, iy + 28);
          g.font = '11px sans-serif';
          g.fillText(label(), ix + 84, iy + 46);
        } else {
          g.fillStyle = '#2f5fa8';
          g.fillRect(ix, iy + ih * 0.25, iw, ih * 0.5);
          g.fillStyle = '#f2f2f0';
          g.font = `bold ${Math.max(12, Math.min(30, ih * 0.3))}px sans-serif`;
          g.textAlign = 'center';
          g.fillText(label(), ix + iw / 2, iy + ih * 0.58, iw - 10);
        }
      };
      let y = 0;
      while (y < S) {
        let h = Math.min([128, 160, 192, 256][Math.floor(rnd() * 4)], S - y);
        if (S - y - h < 110) h = S - y; // no sliver rows
        const cols = narrow || rnd() < 0.3 ? 1 : rnd() < 0.6 ? 2 : 3;
        for (let q = 0; q < cols; q++) cell((WD / cols) * q, y, WD / cols, h);
        if (rnd() < 0.5) {
          g.fillStyle = '#2f5fa8';
          g.fillRect(0, y + h - 7, WD, 7);
        }
        y += h;
      }
      for (let k = 0; k < 260; k++) {
        g.fillStyle = `rgba(45,38,28,${rnd() * 0.06})`;
        g.fillRect(rnd() * WD, rnd() * S, 2 + rnd() * 3, 20 + rnd() * 140);
      }
      return toTex(c);
    };
    const racks = [1, 2, 3, 4].map((n) => rackTex(n));
    const rackFronts = [5, 6, 7, 8].map((n) => rackTex(n, true));
    // dark gray wall panels with neon-lit seams; [colour map, emissive map] cached per neon colour
    const panelCache = new Map<string, THREE.CanvasTexture[]>();
    const panelTex = (neon: string) => {
      const hit = panelCache.get(neon);
      if (hit) return hit;
      const mk = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        return c;
      };
      const a = mk();
      const g = a.getContext('2d')!;
      g.fillStyle = '#1b1d21';
      g.fillRect(0, 0, 512, 512);
      for (let k = 0; k < 3500; k++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
        g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
      }
      g.strokeStyle = '#0b0c0e';
      g.lineWidth = 8;
      g.strokeRect(4, 4, 504, 504);
      g.beginPath();
      g.moveTo(256, 0); g.lineTo(256, 512);
      g.stroke();
      g.fillStyle = '#2b2e33';
      for (const x of [26, 230, 282, 486]) for (const y of [26, 486]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
      const e = mk();
      const h = e.getContext('2d')!;
      h.fillStyle = '#000';
      h.fillRect(0, 0, 512, 512);
      h.fillStyle = neon;
      for (const [y, hh] of [[120, 14], [176, 8]]) {
        h.globalAlpha = 0.2;
        h.fillRect(0, y - 14, 512, hh + 28);
        h.globalAlpha = 1;
        h.fillRect(0, y, 512, hh);
      }
      return [toTex(a), toTex(e)];
    };
    const floorTexs = (() => {
      const mk = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        return c;
      };
      const a = mk();
      const g = a.getContext('2d')!;
      g.fillStyle = '#1d1f23';
      g.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 2500; k++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`;
        g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
      const e = mk();
      const h = e.getContext('2d')!;
      h.fillStyle = '#000';
      h.fillRect(0, 0, 256, 256);
      h.strokeStyle = '#ff9a3a';
      h.globalAlpha = 0.25;
      h.lineWidth = 10;
      h.strokeRect(0, 0, 256, 256);
      h.globalAlpha = 0.9;
      h.lineWidth = 3;
      h.strokeRect(0, 0, 256, 256);
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
    const ui = (kind: 'btn' | 'screen', color: string) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 128;
      const g = c.getContext('2d')!;
      g.fillStyle = kind === 'btn' ? '#cfcdc6' : '#07130c';
      g.fillRect(0, 0, 256, 128);
      if (kind === 'btn') {
        const cols = ['#2c2d2f', '#e3b524', '#b8402e', '#2f5fa8'];
        for (let k = 0; k < 40; k++) {
          g.fillStyle = cols[Math.floor(Math.random() * 4)];
          g.fillRect(10 + (k % 10) * 24, 12 + Math.floor(k / 10) * 22, 16, 14);
        }
      } else {
        g.strokeStyle = color;
        g.lineWidth = 2;
        g.beginPath();
        for (let x = 0; x < 256; x += 8) g.lineTo(x, 64 + Math.sin(x / 20) * 30 + (Math.random() - 0.5) * 20);
        g.stroke();
        g.fillStyle = color;
        g.globalAlpha = 0.6;
        for (let k = 0; k < 12; k++) g.fillRect(8 + k * 20, 128 - Math.random() * 40, 12, 40);
      }
      const tx = new THREE.CanvasTexture(c);
      tx.colorSpace = THREE.SRGBColorSpace;
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
    for (const t of [0.6, 0.95, 2.1, 2.5, 3.72, 5.7]) consoleDesk(contactG, ...pol(CC, 0, 7.9, t), 0xffb347);

    // --- outside the windows: a moon to the west, drifting rocks to the east
    const mc = document.createElement('canvas');
    mc.width = 256;
    mc.height = 128;
    const mx = mc.getContext('2d')!;
    mx.fillStyle = '#9ca3af';
    mx.fillRect(0, 0, 256, 128);
    for (let k = 0; k < 120; k++) {
      mx.fillStyle = `rgba(30,35,45,${Math.random() * 0.35})`;
      mx.beginPath();
      mx.arc(Math.random() * 256, Math.random() * 128, 3 + Math.random() * 14, 0, 7);
      mx.fill();
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
    const pos = new THREE.Vector3(0, EYE, 6);
    let yaw = 0;
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
      if (e.type === 'keydown' && gameRef.current) return; // the arcade owns the keyboard while it is open
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
      if (!isLocked && gameRef.current) setGame(null); // Esc while playing leaves the game
    };
    const doLock = () => {
      active = true;
      setStarted(true);
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
        if (free(pos.x + dx, pos.z, jumpH)) pos.x += dx;
        if (free(pos.x, pos.z + dz, jumpH)) pos.z += dz;
        pos.y = EYE + jumpH + (vy === 0 && (f || s) ? Math.sin(t * 9) * 0.03 : 0);
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
          className="absolute z-10 bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded bg-black/70 border border-amber-500 text-amber-300"
          onPointerDown={() => (want.current.act = true)}
        >
          {touch ? `Tap: ${prompt}` : `Press E: ${prompt}`}
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
      {game && <Arcade game={game} projects={projects} onOpen={openProject} onExit={exitGame} />}
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
              className="mt-8 rounded-full border border-amber-300 bg-amber-300/10 px-10 py-3 text-lg font-semibold text-amber-200 shadow-[0_0_30px_rgba(255,167,61,0.25)] transition hover:bg-amber-300/25"
              onClick={() => (mountRef.current as (HTMLDivElement & { lock?: () => void }) | null)?.lock?.()}
            >
              {touch ? 'Tap to board' : 'Click to board'}
            </button>
            <div className="mt-10 grid grid-cols-2 gap-3 text-left text-sm sm:grid-cols-3">
              {(touch
                ? [['Left stick', 'Move'], ['Drag right side', 'Look around'], ['Jump button', 'Jump'], ['Tap the prompt', 'Interact']]
                : [['W A S D', 'Move'], ['Mouse', 'Look around'], ['Space', 'Jump'], ['Shift', 'Sprint'], ['E', 'Interact'], ['Esc', 'Release mouse']]
              ).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="font-mono text-amber-200">{k}</div>
                  <div className="text-white/60">{v}</div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs text-white/40">Arcade is east of the hub, command deck is west.</p>
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
