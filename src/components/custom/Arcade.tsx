import React, { useEffect, useRef, useState } from 'react';
import { Project } from '@/types/Project';
import { getProjectImageUrl } from '@/lib/projectUtils';
import stationAudio from '@/lib/stationAudio';
import { Maximize, Minimize } from 'lucide-react';

type Ctx = { projects: Project[]; open: (p: Project) => void };
type Game = {
  act?: () => void;
  onKeyDown?: (code: string) => boolean;
  onClick?: (cx: number, cy: number) => void;
  step: (dt: number) => void;
  draw: (c: CanvasRenderingContext2D) => void;
  score: () => string;
  over: () => boolean;
  isMenuOpen?: () => boolean;
  getNearProject?: () => string | null;
};
type Keys = Set<string>;

const up = (k: Keys) => k.has('ArrowUp') || k.has('KeyW');
const down = (k: Keys) => k.has('ArrowDown') || k.has('KeyS');
const left = (k: Keys) => k.has('ArrowLeft') || k.has('KeyA');
const right = (k: Keys) => k.has('ArrowRight') || k.has('KeyD');
const driftKey = (k: Keys) => k.has('Space') || k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyX');

const neon = (c: CanvasRenderingContext2D, color: string, blur = 12) => {
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = blur;
};

// Global image cache for canvas rendering
const imageCache = new Map<string, HTMLImageElement>();
function getOrLoadImage(id: string, url: string | null): HTMLImageElement | null {
  if (!url) return null;
  if (imageCache.has(id)) {
    return imageCache.get(id)!;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  imageCache.set(id, img);
  return img;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 6
) {
  const words = text.split(' ');
  let line = '';
  let linesDrawn = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, y + linesDrawn * lineHeight);
      line = words[i] + ' ';
      linesDrawn++;
      if (linesDrawn >= maxLines) {
        if (i < words.length - 1) {
          ctx.fillText(line.trim() + '…', x, y + linesDrawn * lineHeight);
        }
        return;
      }
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, y + linesDrawn * lineHeight);
  }
}

// ============================================================================
// GAME 1: SNAKE (Dynamic Fullscreen & Mobile Safe Area)
// ============================================================================
const snake = (k: Keys, _ctx: Ctx, getDims: () => { W: number; H: number; touch: boolean }): Game => {
  const C = 24;
  let s = [{ x: 8, y: 8 }];
  let d = { x: 1, y: 0 };
  let f = { x: 4, y: 4 };
  let t = 0;
  let dead = false;
  let score = 0;

  return {
    score: () => String(score),
    over: () => dead,
    act: () => {
      if (dead) {
        s = [{ x: 8, y: 8 }];
        d = { x: 1, y: 0 };
        f = { x: 4, y: 4 };
        dead = false;
        score = 0;
      }
    },
    onClick: (cx, cy) => {
      if (dead) {
        s = [{ x: 8, y: 8 }];
        d = { x: 1, y: 0 };
        f = { x: 4, y: 4 };
        dead = false;
        score = 0;
        return;
      }
      const hx = s[0].x * C + C / 2;
      const hy = s[0].y * C + C / 2;
      const dx = cx - hx;
      const dy = cy - hy;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && d.x !== -1) d = { x: 1, y: 0 };
        else if (dx < 0 && d.x !== 1) d = { x: -1, y: 0 };
      } else {
        if (dy > 0 && d.y !== -1) d = { x: 0, y: 1 };
        else if (dy < 0 && d.y !== 1) d = { x: 0, y: -1 };
      }
    },
    step(dt) {
      const { W, H, touch } = getDims();
      const bottomSafe = touch ? 140 : 20;
      const cols = Math.max(8, Math.floor(W / C));
      const rows = Math.max(8, Math.floor((H - bottomSafe) / C));

      if (up(k) && d.y !== 1) d = { x: 0, y: -1 };
      else if (down(k) && d.y !== -1) d = { x: 0, y: 1 };
      else if (left(k) && d.x !== 1) d = { x: -1, y: 0 };
      else if (right(k) && d.x !== -1) d = { x: 1, y: 0 };

      t += dt;
      if (t < 0.08 || dead) return;
      t = 0;

      const h = { x: s[0].x + d.x, y: s[0].y + d.y };
      if (h.x < 0 || h.y < 0 || h.x >= cols || h.y >= rows || s.some((p) => p.x === h.x && p.y === h.y)) {
        dead = true;
        return;
      }
      s.unshift(h);
      if (h.x === f.x && h.y === f.y) {
        score++;
        stationAudio.playCoinPickup();
        f = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      } else s.pop();
    },
    draw(c) {
      neon(c, '#f43f5e');
      c.fillRect(f.x * C + 3, f.y * C + 3, C - 6, C - 6);
      neon(c, '#34d399');
      s.forEach((p) => c.fillRect(p.x * C + 1, p.y * C + 1, C - 2, C - 2));
    },
  };
};

// ============================================================================
// GAME 2: PONG (Touch Drag & Fullscreen)
// ============================================================================
const pong = (k: Keys, _ctx: Ctx, getDims: () => { W: number; H: number }): Game => {
  let py = 200;
  let ay = 200;
  let sc = [0, 0];
  let b = { x: 300, y: 200, vx: 340, vy: 160 };

  const serve = (dir: number) => {
    const { W, H } = getDims();
    b = { x: W / 2, y: H / 2, vx: 340 * dir, vy: (Math.random() - 0.5) * 320 };
  };

  return {
    score: () => `${sc[0]} - ${sc[1]}`,
    over: () => sc[0] >= 7 || sc[1] >= 7,
    act: () => {
      if (sc[0] >= 7 || sc[1] >= 7) {
        sc = [0, 0];
        serve(1);
      }
    },
    onClick: (_cx, cy) => {
      const { H } = getDims();
      const P = Math.max(70, Math.min(130, H * 0.22));
      py = Math.max(0, Math.min(H - P, cy - P / 2));
    },
    step(dt) {
      if (this.over()) return;
      const { W, H } = getDims();
      const P = Math.max(70, Math.min(130, H * 0.22));

      py = Math.max(0, Math.min(H - P, py + ((down(k) ? 1 : 0) - (up(k) ? 1 : 0)) * 460 * dt));
      ay = Math.max(0, Math.min(H - P, ay + Math.sign(b.y - P / 2 - ay) * Math.min(300 * dt, Math.abs(b.y - P / 2 - ay))));

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.y < 8 || b.y > H - 8) b.vy *= -1;

      // Left paddle
      if (b.vx < 0 && b.x < 36 && b.x > 14 && b.y > py && b.y < py + P) {
        b.vx = Math.abs(b.vx) * 1.05;
        b.vy = (b.y - (py + P / 2)) * 8;
        stationAudio.playDriftScreech(0.4);
      }
      // Right paddle
      if (b.vx > 0 && b.x > W - 36 && b.x < W - 14 && b.y > ay && b.y < ay + P) {
        b.vx = -Math.abs(b.vx) * 1.05;
        b.vy = (b.y - (ay + P / 2)) * 8;
        stationAudio.playDriftScreech(0.4);
      }

      if (b.x < 0) {
        sc[1]++;
        stationAudio.playCarBump();
        serve(1);
      }
      if (b.x > W) {
        sc[0]++;
        stationAudio.playCoinPickup();
        serve(-1);
      }
    },
    draw(c) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      const P = Math.max(70, Math.min(130, H * 0.22));

      c.strokeStyle = 'rgba(255,255,255,0.12)';
      c.lineWidth = 2;
      c.setLineDash([12, 12]);
      c.beginPath();
      c.moveTo(W / 2, 0);
      c.lineTo(W / 2, H);
      c.stroke();
      c.setLineDash([]);

      neon(c, '#22d3ee');
      c.fillRect(20, py, 10, P);
      neon(c, '#f472b6');
      c.fillRect(W - 30, ay, 10, P);
      neon(c, '#fff');
      c.fillRect(b.x - 7, b.y - 7, 14, 14);
    },
  };
};

