import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Project } from '@/types/Project';
import { getProjectImageUrl } from '@/lib/projectUtils';
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
};
type Keys = Set<string>;

const up = (k: Keys) => k.has('ArrowUp') || k.has('KeyW');
const down = (k: Keys) => k.has('ArrowDown') || k.has('KeyS');
const left = (k: Keys) => k.has('ArrowLeft') || k.has('KeyA');
const right = (k: Keys) => k.has('ArrowRight') || k.has('KeyD');

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
// GAME 1: SNAKE (Dynamic Fullscreen)
// ============================================================================
const snake = (k: Keys, _ctx: Ctx, getDims: () => { W: number; H: number }): Game => {
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
    step(dt) {
      const { W, H } = getDims();
      const cols = Math.max(10, Math.floor(W / C));
      const rows = Math.max(10, Math.floor(H / C));

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
// GAME 2: PONG (Dynamic Fullscreen)
// ============================================================================
const pong = (k: Keys, _ctx: Ctx, getDims: () => { W: number; H: number }): Game => {
  let py = 200;
  let ay = 200;
  let sc = [0, 0];
  let b = { x: 300, y: 200, vx: 320, vy: 160 };

  const serve = (dir: number) => {
    const { W, H } = getDims();
    b = { x: W / 2, y: H / 2, vx: 320 * dir, vy: (Math.random() - 0.5) * 320 };
  };

  return {
    score: () => `${sc[0]} - ${sc[1]}`,
    over: () => sc[0] >= 7 || sc[1] >= 7,
    step(dt) {
      if (this.over()) return;
      const { W, H } = getDims();
      const P = Math.max(70, Math.min(130, H * 0.22));

      py = Math.max(0, Math.min(H - P, py + ((down(k) ? 1 : 0) - (up(k) ? 1 : 0)) * 440 * dt));
      ay = Math.max(0, Math.min(H - P, ay + Math.sign(b.y - P / 2 - ay) * Math.min(280 * dt, Math.abs(b.y - P / 2 - ay))));

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.y < 8 || b.y > H - 8) b.vy *= -1;

      // Left paddle
      if (b.vx < 0 && b.x < 36 && b.x > 14 && b.y > py && b.y < py + P) {
        b.vx = Math.abs(b.vx) * 1.05;
        b.vy = (b.y - (py + P / 2)) * 8;
      }
      // Right paddle
      if (b.vx > 0 && b.x > W - 36 && b.x < W - 14 && b.y > ay && b.y < ay + P) {
        b.vx = -Math.abs(b.vx) * 1.05;
        b.vy = (b.y - (ay + P / 2)) * 8;
      }

      if (b.x < 0) { sc[1]++; serve(1); }
      if (b.x > W) { sc[0]++; serve(-1); }
    },
    draw(c) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      const P = Math.max(70, Math.min(130, H * 0.22));

      // Center dividing line
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
// GAME 3: BREAKOUT (Dynamic Fullscreen)
// ============================================================================
const breakout = (k: Keys, _ctx: Ctx, getDims: () => { W: number; H: number }): Game => {
  let init = false;
  let px = 300;
  let b = { x: 300, y: 400, vx: 220, vy: -280 };
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
    step(dt) {
      const { W, H } = getDims();
      if (!init) {
        setupBricks(W);
        px = W / 2 - 50;
        b = { x: W / 2, y: H - 80, vx: 220, vy: -280 };
        init = true;
      }
      if (this.over()) return;
      const PW = Math.max(80, Math.min(140, W * 0.16));
      px = Math.max(0, Math.min(W - PW, px + ((right(k) ? 1 : 0) - (left(k) ? 1 : 0)) * 520 * dt));

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < 8 || b.x > W - 8) b.vx *= -1;
      if (b.y < 8) b.vy = Math.abs(b.vy);

      if (b.vy > 0 && b.y > H - 36 && b.y < H - 16 && b.x > px && b.x < px + PW) {
        b.vy = -Math.abs(b.vy);
        b.vx = (b.x - (px + PW / 2)) * 7;
      }

      if (b.y > H) {
        lives--;
        b = { x: W / 2, y: H - 80, vx: 220, vy: -280 };
      }

      const hit = bricks.find((r) => r.alive && b.x > r.x && b.x < r.x + r.w && b.y > r.y && b.y < r.y + r.h);
      if (hit) {
        hit.alive = false;
        b.vy *= -1;
      }
    },
    draw(c) {
      const W = c.canvas.width;
      const H = c.canvas.height;
      const PW = Math.max(80, Math.min(140, W * 0.16));

      bricks.forEach((r) => {
        if (!r.alive) return;
        neon(c, r.col, 8);
        c.fillRect(r.x, r.y, r.w, r.h);
      });

      neon(c, '#22d3ee');
      c.fillRect(px, H - 26, PW, 10);
      neon(c, '#fff');
      c.fillRect(b.x - 6, b.y - 6, 12, 12);
    },
  };
};

// ============================================================================
// GAME 4: DRIVE (Full-Viewport Road Map + Pictures in Buildings + WASD Menu)
// ============================================================================
const drive = (k: Keys, { projects }: Ctx, getDims: () => { W: number; H: number }): Game => {
  const GAP = 340;
  const cols = Math.max(1, Math.ceil(Math.sqrt(projects.length)));
  const rows = Math.max(1, Math.ceil(projects.length / cols));
  const WW = (cols + 1) * GAP;
  const WH = (rows + 1) * GAP;
  const spots = projects.map((p, i) => ({
    p,
    x: ((i % cols) + 1) * GAP + 70,
    y: (Math.floor(i / cols) + 1) * GAP + 70,
  }));
  const seen = new Set<string>();
  const car = { x: GAP / 2, y: GAP / 2, a: 0, v: 0 };
  let near: (typeof spots)[number] | null = null;

  // In-game menu state rendered directly on the canvas!
  let mode: 'drive' | 'menu' = 'drive';
  let selectedProjectIdx = 0;
  let selectedButton = 0; // 0: LIVE SITE, 1: SOURCE, 2: PREV, 3: NEXT, 4: RESUME

  // Preload project pictures for canvas rendering
  projects.forEach((p) => {
    const url = getProjectImageUrl(p.image);
    if (url) getOrLoadImage(p.id, url);
  });

  const road = (c: CanvasRenderingContext2D, horizontal: boolean, at: number) => {
    c.fillStyle = '#3a3631';
    if (horizontal) c.fillRect(0, at - 32, WW, 64);
    else c.fillRect(at - 32, 0, 64, WH);
  };

  const getMenuLayout = () => {
    const { W, H } = getDims();
    const isMobile = W < 540;
    const menuW = Math.min(620, W - 24);
    const menuH = Math.min(isMobile ? 480 : 380, H - (isMobile ? 140 : 40));
    const menuX = (W - menuW) / 2;
    const menuY = Math.max(15, (H - menuH) / 2 - (isMobile ? 40 : 0));

    const current = projects[selectedProjectIdx] || projects[0];

    // Buttons layout
    let btns = [];
    if (!isMobile) {
      btns = [
        {
          id: 'live',
          label: current?.live_link ? 'VISIT LIVE SITE ⇱' : 'NO LIVE LINK',
          x: menuX + 16,
          y: menuY + menuH - 80,
          w: (menuW - 40) / 2,
          h: 32,
          enabled: Boolean(current?.live_link),
          action: () => {
            if (current?.live_link) window.open(current.live_link, '_blank', 'noopener,noreferrer');
          },
        },
        {
          id: 'source',
          label: current?.github_repo ? 'SOURCE CODE ⌨' : 'NO REPO',
          x: menuX + 16 + (menuW - 40) / 2 + 8,
          y: menuY + menuH - 80,
          w: (menuW - 40) / 2,
          h: 32,
          enabled: Boolean(current?.github_repo),
          action: () => {
            if (current?.github_repo) window.open(current.github_repo, '_blank', 'noopener,noreferrer');
          },
        },
        {
          id: 'prev',
          label: '◀ PREV',
          x: menuX + 16,
          y: menuY + menuH - 42,
          w: 90,
          h: 28,
          enabled: true,
          action: () => {
            selectedProjectIdx = (selectedProjectIdx - 1 + projects.length) % projects.length;
          },
        },
        {
          id: 'next',
          label: 'NEXT ▶',
          x: menuX + 114,
          y: menuY + menuH - 42,
          w: 90,
          h: 28,
          enabled: true,
          action: () => {
            selectedProjectIdx = (selectedProjectIdx + 1) % projects.length;
          },
        },
        {
          id: 'resume',
          label: '✕ RESUME DRIVE',
          x: menuX + 212,
          y: menuY + menuH - 42,
          w: menuW - 228,
          h: 28,
          enabled: true,
          action: () => {
            mode = 'drive';
          },
        },
      ];
    } else {
      // Mobile compact layout
      const halfW = (menuW - 36) / 2;
      btns = [
        {
          id: 'live',
          label: current?.live_link ? 'LIVE SITE ⇱' : 'NO LINK',
          x: menuX + 14,
          y: menuY + menuH - 74,
          w: halfW,
          h: 30,
          enabled: Boolean(current?.live_link),
          action: () => {
            if (current?.live_link) window.open(current.live_link, '_blank', 'noopener,noreferrer');
          },
        },
        {
          id: 'source',
          label: current?.github_repo ? 'SOURCE ⌨' : 'NO REPO',
          x: menuX + 14 + halfW + 8,
          y: menuY + menuH - 74,
          w: halfW,
          h: 30,
          enabled: Boolean(current?.github_repo),
          action: () => {
            if (current?.github_repo) window.open(current.github_repo, '_blank', 'noopener,noreferrer');
          },
        },
        {
          id: 'prev',
          label: '◀ PREV',
          x: menuX + 14,
          y: menuY + menuH - 38,
          w: (menuW - 36) / 3,
          h: 28,
          enabled: true,
          action: () => {
            selectedProjectIdx = (selectedProjectIdx - 1 + projects.length) % projects.length;
          },
        },
        {
          id: 'next',
          label: 'NEXT ▶',
          x: menuX + 14 + (menuW - 36) / 3 + 4,
          y: menuY + menuH - 38,
          w: (menuW - 36) / 3,
          h: 28,
          enabled: true,
          action: () => {
            selectedProjectIdx = (selectedProjectIdx + 1) % projects.length;
          },
        },
        {
          id: 'resume',
          label: '✕ BACK',
          x: menuX + 14 + ((menuW - 36) / 3) * 2 + 8,
          y: menuY + menuH - 38,
          w: (menuW - 36) / 3 - 8,
          h: 28,
          enabled: true,
          action: () => {
            mode = 'drive';
          },
        },
      ];
    }

    return { menuX, menuY, menuW, menuH, isMobile, current, btns };
  };

  const executeSelectedButton = () => {
    const { btns } = getMenuLayout();
    btns[selectedButton]?.action();
  };

  return {
    score: () =>
      mode === 'menu'
        ? `PROJECT ${selectedProjectIdx + 1} OF ${projects.length}`
        : `${seen.size}/${projects.length} visited`,
    over: () => false,

    act: () => {
      if (mode === 'drive') {
        if (near) {
          const idx = projects.findIndex((p) => p.id === near!.p.id);
          selectedProjectIdx = idx >= 0 ? idx : 0;
          selectedButton = 0;
          mode = 'menu';
        }
      } else {
        executeSelectedButton();
      }
    },

    onKeyDown: (code: string) => {
      if (mode === 'menu') {
        // WASD / Arrow Key Navigation inside In-Game Menu
        if (code === 'KeyW' || code === 'ArrowUp') {
          if (selectedButton === 2 || selectedButton === 3) selectedButton = 0;
          else if (selectedButton === 4) selectedButton = 1;
          return true;
        }
        if (code === 'KeyS' || code === 'ArrowDown') {
          if (selectedButton === 0) selectedButton = 2;
          else if (selectedButton === 1) selectedButton = 4;
          return true;
        }
        if (code === 'KeyA' || code === 'ArrowLeft') {
          if (selectedButton === 1) selectedButton = 0;
          else if (selectedButton === 4) selectedButton = 3;
          else if (selectedButton === 3) selectedButton = 2;
          else if (selectedButton === 2) selectedButton = 4;
          return true;
        }
        if (code === 'KeyD' || code === 'ArrowRight') {
          if (selectedButton === 0) selectedButton = 1;
          else if (selectedButton === 2) selectedButton = 3;
          else if (selectedButton === 3) selectedButton = 4;
          else if (selectedButton === 4) selectedButton = 2;
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
        }
      }
    },

    step(dt) {
      if (mode === 'menu') return;

      car.v += ((up(k) ? 1 : 0) - (down(k) ? 1 : 0)) * 260 * dt;
      car.v *= Math.pow(0.35, dt);
      car.v = Math.max(-120, Math.min(260, car.v));
      car.a += ((right(k) ? 1 : 0) - (left(k) ? 1 : 0)) * 2.6 * dt * Math.max(-1, Math.min(1, car.v / 80));
      car.x = Math.max(10, Math.min(WW - 10, car.x + Math.cos(car.a) * car.v * dt));
      car.y = Math.max(10, Math.min(WH - 10, car.y + Math.sin(car.a) * car.v * dt));
      near = spots.find((s) => Math.hypot(s.x - car.x, s.y - car.y) < 70) ?? null;
      if (near) seen.add(near.p.id);
    },

    draw(c) {
      const W = c.canvas.width;
      const H = c.canvas.height;

      // 1. World View
      c.save();
      c.translate(W / 2 - car.x, H / 2 - car.y);
      c.fillStyle = '#1d1a16';
      c.fillRect(0, 0, WW, WH);

      for (let i = 1; i <= rows; i++) road(c, true, i * GAP);
      for (let i = 1; i <= cols; i++) road(c, false, i * GAP);

      c.strokeStyle = '#8a7a4a';
      c.lineWidth = 2;
      c.setLineDash([14, 14]);
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
      c.textAlign = 'center';

      // Draw each project building with its real picture inside!
      spots.forEach((s) => {
        const isNear = near?.p.id === s.p.id;

        // Building outer border
        c.fillStyle = isNear ? '#fbbf24' : seen.has(s.p.id) ? '#d97706' : '#e0a030';
        c.fillRect(s.x - 44, s.y - 44, 88, 88);

        // Building interior
        c.fillStyle = '#09090b';
        c.fillRect(s.x - 38, s.y - 38, 76, 76);

        // Draw project picture right here in the building!
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
          c.font = 'bold 12px monospace';
          c.fillText('PROJECT', s.x, s.y + 4);
        }

        // Inner outline over picture
        c.strokeStyle = isNear ? '#fbbf24' : 'rgba(255,255,255,0.2)';
        c.lineWidth = isNear ? 2 : 1;
        c.strokeRect(s.x - 38, s.y - 38, 76, 76);

        // Nameplate banner below building
        c.fillStyle = 'rgba(9, 9, 11, 0.9)';
        c.fillRect(s.x - 48, s.y + 46, 96, 20);
        c.strokeStyle = isNear ? '#fbbf24' : '#52525b';
        c.lineWidth = 1;
        c.strokeRect(s.x - 48, s.y + 46, 96, 20);
        c.fillStyle = isNear ? '#fbbf24' : '#e4e4e7';
        c.font = 'bold 11px monospace';
        c.textAlign = 'center';
        c.fillText(s.p.title.slice(0, 14), s.x, s.y + 60);
      });

      // Car
      c.translate(car.x, car.y);
      c.rotate(car.a);
      c.fillStyle = '#4aa3df';
      c.fillRect(-15, -9, 30, 18);
      c.fillStyle = '#cfe8f7';
      c.fillRect(2, -7, 9, 14);
      c.fillStyle = '#fff';
      c.fillRect(14, -8, 2, 4);
      c.fillRect(14, 4, 2, 4);
      c.restore();

      // Minimap in driving mode
      if (mode === 'drive') {
        const mw = Math.min(130, Math.max(90, W * 0.22));
        const mh = (mw * WH) / WW;
        c.fillStyle = 'rgba(0,0,0,0.75)';
        c.fillRect(W - mw - 16, 50, mw, mh);
        c.strokeStyle = '#e0a030';
        c.lineWidth = 1;
        c.strokeRect(W - mw - 16, 50, mw, mh);

        spots.forEach((s) => {
          c.fillStyle = seen.has(s.p.id) ? '#c8553d' : '#e0a030';
          c.fillRect(W - mw - 16 + (s.x / WW) * mw - 3, 50 + (s.y / WH) * mh - 3, 6, 6);
        });

        c.fillStyle = '#4aa3df';
        c.fillRect(W - mw - 16 + (car.x / WW) * mw - 2, 50 + (car.y / WH) * mh - 2, 4, 4);

        // Near prompt banner
        if (near) {
          const bw = Math.min(460, W - 32);
          c.fillStyle = 'rgba(10,10,14,0.92)';
          c.fillRect((W - bw) / 2, H - 76, bw, 52);
          c.strokeStyle = '#e0a030';
          c.lineWidth = 1.5;
          c.strokeRect((W - bw) / 2, H - 76, bw, 52);
          c.fillStyle = '#f59e0b';
          c.font = 'bold 15px monospace';
          c.textAlign = 'left';
          c.fillText(`▶ ${near.p.title.slice(0, 32)}`, (W - bw) / 2 + 16, H - 54);
          c.fillStyle = '#d6d0c4';
          c.font = '12px monospace';
          c.fillText('Press E / Enter or tap for in-game menu', (W - bw) / 2 + 16, H - 34);
        }
      }

      // =======================================================================
      // 2. IN-GAME CANVAS MENU (Zero Black Bars, Native Fullscreen Arcade HUD)
      // =======================================================================
      if (mode === 'menu') {
        const { menuX, menuY, menuW, menuH, isMobile, current, btns } = getMenuLayout();

        // Dark dim overlay with glowing arcade border
        c.fillStyle = 'rgba(6, 8, 14, 0.95)';
        c.fillRect(menuX, menuY, menuW, menuH);

        c.strokeStyle = '#e0a030';
        c.lineWidth = 2;
        c.strokeRect(menuX, menuY, menuW, menuH);
        c.strokeStyle = '#ffa73d';
        c.lineWidth = 1;
        c.strokeRect(menuX + 2, menuY + 2, menuW - 4, menuH - 4);

        // Header
        c.fillStyle = '#1c1917';
        c.fillRect(menuX + 3, menuY + 3, menuW - 6, 26);
        c.fillStyle = '#e0a030';
        c.font = 'bold 12px monospace';
        c.textAlign = 'left';
        c.fillText(`▶ DATA-CARD [${selectedProjectIdx + 1}/${projects.length}]`, menuX + 12, menuY + 20);

        c.textAlign = 'right';
        c.fillStyle = '#a1a1aa';
        c.font = '10px monospace';
        c.fillText('[Q/ESC] BACK', menuX + menuW - 12, menuY + 20);

        if (!isMobile) {
          // Desktop / Landscape layout: side-by-side
          const picW = Math.min(210, Math.floor(menuW * 0.42));
          const picH = Math.floor(picW * 0.72);

          // Picture frame
          c.fillStyle = '#09090b';
          c.fillRect(menuX + 16, menuY + 40, picW, picH);
          c.strokeStyle = '#e0a030';
          c.lineWidth = 1.5;
          c.strokeRect(menuX + 16, menuY + 40, picW, picH);

          const img = imageCache.get(current.id);
          if (img && img.complete && img.naturalWidth > 0) {
            c.save();
            c.beginPath();
            c.rect(menuX + 17, menuY + 41, picW - 2, picH - 2);
            c.clip();
            c.drawImage(img, menuX + 17, menuY + 41, picW - 2, picH - 2);
            c.restore();
          } else {
            c.fillStyle = '#71717a';
            c.font = '11px monospace';
            c.textAlign = 'center';
            c.fillText('LOADING IMAGE...', menuX + 16 + picW / 2, menuY + 40 + picH / 2);
          }

          if (current.is_featured) {
            c.fillStyle = '#e0a030';
            c.fillRect(menuX + 20, menuY + 44, 68, 15);
            c.fillStyle = '#000';
            c.font = 'bold 9px monospace';
            c.textAlign = 'center';
            c.fillText('FEATURED', menuX + 54, menuY + 55);
          }

          // Tags below picture
          c.textAlign = 'left';
          c.fillStyle = '#fbbf24';
          c.font = 'bold 10px monospace';
          const tags = (current.tags || []).slice(0, 3).map((t) => `[${t}]`).join(' ');
          c.fillText(tags.slice(0, 26), menuX + 16, menuY + 40 + picH + 16);

          // Right Column: Title & Description
          const rightX = menuX + 16 + picW + 16;
          const rightW = menuW - (16 + picW + 32);

          c.fillStyle = '#ffa73d';
          c.font = 'bold 15px monospace';
          c.textAlign = 'left';
          c.fillText(current.title.slice(0, 26), rightX, menuY + 54);

          c.strokeStyle = '#3f3f46';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(rightX, menuY + 62);
          c.lineTo(rightX + rightW, menuY + 62);
          c.stroke();

          c.fillStyle = '#d4d4d8';
          c.font = '11px monospace';
          wrapCanvasText(c, current.description || 'No description provided.', rightX, menuY + 78, rightW, 16, 6);
        } else {
          // Mobile Portrait stacked layout
          const picH = 95;
          const picW = menuW - 32;

          c.fillStyle = '#09090b';
          c.fillRect(menuX + 16, menuY + 36, picW, picH);
          c.strokeStyle = '#e0a030';
          c.lineWidth = 1.5;
          c.strokeRect(menuX + 16, menuY + 36, picW, picH);

          const img = imageCache.get(current.id);
          if (img && img.complete && img.naturalWidth > 0) {
            c.save();
            c.beginPath();
            c.rect(menuX + 17, menuY + 37, picW - 2, picH - 2);
            c.clip();
            c.drawImage(img, menuX + 17, menuY + 37, picW - 2, picH - 2);
            c.restore();
          }

          c.fillStyle = '#ffa73d';
          c.font = 'bold 13px monospace';
          c.textAlign = 'left';
          c.fillText(current.title.slice(0, 28), menuX + 16, menuY + 148);

          c.fillStyle = '#d4d4d8';
          c.font = '10px monospace';
          wrapCanvasText(c, current.description || '', menuX + 16, menuY + 164, menuW - 32, 14, 3);
        }

        // Draw Buttons
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

const GAMES: Record<string, (k: Keys, ctx: Ctx, getDims: () => { W: number; H: number }) => Game> = {
  snake,
  pong,
  breakout,
  drive,
};

const HINTS: Record<string, string> = {
  snake: 'WASD / arrows to steer',
  pong: 'W/S or up/down. First to 7',
  breakout: 'A/D or left/right',
  drive: 'W/S gas & brake, A/D steer · Press E / Enter or tap for in-game menu',
};

const press = (code: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));

const Btn: React.FC<{ code: string; hold?: boolean; children: React.ReactNode }> = ({ code, hold, children }) => (
  <button
    className="w-13 h-13 rounded-full border-2 border-amber-400/60 bg-black/50 backdrop-blur-md text-amber-300 touch-none select-none active:bg-amber-400/30 active:scale-95 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center justify-center font-bold text-sm cursor-pointer"
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

  // Automatically request browser fullscreen
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch {
        // Ignored if user gesture requirement applies
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

        c.shadowBlur = 0;
        c.fillStyle = '#05070d';
        c.fillRect(0, 0, canvas.width, canvas.height);
        g.draw(c);
        c.shadowBlur = 0;

        if (g.over()) {
          c.fillStyle = 'rgba(0,0,0,0.65)';
          c.fillRect(0, 0, canvas.width, canvas.height);
          neon(c, '#fff', 0);
          c.font = 'bold 32px monospace';
          c.textAlign = 'center';
          c.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
          c.font = '16px monospace';
          c.fillText('SPACE to restart', canvas.width / 2, canvas.height / 2 + 22);
        }
        if (hud.current) hud.current.textContent = `SCORE  ${g.score()}`;
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
  }, [game, projects, isPaused, onOpen]);

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
      {/* 100% Fullscreen Edge-to-Edge Canvas (No Black Bars) */}
      <canvas
        ref={ref}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full cursor-pointer block"
      />

      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.18)_0_2px,transparent_2px_4px)]" />

      {/* Floating Minimal Header */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="uppercase tracking-[0.4em] text-sm sm:text-base font-bold text-amber-300 drop-shadow">
            {game}
          </span>
          <div ref={hud} className="text-xs sm:text-sm font-bold text-amber-200/90 drop-shadow" />
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-zinc-950/80 hover:bg-zinc-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 transition cursor-pointer backdrop-blur shadow"
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

      {/* Mobile Touch Controls FLOATING ON TOP OF THE GAME (Never Shrinking Canvas) */}
      {touch && (
        <div className="absolute inset-0 pointer-events-none z-30 select-none">
          {/* Virtual D-pad Floating on Bottom-Left */}
          <div className="absolute left-3 bottom-6 pointer-events-auto">
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

          {/* Action Buttons Floating on Bottom-Right */}
          <div className="absolute right-4 bottom-6 pointer-events-auto flex flex-col gap-2.5">
            <Btn code="KeyE">Act</Btn>
            <Btn code="Space">Retry</Btn>
            <Btn code="Escape">Exit</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

export default Arcade;