// ============================================================================
// GAME 3: BREAKOUT (Touch Drag & Mobile Safe Area)
// ============================================================================
const breakout = (k: Keys, _ctx: Ctx, getDims: () => { W: number; H: number; touch: boolean }): Game => {
  let init = false;
  let px = 300;
  let b = { x: 300, y: 400, vx: 240, vy: -300 };
  let lives = 3;
  let bricks: { x: number; y: number; w: number; h: number; alive: boolean; col: string }[] = [];
  const cols = ['#f43f5e', '#fb923c', '#facc15', '#34d399', '#22d3ee', '#a78bfa'];

  const setupBricks = (W: number) => {
    const numCols = Math.max(8, Math.min(16, Math.floor((W - 30) / 54)));
    const brickW = Math.floor((W - 30) / numCols) - 4;
    const list = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < numCols; c++) {
        list.push({
          x: 15 + c * (brickW + 4),
          y: 48 + r * 22,
          w: brickW,
          h: 18,
          alive: true,
          col: cols[r % cols.length],
        });
      }
    }
    bricks = list;
  };

  return {
    score: () => `${bricks.filter((x) => !x.alive).length}  ♥${lives}`,
    over: () => lives <= 0 || (bricks.length > 0 && bricks.every((x) => !x.alive)),
    act: () => {
      if (lives <= 0 || (bricks.length > 0 && bricks.every((x) => !x.alive))) {
        const { W, H, touch } = getDims();
        const bottomMargin = touch ? 140 : 26;
        setupBricks(W);
        px = W / 2 - 50;
        b = { x: W / 2, y: H - (bottomMargin + 60), vx: 240, vy: -300 };
        lives = 3;
      }
    },
    onClick: (cx) => {
      const { W } = getDims();
      const PW = Math.max(80, Math.min(140, W * 0.16));
      px = Math.max(0, Math.min(W - PW, cx - PW / 2));
    },
    step(dt) {
      const { W, H, touch } = getDims();
      const bottomMargin = touch ? 140 : 26;
      if (!init) {
        setupBricks(W);
        px = W / 2 - 50;
        b = { x: W / 2, y: H - (bottomMargin + 60), vx: 240, vy: -300 };
        init = true;
      }
      if (this.over()) return;
      const PW = Math.max(80, Math.min(140, W * 0.16));
      px = Math.max(0, Math.min(W - PW, px + ((right(k) ? 1 : 0) - (left(k) ? 1 : 0)) * 550 * dt));

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < 8 || b.x > W - 8) b.vx *= -1;
      if (b.y < 8) b.vy = Math.abs(b.vy);

      // Paddle collision at safe bottom position
      const padY = H - bottomMargin;
      if (b.vy > 0 && b.y > padY - 14 && b.y < padY + 6 && b.x > px && b.x < px + PW) {
        b.vy = -Math.abs(b.vy);
        b.vx = (b.x - (px + PW / 2)) * 7.5;
        stationAudio.playDriftScreech(0.3);
      }

      if (b.y > H - (bottomMargin - 30)) {
        lives--;
        stationAudio.playCarBump();
        b = { x: W / 2, y: H - (bottomMargin + 60), vx: 240, vy: -300 };
      }

      const hit = bricks.find((r) => r.alive && b.x > r.x && b.x < r.x + r.w && b.y > r.y && b.y < r.y + r.h);
      if (hit) {
        hit.alive = false;
        b.vy *= -1;
        stationAudio.playCoinPickup();
      }
    },
    draw(c) {
      const { W, H, touch } = getDims();
      const bottomMargin = touch ? 140 : 26;
      const PW = Math.max(80, Math.min(140, W * 0.16));

      bricks.forEach((r) => {
        if (!r.alive) return;
        neon(c, r.col, 8);
        c.fillRect(r.x, r.y, r.w, r.h);
      });

      neon(c, '#22d3ee');
      c.fillRect(px, H - bottomMargin, PW, 10);
      neon(c, '#fff');
      c.fillRect(b.x - 6, b.y - 6, 12, 12);
    },
  };
};

// ============================================================================
// GAME 4: CYBER DRIFT (Better Car, Drifting, Nitro, Randomness & Mobile-Safe UI)
// ============================================================================
const drive = (k: Keys, { projects }: Ctx, getDims: () => { W: number; H: number; touch: boolean }): Game => {
  const GAP = 360;
  const cols = Math.max(1, Math.ceil(Math.sqrt(projects.length)));
  const rows = Math.max(1, Math.ceil(projects.length / cols));
  const WW = (cols + 1) * GAP;
  const WH = (rows + 1) * GAP;

  const spots = projects.map((p, i) => ({
    p,
    x: ((i % cols) + 1) * GAP + 75,
    y: (Math.floor(i / cols) + 1) * GAP + 75,
  }));
  const seen = new Set<string>();

  // --- 1. Enhanced Car Physics State ---
  const car = {
    x: GAP / 2,
    y: GAP / 2,
    a: 0,
    vx: 0,
    vy: 0,
    v: 0,
    steerAngle: 0,
    nitro: 100,
    isBoosting: false,
    isDrifting: false,
    driftTime: 0,
    driftScore: 0,
    driftCombo: 1.0,
    miniTurboCharge: 0,
    totalScore: 0,
  };

  let near: (typeof spots)[number] | null = null;
  let mode: 'drive' | 'menu' = 'drive';
  let selectedProjectIdx = 0;
  let selectedButton = 0;

  // --- 2. Randomness: Collectible Stars, Nitro Canisters & Mystery Crates ---
  const stars: { id: number; x: number; y: number; collected: boolean; anim: number }[] = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      stars.push({
        id: r * 100 + c,
        x: c * GAP + (Math.random() - 0.5) * 160,
        y: r * GAP + (Math.random() - 0.5) * 160,
        collected: false,
        anim: Math.random() * Math.PI * 2,
      });
    }
  }

  const nitroPods: { id: number; x: number; y: number; collected: boolean; respawn: number }[] = [];
  for (let i = 0; i < 6; i++) {
    nitroPods.push({
      id: i,
      x: ((i % cols) + 0.5) * GAP + 50,
      y: (Math.floor(i / cols) + 0.5) * GAP + 50,
      collected: false,
      respawn: 0,
    });
  }

  // --- 3. Random Traffic Cones (Bouncy Physics Props) ---
  const cones: { x: number; y: number; vx: number; vy: number; rot: number; vrot: number }[] = [];
  spots.forEach((s) => {
    // 3 cones around parking bay
    cones.push({ x: s.x - 55, y: s.y + 40, vx: 0, vy: 0, rot: 0, vrot: 0 });
    cones.push({ x: s.x + 55, y: s.y + 40, vx: 0, vy: 0, rot: 0, vrot: 0 });
  });

  // --- 4. Autonomous AI Traffic (NPC Cars) with "Near Miss" bonus ---
  const npcColors = ['#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#06b6d4'];
  const npcCars = Array.from({ length: 5 }, (_, idx) => ({
    id: idx,
    x: ((idx % cols) + 1) * GAP,
    y: ((idx % rows) + 1) * GAP,
    a: (idx % 2 === 0 ? 0 : Math.PI / 2),
    v: 110 + Math.random() * 60,
    color: npcColors[idx % npcColors.length],
    nearMissed: false,
  }));

  // --- 5. Tire Skid Marks, Smoke Particles & Floating Text Popups ---
  const skidMarks: { x1: number; y1: number; x2: number; y2: number; alpha: number; color?: string }[] = [];
  const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string; life: number; maxLife: number }[] = [];
  const popups: { text: string; x: number; y: number; color: string; alpha: number; scale: number }[] = [];

  const addPopup = (text: string, x: number, y: number, color = '#fbbf24') => {
    popups.push({ text, x, y, color, alpha: 1.0, scale: 1.2 });
  };

  // Preload project images
  projects.forEach((p) => {
    const url = getProjectImageUrl(p.image);
    if (url) getOrLoadImage(p.id, url);
  });

  // Responsive layout calculation for In-Game Project Menu (Zero Black Bars & Zero Overlap)
  const getMenuLayout = () => {
    const { W, H } = getDims();
    const isMobile = W < 640;
    const isLandscape = W >= H && H < 500;

    const current = projects[selectedProjectIdx] || projects[0];

    // Compute dimensions that NEVER exceed the screen
    let menuW = Math.min(620, W - 24);
    let menuH = Math.min(isMobile ? 490 : 400, H - 36);
    if (isLandscape) {
      menuW = Math.min(680, W - 28);
      menuH = Math.min(380, H - 24);
    }

    const menuX = (W - menuW) / 2;
    const menuY = Math.max(12, (H - menuH) / 2);

    let btns: { id: string; label: string; x: number; y: number; w: number; h: number; enabled: boolean; action: () => void }[] = [];

    if (!isMobile && !isLandscape) {
      // Desktop standard layout
      btns = [
        {
          id: 'live',
          label: current?.live_link ? 'VISIT LIVE SITE ⇱' : 'NO LIVE LINK',
          x: menuX + 20,
          y: menuY + menuH - 84,
          w: (menuW - 48) / 2,
          h: 36,
          enabled: Boolean(current?.live_link),
          action: () => {
            if (current?.live_link) window.open(current.live_link, '_blank', 'noopener,noreferrer');
          },
        },
        {
          id: 'source',
          label: current?.github_repo ? 'SOURCE CODE ⌨' : 'NO REPO',
          x: menuX + 20 + (menuW - 48) / 2 + 8,
          y: menuY + menuH - 84,
          w: (menuW - 48) / 2,
          h: 36,
          enabled: Boolean(current?.github_repo),
          action: () => {
            if (current?.github_repo) window.open(current.github_repo, '_blank', 'noopener,noreferrer');
          },
        },
        {
          id: 'prev',
          label: '◀ PREV',
          x: menuX + 20,
          y: menuY + menuH - 42,
          w: 96,
          h: 32,
          enabled: true,
          action: () => {
            selectedProjectIdx = (selectedProjectIdx - 1 + projects.length) % projects.length;
          },
        },
        {
          id: 'next',
          label: 'NEXT ▶',
          x: menuX + 124,
          y: menuY + menuH - 42,
          w: 96,
          h: 32,
          enabled: true,
          action: () => {
            selectedProjectIdx = (selectedProjectIdx + 1) % projects.length;
          },
        },
        {
          id: 'resume',
          label: '✕ RESUME DRIVE',
          x: menuX + 228,
          y: menuY + menuH - 42,
          w: menuW - 248,
          h: 32,
          enabled: true,
          action: () => {
            mode = 'drive';
          },
        },
      ];
    } else {
      // Mobile & Landscape Responsive compact layout
      const halfW = (menuW - 36) / 2;
      const bY1 = menuY + menuH - 82;
      const bY2 = menuY + menuH - 42;

      btns = [
        {
          id: 'live',
          label: current?.live_link ? 'LIVE SITE ⇱' : 'NO LINK',
          x: menuX + 14,
          y: bY1,
          w: halfW,
          h: 34,
          enabled: Boolean(current?.live_link),
          action: () => {
            if (current?.live_link) window.open(current.live_link, '_blank', 'noopener,noreferrer');
          },
        },
        {
          id: 'source',
          label: current?.github_repo ? 'SOURCE ⌨' : 'NO REPO',
          x: menuX + 14 + halfW + 8,
          y: bY1,
          w: halfW,
          h: 34,
          enabled: Boolean(current?.github_repo),
          action: () => {
            if (current?.github_repo) window.open(current.github_repo, '_blank', 'noopener,noreferrer');
          },
        },
        {
          id: 'prev',
          label: '◀ PREV',
          x: menuX + 14,
          y: bY2,
          w: (menuW - 36) / 3,
          h: 32,
          enabled: true,
          action: () => {
            selectedProjectIdx = (selectedProjectIdx - 1 + projects.length) % projects.length;
          },
        },
        {
          id: 'next',
          label: 'NEXT ▶',
          x: menuX + 14 + (menuW - 36) / 3 + 4,
          y: bY2,
          w: (menuW - 36) / 3,
          h: 32,
          enabled: true,
          action: () => {
            selectedProjectIdx = (selectedProjectIdx + 1) % projects.length;
          },
        },
        {
          id: 'resume',
          label: '✕ BACK',
          x: menuX + 14 + ((menuW - 36) / 3) * 2 + 8,
          y: bY2,
          w: (menuW - 36) / 3 - 8,
          h: 32,
          enabled: true,
          action: () => {
            mode = 'drive';
          },
        },
      ];
    }

    return { menuX, menuY, menuW, menuH, isMobile, isLandscape, current, btns };
  };

  const executeSelectedButton = () => {
    const { btns } = getMenuLayout();
    btns[selectedButton]?.action();
  };

  return {
    score: () =>
      mode === 'menu'
        ? `PROJECT ${selectedProjectIdx + 1}/${projects.length}`
        : `SCORE: ${car.totalScore + car.driftScore} · ${seen.size}/${projects.length} VISITED`,
    over: () => false,
    isMenuOpen: () => mode === 'menu',
    getNearProject: () => (near ? near.p.title : null),

    act: () => {
      if (mode === 'drive') {
        if (near) {
          const idx = projects.findIndex((p) => p.id === near!.p.id);
          selectedProjectIdx = idx >= 0 ? idx : 0;
          selectedButton = 0;
          mode = 'menu';
          stationAudio.playCoinPickup();
        }
      } else {
        executeSelectedButton();
      }
    },

    onKeyDown: (code: string) => {
      if (mode === 'menu') {
        if (code === 'KeyW' || code === 'ArrowUp') {
          if (selectedButton >= 2) selectedButton = 0;
          return true;
        }
        if (code === 'KeyS' || code === 'ArrowDown') {
          if (selectedButton < 2) selectedButton = 2;
          return true;
        }
        if (code === 'KeyA' || code === 'ArrowLeft') {
          selectedButton = Math.max(0, selectedButton - 1);
          return true;
        }
        if (code === 'KeyD' || code === 'ArrowRight') {
          selectedButton = Math.min(4, selectedButton + 1);
          return true;
        }
        if (code === 'KeyE' || code === 'Enter' || code === 'Space') {
          executeSelectedButton();
          return true;
        }
        if (code === 'KeyQ' || code === 'Escape') {
          mode = 'drive';
          return true;
        }
        return true;
      }
      return false;
    },

    onClick: (cx: number, cy: number) => {
      if (mode === 'menu') {
        const { btns, menuX, menuY, menuW, menuH } = getMenuLayout();
        for (let i = 0; i < btns.length; i++) {
          const b = btns[i];
          if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
            selectedButton = i;
            b.action();
            return;
          }
        }
        // Click outside closes menu
        if (cx < menuX || cx > menuX + menuW || cy < menuY || cy > menuY + menuH) {
          mode = 'drive';
        }
      } else {
        if (near) {
          const idx = projects.findIndex((p) => p.id === near!.p.id);
          selectedProjectIdx = idx >= 0 ? idx : 0;
          selectedButton = 0;
          mode = 'menu';
          stationAudio.playCoinPickup();
        }
      }
    },

    step(dt) {
      if (mode === 'menu') return;

      // --- 1. Controls & Input Mapping ---
      const steerInput = (right(k) ? 1 : 0) - (left(k) ? 1 : 0);
      const throttleInput = up(k) ? 1 : 0;
      const brakeInput = down(k) ? 1 : 0;
      const wantDrift = driftKey(k);

      // --- 2. Steering Interpolation ---
      const targetSteer = steerInput * 0.44; // ~25 deg
      car.steerAngle += (targetSteer - car.steerAngle) * Math.min(1, 14 * dt);

      // --- 3. Nitro Boost Logic ---
      const isBoosting = (wantDrift || k.has('ShiftLeft')) && car.nitro > 4 && throttleInput > 0;
      if (isBoosting) {
        car.nitro = Math.max(0, car.nitro - 34 * dt);
        car.isBoosting = true;
        if (Math.random() < 0.25) stationAudio.playNitroBoost();
      } else {
        car.isBoosting = false;
        car.nitro = Math.min(100, car.nitro + 7 * dt);
      }

      // Faster Top Speed & Acceleration as requested!
      const maxSpeed = car.isBoosting ? 680 : 460;
      const accel = car.isBoosting ? 1150 : 540;

      const fwdX = Math.cos(car.a);
      const fwdY = Math.sin(car.a);
      const rightX = -Math.sin(car.a);
      const rightY = Math.cos(car.a);

      let forwardVel = car.vx * fwdX + car.vy * fwdY;
      let lateralVel = car.vx * rightX + car.vy * rightY;

      // Throttle & Brake
      if (throttleInput > 0) {
        forwardVel += accel * dt;
      }
      if (brakeInput > 0) {
        if (forwardVel > 30) {
          forwardVel -= 780 * dt; // Strong brakes
        } else {
          forwardVel -= 300 * dt; // Reverse
        }
      }

      // --- 4. Realistic Drift Physics & Lateral Slip ---
      const speed = Math.hypot(car.vx, car.vy);
      const isDriftingInput = wantDrift || (brakeInput > 0 && Math.abs(steerInput) > 0.3 && speed > 160);
      const isSlipping = Math.abs(lateralVel) > 85 || (isDriftingInput && speed > 130);

      // Lateral grip drops during drift so the tail kicks out!
      const lateralGrip = isSlipping ? 0.36 : 0.94;
      const lateralFriction = Math.pow(1 - lateralGrip, dt * 10);
      const rollingFriction = Math.pow(0.94, dt * 5);

      lateralVel *= lateralFriction;
      forwardVel *= rollingFriction;

      // Reconstruct velocity
      car.vx = fwdX * forwardVel + rightX * lateralVel;
      car.vy = fwdY * forwardVel + rightY * lateralVel;

      // Turning & Oversteer
      const turnRate = (forwardVel / 180) * car.steerAngle * 4.4;
      const driftOversteer = isSlipping ? Math.sign(lateralVel) * 1.8 * (speed / 300) : 0;
      car.a += (turnRate + driftOversteer) * dt;

      // Cap speed
      const curSpeed = Math.hypot(car.vx, car.vy);
      if (curSpeed > maxSpeed) {
        car.vx = (car.vx / curSpeed) * maxSpeed;
        car.vy = (car.vy / curSpeed) * maxSpeed;
      }

      const prevX = car.x;
      const prevY = car.y;
      car.x = Math.max(25, Math.min(WW - 25, car.x + car.vx * dt));
      car.y = Math.max(25, Math.min(WH - 25, car.y + car.vy * dt));
      car.v = forwardVel;

      // --- 5. Drift Scoring, Skid Marks & Smoke ---
      const rearLeftX = car.x - fwdX * 14 - rightX * 11;
      const rearLeftY = car.y - fwdY * 14 - rightY * 11;
      const rearRightX = car.x - fwdX * 14 + rightX * 11;
      const rearRightY = car.y - fwdY * 14 + rightY * 11;

      if (isSlipping && speed > 110) {
        car.isDrifting = true;
        car.driftTime += dt;
        car.driftCombo = Math.min(5.0, 1.0 + Math.floor(car.driftTime * 2) * 0.5);
        car.driftScore += Math.floor(speed * 0.4 * car.driftCombo * dt);
        car.miniTurboCharge += dt;

        stationAudio.playDriftScreech(Math.min(1.0, Math.abs(lateralVel) / 220));

        // Deposit tire skid marks
        skidMarks.push({
          x1: rearLeftX,
          y1: rearLeftY,
          x2: rearLeftX - car.vx * dt * 0.6,
          y2: rearLeftY - car.vy * dt * 0.6,
          alpha: 0.65,
        });
        skidMarks.push({
          x1: rearRightX,
          y1: rearRightY,
          x2: rearRightX - car.vx * dt * 0.6,
          y2: rearRightY - car.vy * dt * 0.6,
          alpha: 0.65,
        });

        // Puff smoke particles
        if (Math.random() < 0.6) {
          particles.push({
            x: rearLeftX + (Math.random() - 0.5) * 6,
            y: rearLeftY + (Math.random() - 0.5) * 6,
            vx: -car.vx * 0.15 + (Math.random() - 0.5) * 20,
            vy: -car.vy * 0.15 + (Math.random() - 0.5) * 20,
            r: 4 + Math.random() * 5,
            alpha: 0.5,
            color: '#e2e8f0',
            life: 0.45,
            maxLife: 0.45,
          });
          particles.push({
            x: rearRightX + (Math.random() - 0.5) * 6,
            y: rearRightY + (Math.random() - 0.5) * 6,
            vx: -car.vx * 0.15 + (Math.random() - 0.5) * 20,
            vy: -car.vy * 0.15 + (Math.random() - 0.5) * 20,
            r: 4 + Math.random() * 5,
            alpha: 0.5,
            color: '#e2e8f0',
            life: 0.45,
            maxLife: 0.45,
          });
        }
      } else {
        if (car.isDrifting) {
          // Exited drift: bank drift points & trigger Mini-Turbo!
          if (car.miniTurboCharge > 0.8) {
            car.vx += fwdX * 240;
            car.vy += fwdY * 240;
            car.nitro = Math.min(100, car.nitro + 30);
            stationAudio.playDriftBonus();
            addPopup(`MINI-TURBO! +${car.driftScore}`, car.x, car.y - 25, '#38bdf8');
          } else if (car.driftScore > 50) {
            addPopup(`DRIFT +${car.driftScore}`, car.x, car.y - 25, '#fbbf24');
          }
          car.totalScore += car.driftScore;
          car.driftScore = 0;
          car.driftTime = 0;
          car.driftCombo = 1.0;
          car.miniTurboCharge = 0;
        }
        car.isDrifting = false;
      }

      // Fade skid marks
      for (let i = skidMarks.length - 1; i >= 0; i--) {
        skidMarks[i].alpha -= dt * 0.05;
        if (skidMarks[i].alpha <= 0) skidMarks.splice(i, 1);
      }
      if (skidMarks.length > 500) skidMarks.splice(0, skidMarks.length - 500);

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += dt * 8;
        p.life -= dt;
        p.alpha = (p.life / p.maxLife) * 0.5;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Update popups
      for (let i = popups.length - 1; i >= 0; i--) {
        const pop = popups[i];
        pop.y -= 30 * dt;
        pop.alpha -= dt * 0.9;
        if (pop.alpha <= 0) popups.splice(i, 1);
      }

      // --- 6. Star Coins Pickup Collision ---
      stars.forEach((s) => {
        if (!s.collected && Math.hypot(s.x - car.x, s.y - car.y) < 38) {
          s.collected = true;
          car.totalScore += 150;
          stationAudio.playCoinPickup();
          addPopup('+150 STAR!', s.x, s.y, '#facc15');
        }
        s.anim += dt * 3;
      });

      // --- 7. Nitro Pods Collision ---
      nitroPods.forEach((np) => {
        if (!np.collected && Math.hypot(np.x - car.x, np.y - car.y) < 38) {
          np.collected = true;
          np.respawn = 12;
          car.nitro = 100;
          car.totalScore += 200;
          stationAudio.playNitroBoost();
          addPopup('NITRO REFILL!', np.x, np.y, '#38bdf8');
        }
        if (np.collected) {
          np.respawn -= dt;
          if (np.respawn <= 0) np.collected = false;
        }
      });

      // --- 8. Traffic Cones Physics Collision ---
      cones.forEach((cone) => {
        cone.x += cone.vx * dt;
        cone.y += cone.vy * dt;
        cone.vx *= Math.pow(0.4, dt);
        cone.vy *= Math.pow(0.4, dt);
        cone.rot += cone.vrot * dt;
        cone.vrot *= Math.pow(0.5, dt);

        if (Math.hypot(cone.x - car.x, cone.y - car.y) < 26) {
          const hitAngle = Math.atan2(cone.y - car.y, cone.x - car.x);
          cone.vx = Math.cos(hitAngle) * (speed + 200);
          cone.vy = Math.sin(hitAngle) * (speed + 200);
          cone.vrot = (Math.random() - 0.5) * 20;
          stationAudio.playCrateSmash();
        }
      });

      // --- 9. Autonomous AI Traffic (NPCs) & "Near Miss" ---
      npcCars.forEach((npc) => {
        npc.x += Math.cos(npc.a) * npc.v * dt;
        npc.y += Math.sin(npc.a) * npc.v * dt;

        // Wrap around world edges
        if (npc.x > WW) npc.x = 20;
        if (npc.x < 0) npc.x = WW - 20;
        if (npc.y > WH) npc.y = 20;
        if (npc.y < 0) npc.y = WH - 20;

        const dist = Math.hypot(npc.x - car.x, npc.y - car.y);
        // Near miss reward (drift/speed close without touching!)
        if (dist < 60 && dist > 32 && speed > 220 && !npc.nearMissed) {
          npc.nearMissed = true;
          car.totalScore += 250;
          stationAudio.playCoinPickup();
          addPopup('NEAR MISS! +250', car.x, car.y - 30, '#ec4899');
        }
        if (dist > 120) npc.nearMissed = false;

        // Bump collision
        if (dist < 32) {
          const bumpAngle = Math.atan2(car.y - npc.y, car.x - npc.x);
          car.vx += Math.cos(bumpAngle) * 160;
          car.vy += Math.sin(bumpAngle) * 160;
          stationAudio.playCarBump();
        }
      });

      // Check near project buildings
      near = spots.find((s) => Math.hypot(s.x - car.x, s.y - car.y) < 78) ?? null;
      if (near) seen.add(near.p.id);
    },

    draw(c) {
      const { W, H, touch } = getDims();

      // --- 1. World View with Smooth Camera Tracking ---
      c.save();
      c.translate(W / 2 - car.x, H / 2 - car.y);

      // Deep dark terrain
      c.fillStyle = '#141417';
      c.fillRect(0, 0, WW, WH);

      // Draw Roads
      const roadW = 76;
      for (let i = 1; i <= rows; i++) {
        // Horizontal road
        c.fillStyle = '#26262b';
        c.fillRect(0, i * GAP - roadW / 2, WW, roadW);
        // Curbs
        c.fillStyle = '#3f3f46';
        c.fillRect(0, i * GAP - roadW / 2 - 4, WW, 4);
        c.fillRect(0, i * GAP + roadW / 2, WW, 4);
      }
      for (let i = 1; i <= cols; i++) {
        // Vertical road
        c.fillStyle = '#26262b';
        c.fillRect(i * GAP - roadW / 2, 0, roadW, WH);
        // Curbs
        c.fillStyle = '#3f3f46';
        c.fillRect(i * GAP - roadW / 2 - 4, 0, 4, WH);
        c.fillRect(i * GAP + roadW / 2, 0, 4, WH);
      }

      // Yellow double centerlines & white dashes
      c.strokeStyle = '#eab308';
      c.lineWidth = 2;
      c.setLineDash([16, 16]);
      c.beginPath();
      for (let i = 1; i <= rows; i++) {
        c.moveTo(0, i * GAP);
        c.lineTo(WW, i * GAP);
      }
      for (let i = 1; i <= cols; i++) {
        c.moveTo(i * GAP, 0);
        c.lineTo(i * GAP, WH);
      }
      c.stroke();
      c.setLineDash([]);

      // Draw Persistent Skid Marks
      skidMarks.forEach((sm) => {
        c.strokeStyle = sm.color || `rgba(10, 10, 12, ${sm.alpha})`;
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(sm.x1, sm.y1);
        c.lineTo(sm.x2, sm.y2);
        c.stroke();
      });

      // Draw Project Buildings with Image Previews & Parking Bays
      spots.forEach((s) => {
        const isNear = near?.p.id === s.p.id;

        // Painted parking bay on road
        c.strokeStyle = isNear ? '#fbbf24' : '#71717a';
        c.lineWidth = 2;
        c.strokeRect(s.x - 48, s.y - 48, 96, 96);

        // Building outer border
        c.fillStyle = isNear ? '#fbbf24' : seen.has(s.p.id) ? '#d97706' : '#e0a030';
        c.fillRect(s.x - 44, s.y - 44, 88, 88);

        // Building interior
        c.fillStyle = '#09090b';
        c.fillRect(s.x - 38, s.y - 38, 76, 76);

        // Draw project picture
        const img = imageCache.get(s.p.id);
        if (img && img.complete && img.naturalWidth > 0) {
          c.save();
          c.beginPath();
          c.rect(s.x - 38, s.y - 38, 76, 76);
          c.clip();
          c.drawImage(img, s.x - 38, s.y - 38, 76, 76);
          c.restore();
        } else {
          c.fillStyle = '#18181b';
          c.fillRect(s.x - 38, s.y - 38, 76, 76);
          c.fillStyle = '#71717a';
          c.font = 'bold 11px monospace';
          c.textAlign = 'center';
          c.fillText('PROJECT', s.x, s.y + 4);
        }

        // Inner outline
        c.strokeStyle = isNear ? '#fbbf24' : 'rgba(255,255,255,0.2)';
        c.lineWidth = isNear ? 2.5 : 1;
        c.strokeRect(s.x - 38, s.y - 38, 76, 76);

        // Nameplate banner below building
        c.fillStyle = 'rgba(9, 9, 11, 0.92)';
        c.fillRect(s.x - 52, s.y + 46, 104, 22);
        c.strokeStyle = isNear ? '#fbbf24' : '#52525b';
        c.lineWidth = 1;
        c.strokeRect(s.x - 52, s.y + 46, 104, 22);
        c.fillStyle = isNear ? '#fbbf24' : '#e4e4e7';
        c.font = 'bold 11px monospace';
        c.textAlign = 'center';
        c.fillText(s.p.title.slice(0, 14), s.x, s.y + 61);
      });

      // Draw Collectible Star Coins
      stars.forEach((s) => {
        if (s.collected) return;
        c.save();
        c.translate(s.x, s.y);
        c.rotate(s.anim);
        c.fillStyle = '#facc15';
        c.shadowColor = '#facc15';
        c.shadowBlur = 10;
        // 5-point star
        c.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const a2 = a1 + Math.PI / 5;
          if (i === 0) c.moveTo(Math.cos(a1) * 11, Math.sin(a1) * 11);
          else c.lineTo(Math.cos(a1) * 11, Math.sin(a1) * 11);
          c.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5);
        }
        c.closePath();
        c.fill();
        c.shadowBlur = 0;
        c.restore();
      });

      // Draw Nitro Pods
      nitroPods.forEach((np) => {
        if (np.collected) return;
        c.save();
        c.translate(np.x, np.y);
        c.fillStyle = '#06b6d4';
        c.shadowColor = '#06b6d4';
        c.shadowBlur = 12;
        c.beginPath();
        c.roundRect(-8, -12, 16, 24, 4);
        c.fill();
        c.fillStyle = '#ffffff';
        c.font = 'bold 10px monospace';
        c.textAlign = 'center';
        c.fillText('N₂', 0, 4);
        c.shadowBlur = 0;
        c.restore();
      });

      // Draw Traffic Cones
      cones.forEach((cone) => {
        c.save();
        c.translate(cone.x, cone.y);
        c.rotate(cone.rot);
        c.fillStyle = '#ea580c';
        c.beginPath();
        c.moveTo(0, -9);
        c.lineTo(7, 7);
        c.lineTo(-7, 7);
        c.closePath();
        c.fill();
        c.fillStyle = '#ffffff';
        c.fillRect(-4, -1, 8, 3);
        c.restore();
      });

      // Draw AI NPC Traffic Cars
      npcCars.forEach((npc) => {
        c.save();
        c.translate(npc.x, npc.y);
        c.rotate(npc.a);
        c.fillStyle = npc.color;
        c.beginPath();
        c.roundRect(-16, -10, 32, 20, 4);
        c.fill();
        c.fillStyle = '#0f172a';
        c.fillRect(-6, -7, 12, 14);
        // Headlights
        c.fillStyle = '#fef08a';
        c.fillRect(15, -7, 2, 3);
        c.fillRect(15, 4, 2, 3);
        // Taillights
        c.fillStyle = '#ef4444';
        c.fillRect(-17, -7, 2, 3);
        c.fillRect(-17, 4, 2, 3);
        c.restore();
      });

      // Draw Smoke Particles
      particles.forEach((p) => {
        c.fillStyle = p.color;
        c.globalAlpha = p.alpha;
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fill();
      });
      c.globalAlpha = 1.0;

      // --- 2. Draw The Cyber Drift Sports Car ---
      c.save();
      c.translate(car.x, car.y);
      c.rotate(car.a);

      // Ground shadow
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.beginPath();
      c.roundRect(-24, -13, 48, 26, 6);
      c.fill();

      // Cyber Underglow Neon
      const underglow = car.isBoosting ? '#38bdf8' : car.isDrifting ? '#ec4899' : '#f59e0b';
      c.shadowColor = underglow;
      c.shadowBlur = 18;
      c.fillStyle = underglow;
      c.globalAlpha = 0.5;
      c.fillRect(-18, -10, 36, 20);
      c.globalAlpha = 1.0;
      c.shadowBlur = 0;

      // 4 Wheels (Front wheels visibly turn!)
      const drawWheel = (wx: number, wy: number, angle: number) => {
        c.save();
        c.translate(wx, wy);
        c.rotate(angle);
        c.fillStyle = '#18181b';
        c.fillRect(-6, -3, 12, 6);
        c.fillStyle = '#94a3b8';
        c.fillRect(-3, -1.5, 6, 3);
        c.restore();
      };
      drawWheel(14, -12, car.steerAngle);
      drawWheel(14, 12, car.steerAngle);
      drawWheel(-14, -12, 0);
      drawWheel(-14, 12, 0);

      // Aerodynamic Car Body
      c.fillStyle = '#0284c7'; // Electric Cyan Blue Body
      c.beginPath();
      c.moveTo(-20, -10);
      c.lineTo(16, -10);
      c.lineTo(23, -6);
      c.lineTo(23, 6);
      c.lineTo(16, 10);
      c.lineTo(-20, 10);
      c.closePath();
      c.fill();

      // Racing Livery Stripe
      c.fillStyle = '#fbbf24';
      c.fillRect(-20, -2, 43, 4);

      // Cockpit & Windshield
      c.fillStyle = '#09090b';
      c.beginPath();
      c.roundRect(-8, -7, 18, 14, 3);
      c.fill();

      c.fillStyle = '#38bdf8';
      c.beginPath();
      c.moveTo(5, -6);
      c.lineTo(9, -4);
      c.lineTo(9, 4);
      c.lineTo(5, 6);
      c.closePath();
      c.fill();

      // Carbon Rear Wing
      c.fillStyle = '#0f172a';
      c.fillRect(-23, -11, 4, 22);
      c.fillStyle = '#38bdf8';
      c.fillRect(-23, -12, 2, 3);
      c.fillRect(-23, 9, 2, 3);

      // Headlight Beams
      const beamGrad = c.createLinearGradient(23, 0, 130, 0);
      beamGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
      beamGrad.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = beamGrad;
      c.beginPath();
      c.moveTo(23, -7);
      c.lineTo(130, -32);
      c.lineTo(130, 32);
      c.lineTo(23, 7);
      c.closePath();
      c.fill();

      c.fillStyle = '#ffffff';
      c.fillRect(22, -8, 2, 4);
      c.fillRect(22, 4, 2, 4);

      // Taillights
      const isBraking = down(k) || car.v < -10;
      c.fillStyle = isBraking ? '#ef4444' : '#991b1b';
      c.shadowColor = '#ef4444';
      c.shadowBlur = isBraking ? 14 : 4;
      c.fillRect(-21, -8, 2, 3);
      c.fillRect(-21, 5, 2, 3);
      c.shadowBlur = 0;

      // Exhaust Fire Flames
      if (up(k) || car.isBoosting) {
        const flameLen = car.isBoosting ? 18 + Math.random() * 12 : 6 + Math.random() * 6;
        c.fillStyle = car.isBoosting ? '#38bdf8' : '#f97316';
        c.beginPath();
        c.moveTo(-21, -5);
        c.lineTo(-21 - flameLen, -4);
        c.lineTo(-21, -3);
        c.fill();
        c.beginPath();
        c.moveTo(-21, 3);
        c.lineTo(-21 - flameLen, 4);
        c.lineTo(-21, 5);
        c.fill();
      }

      c.restore();

      // Floating Score Popups
      popups.forEach((pop) => {
        c.save();
        c.fillStyle = pop.color;
        c.globalAlpha = pop.alpha;
        c.font = 'bold 15px monospace';
        c.textAlign = 'center';
        c.fillText(pop.text, pop.x, pop.y);
        c.restore();
      });

      c.restore();

      // --- 3. HUD: Speedometer, Nitro Gauge & Minimap ---
      if (mode === 'drive') {
        const speedKmh = Math.round(Math.abs(car.v) * 0.85);

        // Bottom-Right or Top-Right HUD depending on touch
        const hudX = 20;
        const hudY = touch ? 64 : H - 54;

        // Speed & Nitro cluster
        c.fillStyle = 'rgba(9, 9, 11, 0.85)';
        c.fillRect(hudX, hudY, 140, 44);
        c.strokeStyle = '#f59e0b';
        c.lineWidth = 1.5;
        c.strokeRect(hudX, hudY, 140, 44);

        c.fillStyle = '#f8fafc';
        c.font = 'bold 16px monospace';
        c.textAlign = 'left';
        c.fillText(`${speedKmh} KM/H`, hudX + 10, hudY + 20);

        // Nitro Bar
        c.fillStyle = '#1e293b';
        c.fillRect(hudX + 10, hudY + 28, 120, 8);
        c.fillStyle = car.nitro > 20 ? '#06b6d4' : '#ef4444';
        c.fillRect(hudX + 10, hudY + 28, (car.nitro / 100) * 120, 8);

        // Drift Multiplier badge
        if (car.isDrifting && car.driftCombo > 1.0) {
          c.fillStyle = '#ec4899';
          c.font = 'bold 14px monospace';
          c.textAlign = 'left';
          c.fillText(`DRIFT ${car.driftCombo.toFixed(1)}x`, hudX + 150, hudY + 22);
        }

        // Minimap
        const mw = Math.min(120, Math.max(80, W * 0.18));
        const mh = (mw * WH) / WW;
        const mmX = W - mw - 16;
        const mmY = 54;

        c.fillStyle = 'rgba(0,0,0,0.78)';
        c.fillRect(mmX, mmY, mw, mh);
        c.strokeStyle = '#e0a030';
        c.lineWidth = 1;
        c.strokeRect(mmX, mmY, mw, mh);

        spots.forEach((s) => {
          c.fillStyle = seen.has(s.p.id) ? '#c8553d' : '#e0a030';
          c.fillRect(mmX + (s.x / WW) * mw - 3, mmY + (s.y / WH) * mh - 3, 6, 6);
        });

        c.fillStyle = '#38bdf8';
        c.fillRect(mmX + (car.x / WW) * mw - 2, mmY + (car.y / WH) * mh - 2, 5, 5);
      }

      // --- 4. Responsive In-Game Canvas Project Menu (Zero Black Bars & Zero Overlap) ---
      if (mode === 'menu') {
        const { menuX, menuY, menuW, menuH, isMobile, isLandscape, current, btns } = getMenuLayout();

        // Dark dim backdrop
        c.fillStyle = 'rgba(6, 8, 14, 0.96)';
        c.fillRect(menuX, menuY, menuW, menuH);

        c.strokeStyle = '#e0a030';
        c.lineWidth = 2;
        c.strokeRect(menuX, menuY, menuW, menuH);

        // Header bar
        c.fillStyle = '#1c1917';
        c.fillRect(menuX + 2, menuY + 2, menuW - 4, 28);
        c.fillStyle = '#e0a030';
        c.font = 'bold 12px monospace';
        c.textAlign = 'left';
        c.fillText(`▶ DATA-CARD [${selectedProjectIdx + 1}/${projects.length}]`, menuX + 12, menuY + 20);

        c.textAlign = 'right';
        c.fillStyle = '#a1a1aa';
        c.font = '10px monospace';
        c.fillText('[ESC / TAP OUT] BACK', menuX + menuW - 12, menuY + 20);

        if (!isMobile && !isLandscape) {
          // Desktop Layout: Side-by-side
          const picW = Math.min(210, Math.floor(menuW * 0.42));
          const picH = Math.floor(picW * 0.72);

          // Picture frame
          c.fillStyle = '#09090b';
          c.fillRect(menuX + 20, menuY + 44, picW, picH);
          c.strokeStyle = '#e0a030';
          c.lineWidth = 1.5;
          c.strokeRect(menuX + 20, menuY + 44, picW, picH);

          const img = imageCache.get(current.id);
          const hasImg = Boolean(getProjectImageUrl(current.image));
          if (img && img.complete && img.naturalWidth > 0) {
            c.save();
            c.beginPath();
            c.rect(menuX + 21, menuY + 45, picW - 2, picH - 2);
            c.clip();
            c.drawImage(img, menuX + 21, menuY + 45, picW - 2, picH - 2);
            c.restore();
          } else {
            c.fillStyle = '#71717a';
            c.font = '11px monospace';
            c.textAlign = 'center';
            c.fillText(hasImg ? 'LOADING...' : 'NO PREVIEW', menuX + 20 + picW / 2, menuY + 44 + picH / 2);
          }

          // Tags below image
          c.textAlign = 'left';
          c.fillStyle = '#fbbf24';
          c.font = 'bold 10px monospace';
          const tags = (current.tags || []).slice(0, 3).map((t) => `[${t}]`).join(' ');
          c.fillText(tags.slice(0, 26), menuX + 20, menuY + 44 + picH + 18);

          // Right Column: Title & Description
          const rightX = menuX + 20 + picW + 20;
          const rightW = menuW - (20 + picW + 40);

          c.fillStyle = '#ffa73d';
          c.font = 'bold 16px monospace';
          c.textAlign = 'left';
          c.fillText(current.title.slice(0, 26), rightX, menuY + 60);

          c.strokeStyle = '#3f3f46';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(rightX, menuY + 70);
          c.lineTo(rightX + rightW, menuY + 70);
          c.stroke();

          c.fillStyle = '#d4d4d8';
          c.font = '11px monospace';
          wrapCanvasText(c, current.description || 'No description provided.', rightX, menuY + 90, rightW, 16, 7);
        } else {
          // Mobile & Landscape Compact Layout
          const picH = isLandscape ? 80 : 96;
          const picW = isLandscape ? 130 : menuW - 32;
          const picX = menuX + 16;
          const picY = menuY + 36;

          c.fillStyle = '#09090b';
          c.fillRect(picX, picY, picW, picH);
          c.strokeStyle = '#e0a030';
          c.lineWidth = 1.5;
          c.strokeRect(picX, picY, picW, picH);

          const img = imageCache.get(current.id);
          if (img && img.complete && img.naturalWidth > 0) {
            c.save();
            c.beginPath();
            c.rect(picX + 1, picY + 1, picW - 2, picH - 2);
            c.clip();
            c.drawImage(img, picX + 1, picY + 1, picW - 2, picH - 2);
            c.restore();
          }

          if (isLandscape) {
            // Landscape right side
            const rightX = picX + picW + 16;
            const rightW = menuW - (picW + 48);
            c.fillStyle = '#ffa73d';
            c.font = 'bold 14px monospace';
            c.textAlign = 'left';
            c.fillText(current.title.slice(0, 28), rightX, picY + 18);

            c.fillStyle = '#d4d4d8';
            c.font = '10px monospace';
            wrapCanvasText(c, current.description || '', rightX, picY + 36, rightW, 14, 3);
          } else {
            // Portrait stacked
            c.fillStyle = '#ffa73d';
            c.font = 'bold 14px monospace';
            c.textAlign = 'left';
            c.fillText(current.title.slice(0, 30), menuX + 16, menuY + 152);

            c.fillStyle = '#d4d4d8';
            c.font = '10px monospace';
            wrapCanvasText(c, current.description || '', menuX + 16, menuY + 170, menuW - 32, 14, 3);
          }
        }

        // Draw Action & Navigation Buttons
        btns.forEach((b, i) => {
          const isSelected = selectedButton === i;
          if (isSelected) {
            neon(c, '#ffa73d', 10);
            c.fillStyle = '#ffa73d';
            c.fillRect(b.x, b.y, b.w, b.h);
            c.shadowBlur = 0;

            c.strokeStyle = '#ffffff';
            c.lineWidth = 2;
            c.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

            c.fillStyle = '#05070d';
            c.font = 'bold 11px monospace';
            c.textAlign = 'center';
            c.fillText(`▶ ${b.label} ◀`, b.x + b.w / 2, b.y + b.h / 2 + 4);
          } else {
            c.fillStyle = b.enabled ? '#18181b' : '#0f0f11';
            c.fillRect(b.x, b.y, b.w, b.h);

            c.strokeStyle = b.enabled ? '#71717a' : '#27272a';
            c.lineWidth = 1;
            c.strokeRect(b.x, b.y, b.w, b.h);

            c.fillStyle = b.enabled ? '#e4e4e7' : '#52525b';
            c.font = 'bold 10px monospace';
            c.textAlign = 'center';
            c.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 4);
          }
        });
      }
    },
  };
};

const GAMES: Record<string, (k: Keys, ctx: Ctx, getDims: () => { W: number; H: number; touch: boolean }) => Game> = {
  snake,
  pong,
  breakout,
  drive,
};

const press = (code: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));

const Btn: React.FC<{ code: string; hold?: boolean; children: React.ReactNode; className?: string }> = ({
  code,
  hold,
  children,
  className,
}) => (
  <button
    className={`rounded-full border-2 border-amber-400/60 bg-black/60 backdrop-blur-md text-amber-300 touch-none select-none active:bg-amber-400/40 active:scale-95 transition-all shadow-[0_0_14px_rgba(245,158,11,0.3)] flex items-center justify-center font-bold text-sm cursor-pointer ${
      className || 'w-14 h-14'
    }`}
    onPointerDown={(e) => {
      e.preventDefault();
      press(code, true);
      if (!hold) press(code, false);
    }}
    onPointerUp={(e) => {
      e.preventDefault();
      if (hold) press(code, false);
    }}
    onPointerLeave={(e) => {
      e.preventDefault();
      if (hold) press(code, false);
    }}
    onPointerCancel={(e) => {
      e.preventDefault();
      if (hold) press(code, false);
    }}
  >
    {children}
  </button>
);

const Arcade: React.FC<{
  game: string;
  projects: Project[];
  onOpen?: (p: Project) => void;
  onExit: () => void;
  isPaused?: boolean;
}> = ({ game, projects, onOpen, onExit, isPaused = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const gameInstanceRef = useRef<Game | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMenuOpenRef = useRef(false);
  const [nearProjectTitle, setNearProjectTitle] = useState<string | null>(null);
  const nearProjectRef = useRef<string | null>(null);

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch {
        // Ignored if user gesture required
      }
    };
    enterFullscreen();

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleExitGame = async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore
      }
    }
    onExit();
  };

  useEffect(() => {
    const canvas = ref.current!;
    const keys: Keys = new Set();
    const c = canvas.getContext('2d')!;
    const ctx: Ctx = { projects, open: onOpen || (() => {}) };

    const getDims = () => ({
      W: canvas.width || window.innerWidth || 800,
      H: canvas.height || window.innerHeight || 600,
      touch: Boolean(touch),
    });

    const resizeCanvas = () => {
      canvas.width = window.innerWidth || 800;
      canvas.height = window.innerHeight || 600;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let g = GAMES[game](keys, ctx, getDims);
    gameInstanceRef.current = g;

    const onKey = (e: KeyboardEvent) => {
      if (e.type === 'keydown' && g.onKeyDown && g.onKeyDown(e.code)) {
        e.preventDefault();
        return;
      }

      if (isPaused) return;
      if (e.type === 'keydown' && (e.code === 'Escape' || e.code === 'KeyQ')) return handleExitGame();
      e.preventDefault();
      if (e.type === 'keydown') {
        keys.add(e.code);
        if (e.code === 'Space' && g.over()) g = GAMES[game](keys, ctx, getDims);
        if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) g.act?.();
      } else keys.delete(e.code);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    let last = performance.now();
    let raf = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      try {
        if (!isPaused) {
          g.step(dt);
        }

        // Bridge state for mobile UI
        if (g.isMenuOpen) {
          const open = g.isMenuOpen();
          if (open !== isMenuOpenRef.current) {
            isMenuOpenRef.current = open;
            setIsMenuOpen(open);
          }
        }
        if (g.getNearProject) {
          const np = g.getNearProject();
          if (np !== nearProjectRef.current) {
            nearProjectRef.current = np;
            setNearProjectTitle(np);
          }
        }

        c.shadowBlur = 0;
        c.fillStyle = '#05070d';
        c.fillRect(0, 0, canvas.width, canvas.height);
        g.draw(c);
        c.shadowBlur = 0;

        if (g.over()) {
          c.fillStyle = 'rgba(0,0,0,0.7)';
          c.fillRect(0, 0, canvas.width, canvas.height);
          neon(c, '#fff', 0);
          c.font = 'bold 32px monospace';
          c.textAlign = 'center';
          c.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 12);
          c.font = '16px monospace';
          c.fillText(touch ? 'TAP TO RESTART' : 'SPACE to restart', canvas.width / 2, canvas.height / 2 + 24);
        }
        if (hud.current) hud.current.textContent = g.score();
      } catch (err) {
        console.error('Arcade loop error:', err);
      }
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [game, projects, isPaused, onOpen, touch]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (gameInstanceRef.current?.onClick) {
      gameInstanceRef.current.onClick(cx, cy);
    } else if (gameInstanceRef.current?.act) {
      gameInstanceRef.current.act();
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden font-mono text-amber-300 select-none"
    >
      {/* 100% Fullscreen Edge-to-Edge Canvas */}
      <canvas
        ref={ref}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full cursor-pointer block"
      />

      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.18)_0_2px,transparent_2px_4px)]" />

      {/* Floating Minimal Header (Responsive on Mobile) */}
      <div className="absolute top-2.5 sm:top-3 left-3 sm:left-4 right-3 sm:right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          <span className="uppercase tracking-[0.2em] sm:tracking-[0.4em] text-xs sm:text-base font-bold text-amber-300 drop-shadow truncate">
            {game}
          </span>
          <div ref={hud} className="text-[11px] sm:text-sm font-bold text-amber-200/90 drop-shadow truncate" />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs rounded bg-zinc-950/80 hover:bg-zinc-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition cursor-pointer backdrop-blur shadow"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>

          <button
            onClick={handleExitGame}
            className="px-2.5 py-1 text-xs font-bold rounded bg-zinc-950/80 hover:bg-red-950/80 text-amber-300 hover:text-red-300 border border-amber-500/40 hover:border-red-500/60 transition cursor-pointer backdrop-blur shadow"
          >
            Exit (Q)
          </button>
        </div>
      </div>

      {/* Near Project Banner - Centered Prominently in Upper Zone (NEVER Covered by Touch Controls) */}
      {game === 'drive' && nearProjectTitle && !isMenuOpen && (
        <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={() => gameInstanceRef.current?.act?.()}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-amber-400 bg-black/90 text-amber-300 font-mono text-xs sm:text-sm font-bold shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-95 active:bg-amber-400/20 transition cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="truncate max-w-[240px] sm:max-w-none">
              TAP TO VIEW: {nearProjectTitle}
            </span>
          </button>
        </div>
      )}

      {/* Mobile Touch Controls - FLOATING ON TOP OF THE GAME */}
      {touch && (
        <div className="absolute inset-0 pointer-events-none z-30 select-none">
          {game === 'drive' ? (
            /* Driving Controls - Smoothly HIDDEN when in Menu Mode to eliminate UI overlaps! */
            <div
              className={`transition-opacity duration-200 ${
                isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              {/* Left Side: Steering ◀ ▶ */}
              <div className="absolute left-4 bottom-6 pointer-events-auto flex items-center gap-3">
                <Btn code="ArrowLeft" hold className="w-14 h-14 text-lg">
                  ◀
                </Btn>
                <Btn code="ArrowRight" hold className="w-14 h-14 text-lg">
                  ▶
                </Btn>
              </div>

              {/* Right Side: Reverse ▼, Gas ▲, and DRIFT/NITRO ⚡ */}
              <div className="absolute right-4 bottom-6 pointer-events-auto flex items-center gap-2.5">
                <Btn code="ArrowDown" hold className="w-13 h-13 text-base">
                  ▼
                </Btn>
                <Btn code="ArrowUp" hold className="w-15 h-15 text-xl">
                  ▲
                </Btn>
                <Btn
                  code="Space"
                  hold
                  className="px-4 h-13 rounded-full border-2 border-cyan-400 bg-cyan-950/70 text-cyan-300 font-bold text-xs tracking-wider shadow-[0_0_18px_rgba(6,182,212,0.5)] active:bg-cyan-400/40"
                >
                  ⚡ DRIFT
                </Btn>
              </div>
            </div>
          ) : (
            /* Classic 4-Way D-Pad & Actions for Snake, Pong, Breakout */
            <>
              <div className="absolute left-4 bottom-6 pointer-events-auto">
                <div className="grid grid-cols-3 gap-1.5 place-items-center">
                  <span />
                  <Btn code="ArrowUp" hold>▲</Btn>
                  <span />
                  <Btn code="ArrowLeft" hold>◀</Btn>
                  <span />
                  <Btn code="ArrowRight" hold>▶</Btn>
                  <span />
                  <Btn code="ArrowDown" hold>▼</Btn>
                  <span />
                </div>
              </div>

              <div className="absolute right-4 bottom-6 pointer-events-auto flex flex-col gap-2.5">
                <Btn code="KeyE">Act</Btn>
                <Btn code="Space">Retry</Btn>
                <Btn code="Escape">Exit</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Arcade;
