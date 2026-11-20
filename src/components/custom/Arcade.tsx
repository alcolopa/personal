import React, { useEffect, useRef, useState } from 'react';
import { Project } from '@/types/Project';
import { getProjectImageUrl } from '@/lib/projectUtils';
import stationAudio from '@/lib/stationAudio';
import { Maximize, Minimize, RefreshCw, Gamepad2 } from 'lucide-react';

type Ctx = { projects: Project[]; open: (p: Project) => void };
type Dims = {
  W: number;
  H: number;
  touch: boolean;
  joy: { x: number; y: number };
};
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
  getGameOverText?: () => { title: string; subtitle: string };
};
type Keys = Set<string>;

const up = (k: Keys) => k.has('ArrowUp') || k.has('KeyW');
const down = (k: Keys) => k.has('ArrowDown') || k.has('KeyS');
const left = (k: Keys) => k.has('ArrowLeft') || k.has('KeyA');
const right = (k: Keys) => k.has('ArrowRight') || k.has('KeyD');
const driftKey = (k: Keys) => k.has('Space') || k.has('KeyX');
const boostKey = (k: Keys) => k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyB');

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
// GAME 1: SNAKE (Joystick & Direction Buffering Support)
// ============================================================================
const snake = (k: Keys, _ctx: Ctx, getDims: () => Dims): Game => {
  const C = 24;
  let s = [{ x: 8, y: 8 }];
  let d = { x: 1, y: 0 };
  let lastD = { x: 1, y: 0 };
  let nextD: { x: number; y: number } | null = null;
  let f = { x: 4, y: 4 };
  let t = 0;
  let dead = false;
  let score = 0;

  const spawnFood = (cols: number, rows: number) => {
    const occupied = new Set(s.map((p) => `${p.x},${p.y}`));
    const free: { x: number; y: number }[] = [];
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (free.length > 0) {
      f = free[Math.floor(Math.random() * free.length)];
    } else {
      f = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    }
  };

  const setDir = (nx: number, ny: number) => {
    if (nx === -lastD.x && ny === -lastD.y) return;
    nextD = { x: nx, y: ny };
  };

  const restart = () => {
    s = [{ x: 8, y: 8 }];
    d = { x: 1, y: 0 };
    lastD = { x: 1, y: 0 };
    nextD = null;
    dead = false;
    score = 0;
    const { W, H, touch } = getDims();
    const bottomSafe = touch ? 140 : 20;
    spawnFood(Math.max(8, Math.floor(W / C)), Math.max(8, Math.floor((H - bottomSafe) / C)));
  };

  return {
    score: () => String(score),
    over: () => dead,
    getGameOverText: () => ({
      title: 'GAME OVER',
      subtitle: `FINAL SCORE: ${score}`,
    }),
    act: () => {
      if (dead) restart();
    },
    onClick: (cx, cy) => {
      if (dead) {
        restart();
        return;
      }
      const hx = s[0].x * C + C / 2;
      const hy = s[0].y * C + C / 2;
      const dx = cx - hx;
      const dy = cy - hy;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) setDir(1, 0);
        else if (dx < 0) setDir(-1, 0);
      } else {
        if (dy > 0) setDir(0, 1);
        else if (dy < 0) setDir(0, -1);
      }
    },
    step(dt) {
      const { W, H, touch, joy } = getDims();
      const bottomSafe = touch ? 140 : 20;
      const cols = Math.max(8, Math.floor(W / C));
      const rows = Math.max(8, Math.floor((H - bottomSafe) / C));

      // 1. Joystick input check
      if (joy && Math.hypot(joy.x, joy.y) > 0.35) {
        if (Math.abs(joy.x) > Math.abs(joy.y)) {
          if (joy.x > 0.35) setDir(1, 0);
          else if (joy.x < -0.35) setDir(-1, 0);
        } else {
          if (joy.y > 0.35) setDir(0, 1);
          else if (joy.y < -0.35) setDir(0, -1);
        }
      } else {
        // 2. Keyboard fallback
        if (up(k)) setDir(0, -1);
        else if (down(k)) setDir(0, 1);
        else if (left(k)) setDir(-1, 0);
        else if (right(k)) setDir(1, 0);
      }

      t += dt;
      if (t < 0.08 || dead) return;
      t = 0;

      if (nextD) {
        d = nextD;
        nextD = null;
      }
      lastD = d;

      const h = { x: s[0].x + d.x, y: s[0].y + d.y };
      if (h.x < 0 || h.y < 0 || h.x >= cols || h.y >= rows || s.some((p) => p.x === h.x && p.y === h.y)) {
        if (!dead) {
          dead = true;
          stationAudio.playCarBump();
        }
        return;
      }

      s.unshift(h);
      if (h.x === f.x && h.y === f.y) {
        score++;
        stationAudio.playCoinPickup();
        spawnFood(cols, rows);
      } else {
        s.pop();
      }
    },
    draw(c) {
      neon(c, '#f43f5e', 14);
      c.fillRect(f.x * C + 3, f.y * C + 3, C - 6, C - 6);
      neon(c, '#34d399', 10);
      s.forEach((p, idx) => {
        if (idx === 0) {
          c.fillStyle = '#6ee7b7';
        } else {
          c.fillStyle = '#10b981';
        }
        c.fillRect(p.x * C + 1, p.y * C + 1, C - 2, C - 2);
      });
    },
  };
};

// ============================================================================
// GAME 2: PONG (Analog Joystick & Continuous Physics Support)
// ============================================================================
const pong = (k: Keys, _ctx: Ctx, getDims: () => Dims): Game => {
  let py = 200;
  let ay = 200;
  let sc = [0, 0];
  let b = { x: 300, y: 200, vx: 360, vy: 160 };
  const BALL_R = 7;

  const serve = (dir: number) => {
    const { W, H } = getDims();
    b = { x: W / 2, y: H / 2, vx: 360 * dir, vy: (Math.random() - 0.5) * 320 };
  };

  const isOver = () => sc[0] >= 7 || sc[1] >= 7;
  const restart = () => {
    sc = [0, 0];
    serve(1);
  };

  return {
    score: () => `${sc[0]} - ${sc[1]}`,
    over: isOver,
    getGameOverText: () => ({
      title: sc[0] >= 7 ? 'VICTORY!' : 'AI WINS!',
      subtitle: `${sc[0]} - ${sc[1]}`,
    }),
    act: () => {
      if (isOver()) restart();
    },
    onClick: (_cx, cy) => {
      if (isOver()) {
        restart();
        return;
      }
      const { H } = getDims();
      const P = Math.max(70, Math.min(130, H * 0.22));
      py = Math.max(0, Math.min(H - P, cy - P / 2));
    },
    step(dt) {
      if (isOver()) return;
      const { W, H, joy } = getDims();
      const P = Math.max(70, Math.min(130, H * 0.22));

      // Joystick Analog Y or Keyboard UP/DOWN
      let dir = (down(k) ? 1 : 0) - (up(k) ? 1 : 0);
      if (joy && Math.abs(joy.y) > 0.08) {
        dir = joy.y;
      }

      py = Math.max(0, Math.min(H - P, py + dir * 520 * dt));
      ay = Math.max(0, Math.min(H - P, ay + Math.sign(b.y - P / 2 - ay) * Math.min(340 * dt, Math.abs(b.y - P / 2 - ay))));

      const prevX = b.x;
      const nextX = b.x + b.vx * dt;
      b.x = nextX;
      b.y += b.vy * dt;

      // Top and bottom bounds
      if (b.y < BALL_R) {
        b.y = BALL_R;
        b.vy = Math.abs(b.vy);
      } else if (b.y > H - BALL_R) {
        b.y = H - BALL_R;
        b.vy = -Math.abs(b.vy);
      }

      // Left Player Paddle Collision
      const pEdge = 30;
      if (b.vx < 0 && prevX - BALL_R >= pEdge && b.x - BALL_R <= pEdge) {
        if (b.y + BALL_R >= py && b.y - BALL_R <= py + P) {
          b.x = pEdge + BALL_R;
          b.vx = Math.min(750, Math.abs(b.vx) * 1.06);
          b.vy = ((b.y - (py + P / 2)) / (P / 2)) * 320;
          stationAudio.playDriftScreech(0.4);
        }
      }

      // Right AI Paddle Collision
      const aiEdge = W - 30;
      if (b.vx > 0 && prevX + BALL_R <= aiEdge && b.x + BALL_R >= aiEdge) {
        if (b.y + BALL_R >= ay && b.y - BALL_R <= ay + P) {
          b.x = aiEdge - BALL_R;
          b.vx = -Math.min(750, Math.abs(b.vx) * 1.06);
          b.vy = ((b.y - (ay + P / 2)) / (P / 2)) * 320;
          stationAudio.playDriftScreech(0.4);
        }
      }

      if (b.x < 0) {
        sc[1]++;
        stationAudio.playCarBump();
        serve(1);
      } else if (b.x > W) {
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

      neon(c, '#22d3ee', 12);
      c.fillRect(20, py, 10, P);
      neon(c, '#f472b6', 12);
      c.fillRect(W - 30, ay, 10, P);
      neon(c, '#ffffff', 10);
      c.fillRect(b.x - BALL_R, b.y - BALL_R, BALL_R * 2, BALL_R * 2);
    },
  };
};

// ============================================================================
// GAME 3: BREAKOUT (Analog Joystick Paddle Steering Support)
// ============================================================================
const breakout = (k: Keys, _ctx: Ctx, getDims: () => Dims): Game => {
  let init = false;
  let px = 300;
  let b = { x: 300, y: 400, vx: 260, vy: -320 };
  let lives = 3;
  let bricks: { x: number; y: number; w: number; h: number; alive: boolean; col: string }[] = [];
  const BALL_R = 6;
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

  const isWon = () => bricks.length > 0 && bricks.every((x) => !x.alive);
  const isOver = () => lives <= 0 || isWon();

  const restart = () => {
    const { W, H, touch } = getDims();
    const bottomMargin = touch ? 140 : 26;
    setupBricks(W);
    px = W / 2 - 50;
    b = { x: W / 2, y: H - (bottomMargin + 60), vx: 260, vy: -320 };
    lives = 3;
  };

  return {
    score: () => `${bricks.filter((x) => !x.alive).length}  ♥${lives}`,
    over: isOver,
    getGameOverText: () => ({
      title: isWon() ? 'ALL BRICKS CLEARED!' : 'GAME OVER',
      subtitle: isWon() ? 'EXCELLENT RUN!' : `BRICKS BROKEN: ${bricks.filter((x) => !x.alive).length}`,
    }),
    act: () => {
      if (isOver()) restart();
    },
    onClick: (cx) => {
      if (isOver()) {
        restart();
        return;
      }
      const { W } = getDims();
      const PW = Math.max(80, Math.min(140, W * 0.16));
      px = Math.max(0, Math.min(W - PW, cx - PW / 2));
    },
    step(dt) {
      const { W, H, touch, joy } = getDims();
      const bottomMargin = touch ? 140 : 26;
      if (!init) {
        setupBricks(W);
        px = W / 2 - 50;
        b = { x: W / 2, y: H - (bottomMargin + 60), vx: 260, vy: -320 };
        init = true;
      }
      if (isOver()) return;

      const PW = Math.max(80, Math.min(140, W * 0.16));

      // Joystick Analog X or Keyboard LEFT/RIGHT
      let dir = (right(k) ? 1 : 0) - (left(k) ? 1 : 0);
      if (joy && Math.abs(joy.x) > 0.08) {
        dir = joy.x;
      }
      px = Math.max(0, Math.min(W - PW, px + dir * 600 * dt));

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Wall reflections
      if (b.x < BALL_R) {
        b.x = BALL_R;
        b.vx = Math.abs(b.vx);
      } else if (b.x > W - BALL_R) {
        b.x = W - BALL_R;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y < BALL_R) {
        b.y = BALL_R;
        b.vy = Math.abs(b.vy);
      }

      // Paddle collision
      const padY = H - bottomMargin;
      if (
        b.vy > 0 &&
        b.y + BALL_R >= padY &&
        b.y - BALL_R <= padY + 10 &&
        b.x + BALL_R >= px &&
        b.x - BALL_R <= px + PW
      ) {
        b.y = padY - BALL_R;
        b.vy = -Math.abs(b.vy);
        const hitOffset = (b.x - (px + PW / 2)) / (PW / 2);
        b.vx = hitOffset * 340;
        stationAudio.playDriftScreech(0.3);
      }

      // Ball loss
      if (b.y > H - (bottomMargin - 30)) {
        lives--;
        stationAudio.playCarBump();
        b = { x: W / 2, y: H - (bottomMargin + 60), vx: 260, vy: -320 };
      }

      // Brick AABB collision
      for (const r of bricks) {
        if (!r.alive) continue;
        if (
          b.x + BALL_R >= r.x &&
          b.x - BALL_R <= r.x + r.w &&
          b.y + BALL_R >= r.y &&
          b.y - BALL_R <= r.y + r.h
        ) {
          r.alive = false;
          stationAudio.playCoinPickup();

          const prevX = b.x - b.vx * dt;
          if (prevX + BALL_R < r.x || prevX - BALL_R > r.x + r.w) {
            b.vx *= -1;
          } else {
            b.vy *= -1;
          }
          break;
        }
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

      neon(c, '#22d3ee', 10);
      c.fillRect(px, H - bottomMargin, PW, 10);
      neon(c, '#ffffff', 8);
      c.fillRect(b.x - BALL_R, b.y - BALL_R, BALL_R * 2, BALL_R * 2);
    },
  };
};

// ============================================================================
// GAME 4: CYBER DRIFT (Analog Joystick Steering & Throttle Support)
// ============================================================================

interface TrackPoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
  tx: number;
  ty: number;
  angle: number;
  isApex: boolean;
  isDriftZone: boolean;
  isBoostPad: boolean;
}

interface ProjectSpot {
  p: Project;
  x: number;
  y: number;
  roadIdx: number;
  nx: number;
  ny: number;
}

type TrackArchetype = 'circuit' | 'touge' | 'metropolis' | 'arena';

const ARCHETYPE_NAMES: Record<TrackArchetype, string> = {
  circuit: 'GRAND PRIX CIRCUIT',
  touge: 'NEON TOUGE PASS',
  metropolis: 'CYBER CITY RING',
  arena: 'OMEGA DRIFT ARENA',
};

// Procedural Track Generator
function generateProceduralTrack(archetype: TrackArchetype, projects: Project[]) {
  const WW = 2800;
  const WH = 2400;
  const cx = WW / 2;
  const cy = WH / 2;
  let controlPoints: { x: number; y: number }[] = [];

  if (archetype === 'circuit') {
    const rx = 1050;
    const ry = 850;
    const N = 14;
    for (let i = 0; i < N; i++) {
      const theta = (i * Math.PI * 2) / N;
      let rOffset = (Math.sin(theta * 3) + Math.cos(theta * 2)) * 140;
      if (i === 3 || i === 4) rOffset -= 220;
      if (i === 8) rOffset += 240;
      if (i === 11) rOffset -= 180;
      const rX = rx + rOffset * 0.9;
      const rY = ry + rOffset * 0.9;
      controlPoints.push({
        x: cx + Math.cos(theta) * rX + (Math.random() - 0.5) * 60,
        y: cy + Math.sin(theta) * rY + (Math.random() - 0.5) * 60,
      });
    }
  } else if (archetype === 'touge') {
    controlPoints = [
      { x: cx - 950, y: cy - 750 },
      { x: cx - 400, y: cy - 800 },
      { x: cx + 500, y: cy - 750 },
      { x: cx + 900, y: cy - 500 },
      { x: cx + 600, y: cy - 250 },
      { x: cx - 200, y: cy - 300 },
      { x: cx - 750, y: cy - 50 },
      { x: cx - 100, y: cy + 100 },
      { x: cx + 700, y: cy + 50 },
      { x: cx + 950, y: cy + 400 },
      { x: cx + 450, y: cy + 700 },
      { x: cx - 500, y: cy + 750 },
      { x: cx - 950, y: cy + 450 },
      { x: cx - 850, y: cy - 200 },
    ];
  } else if (archetype === 'metropolis') {
    const R = 720;
    controlPoints = [
      { x: cx - R, y: cy - R },
      { x: cx, y: cy - R - 150 },
      { x: cx + R, y: cy - R },
      { x: cx + R + 180, y: cy },
      { x: cx + R, y: cy + R },
      { x: cx + 180, y: cy + 300 },
      { x: cx, y: cy },
      { x: cx - 180, y: cy + 300 },
      { x: cx - R, y: cy + R },
      { x: cx - R - 180, y: cy },
    ];
  } else {
    const R = 540;
    controlPoints = [
      { x: cx - R, y: cy - 420 },
      { x: cx - R - 220, y: cy - 100 },
      { x: cx - R, y: cy + 280 },
      { x: cx - 180, y: cy + 180 },
      { x: cx, y: cy },
      { x: cx + 180, y: cy - 180 },
      { x: cx + R, y: cy - 280 },
      { x: cx + R + 220, y: cy + 100 },
      { x: cx + R, y: cy + 420 },
      { x: cx + 220, y: cy + 340 },
      { x: cx, y: cy },
      { x: cx - 220, y: cy - 340 },
    ];
  }

  const points: { x: number; y: number }[] = [];
  const N = controlPoints.length;
  for (let i = 0; i < N; i++) {
    const p0 = controlPoints[(i - 1 + N) % N];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % N];
    const p3 = controlPoints[(i + 2) % N];

    const steps = 45;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.x - 3 * p2.y + p3.y) * t3);
      points.push({ x, y });
    }
  }

  const trackPoints: TrackPoint[] = [];
  const total = points.length;
  for (let i = 0; i < total; i++) {
    const prev = points[(i - 1 + total) % total];
    const curr = points[i];
    const next = points[(i + 1) % total];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const tx = dx / len;
    const ty = dy / len;
    const nx = -ty;
    const ny = tx;
    const angle = Math.atan2(ty, tx);

    const prevAngle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const nextAngle = Math.atan2(next.y - curr.y, next.x - curr.x);
    let diff = Math.abs(nextAngle - prevAngle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;

    const isApex = diff > 0.045;
    const isDriftZone = diff > 0.025;
    const isBoostPad = !isApex && !isDriftZone && i % 85 === 0;

    trackPoints.push({
      x: curr.x,
      y: curr.y,
      nx,
      ny,
      tx,
      ty,
      angle,
      isApex,
      isDriftZone,
      isBoostPad,
    });
  }

  const spots: ProjectSpot[] = [];
  const numProjects = projects.length;
  for (let idx = 0; idx < numProjects; idx++) {
    const targetIdx = Math.floor((idx + 0.5) * (total / numProjects)) % total;
    const tp = trackPoints[targetIdx];
    const bayDistance = 125;
    const side = idx % 2 === 0 ? 1 : -1;
    spots.push({
      p: projects[idx],
      x: tp.x + tp.nx * (bayDistance * side),
      y: tp.y + tp.ny * (bayDistance * side),
      roadIdx: targetIdx,
      nx: tp.nx * side,
      ny: tp.ny * side,
    });
  }

  return { WW, WH, trackPoints, spots };
}

const drive = (
  k: Keys,
  { projects }: Ctx,
  getDims: () => Dims
): Game => {
  const archetypes: TrackArchetype[] = ['circuit', 'touge', 'metropolis', 'arena'];
  let currentArchetypeIdx = Math.floor(Math.random() * archetypes.length);

  let { WW, WH, trackPoints, spots } = generateProceduralTrack(
    archetypes[currentArchetypeIdx],
    projects
  );

  const seen = new Set<string>();

  const car = {
    x: trackPoints[0]?.x || 400,
    y: trackPoints[0]?.y || 400,
    a: trackPoints[0]?.angle || 0,
    vx: 0,
    vy: 0,
    v: 0,
    steerAngle: 0,
    nitro: 100,
    isAccelerating: false,
    isBraking: false,
    isBoosting: false,
    isDrifting: false,
    driftTime: 0,
    driftScore: 0,
    driftCombo: 1.0,
    miniTurboCharge: 0,
    totalScore: 0,
  };

  let near: ProjectSpot | null = null;
  let mode: 'drive' | 'menu' = 'drive';
  let selectedProjectIdx = 0;
  let selectedButton = 0;

  let stars: { id: number; x: number; y: number; collected: boolean; anim: number }[] = [];
  let nitroPods: { id: number; x: number; y: number; collected: boolean; respawn: number }[] = [];
  let cones: { x: number; y: number; vx: number; vy: number; rot: number; vrot: number }[] = [];
  let npcCars: {
    id: number;
    trackIdx: number;
    x: number;
    y: number;
    a: number;
    v: number;
    color: string;
    nearMissed: boolean;
  }[] = [];

  const npcColors = ['#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#06b6d4'];

  const initTrackItems = () => {
    stars = [];
    const starInterval = Math.floor(trackPoints.length / 28);
    for (let i = 0; i < trackPoints.length; i += starInterval) {
      const tp = trackPoints[i];
      stars.push({
        id: i,
        x: tp.x + tp.nx * (Math.sin(i) * 16),
        y: tp.y + tp.ny * (Math.sin(i) * 16),
        collected: false,
        anim: Math.random() * Math.PI * 2,
      });
    }

    nitroPods = [];
    for (let i = 0; i < trackPoints.length; i += Math.floor(trackPoints.length / 8)) {
      const tp = trackPoints[i];
      nitroPods.push({
        id: i,
        x: tp.x + tp.nx * 38,
        y: tp.y + tp.ny * 38,
        collected: false,
        respawn: 0,
      });
    }

    cones = [];
    trackPoints.forEach((tp, i) => {
      if (tp.isApex && i % 18 === 0) {
        cones.push({
          x: tp.x + tp.nx * 44,
          y: tp.y + tp.ny * 44,
          vx: 0,
          vy: 0,
          rot: 0,
          vrot: 0,
        });
      }
    });
    spots.forEach((s) => {
      cones.push({ x: s.x - 38, y: s.y + 40, vx: 0, vy: 0, rot: 0, vrot: 0 });
      cones.push({ x: s.x + 38, y: s.y + 40, vx: 0, vy: 0, rot: 0, vrot: 0 });
    });

    npcCars = Array.from({ length: 4 }, (_, idx) => {
      const startIdx = Math.floor((idx + 0.3) * (trackPoints.length / 4)) % trackPoints.length;
      const tp = trackPoints[startIdx];
      return {
        id: idx,
        trackIdx: startIdx,
        x: tp.x,
        y: tp.y,
        a: tp.angle,
        v: 140 + Math.random() * 50,
        color: npcColors[idx % npcColors.length],
        nearMissed: false,
      };
    });
  };

  initTrackItems();

  const skidMarks: { x1: number; y1: number; x2: number; y2: number; alpha: number; color?: string }[] = [];
  const particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    alpha: number;
    color: string;
    life: number;
    maxLife: number;
  }[] = [];
  const popups: { text: string; x: number; y: number; color: string; alpha: number; scale: number }[] = [];

  const addPopup = (text: string, x: number, y: number, color = '#fbbf24') => {
    popups.push({ text, x, y, color, alpha: 1.0, scale: 1.2 });
  };

  const regenerateNewTrack = () => {
    currentArchetypeIdx = (currentArchetypeIdx + 1) % archetypes.length;
    const generated = generateProceduralTrack(archetypes[currentArchetypeIdx], projects);
    WW = generated.WW;
    WH = generated.WH;
    trackPoints = generated.trackPoints;
    spots = generated.spots;

    car.x = trackPoints[0].x;
    car.y = trackPoints[0].y;
    car.a = trackPoints[0].angle;
    car.vx = 0;
    car.vy = 0;
    car.v = 0;
    car.nitro = 100;
    car.isBoosting = false;
    car.isDrifting = false;
    car.driftScore = 0;

    skidMarks.length = 0;
    particles.length = 0;
    initTrackItems();

    stationAudio.playNitroBoost();
    addPopup(
      `TRACK GENERATED: ${ARCHETYPE_NAMES[archetypes[currentArchetypeIdx]]}`,
      car.x,
      car.y - 45,
      '#38bdf8'
    );
  };

  projects.forEach((p) => {
    const url = getProjectImageUrl(p.image);
    if (url) getOrLoadImage(p.id, url);
  });

  const getMenuLayout = () => {
    const { W, H } = getDims();
    const isMobile = W < 640;
    const isLandscape = W >= H && H < 500;
    const current = projects[selectedProjectIdx] || projects[0];

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
        : `${ARCHETYPE_NAMES[archetypes[currentArchetypeIdx]]} · ${car.totalScore + car.driftScore} PTS · ${seen.size}/${projects.length} VISITED`,
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
      if (mode === 'drive') {
        if (code === 'KeyR') {
          regenerateNewTrack();
          return true;
        }
      }
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

      const { joy } = getDims();

      // --- 1. Controls & Input Mapping ---
      const joyMag = joy ? Math.min(1, Math.hypot(joy.x, joy.y)) : 0;
      const JOY_DEADZONE = 0.12;
      const usingJoystick = joyMag > JOY_DEADZONE;

      let throttleInput = up(k) ? 1 : 0;
      const brakeInput = down(k) ? 1 : 0;
      let steerInput = (right(k) ? 1 : 0) - (left(k) ? 1 : 0);
      let targetAngle = car.a;
      let angleDiff = 0;

      if (usingJoystick) {
        // Directional (follow-stick) 360° steering: point the stick where you want the car to go
        const stickPower = (joyMag - JOY_DEADZONE) / (1 - JOY_DEADZONE);
        targetAngle = Math.atan2(joy.y, joy.x);
        angleDiff = Math.atan2(Math.sin(targetAngle - car.a), Math.cos(targetAngle - car.a));

        if (Math.abs(angleDiff) < 0.03) {
          steerInput = 0;
        } else {
          steerInput = Math.max(-1, Math.min(1, angleDiff / 0.75));
        }

        // Auto-throttle from stick deflection unless actively holding BRAKE
        if (brakeInput === 0) {
          // Ease throttle gently on sharp turns so the car carves tight corners cleanly
          const turnAlignment = Math.max(0.45, Math.cos(angleDiff * 0.65));
          throttleInput = Math.max(throttleInput, stickPower * turnAlignment);
        }
      }

      car.isAccelerating = throttleInput > 0.05;
      car.isBraking = brakeInput > 0.05;

      const wantDrift = driftKey(k);
      const wantBoost = boostKey(k);

      // --- 2. Steering Interpolation ---
      const targetSteer = steerInput * 0.46; // ~26 deg
      car.steerAngle += (targetSteer - car.steerAngle) * Math.min(1, (usingJoystick ? 20 : 14) * dt);

      // --- 3. Nitro Boost Logic ---
      const isBoosting = wantBoost && car.nitro > 4 && throttleInput > 0;
      if (isBoosting) {
        car.nitro = Math.max(0, car.nitro - 34 * dt);
        car.isBoosting = true;
        if (Math.random() < 0.25) stationAudio.playNitroBoost();
      } else {
        car.isBoosting = false;
        car.nitro = Math.min(100, car.nitro + 8 * dt);
      }

      const maxSpeed = car.isBoosting ? 680 : 470;
      const accel = car.isBoosting ? 1180 : 560;

      const fwdX = Math.cos(car.a);
      const fwdY = Math.sin(car.a);
      const rightX = -Math.sin(car.a);
      const rightY = Math.cos(car.a);

      let forwardVel = car.vx * fwdX + car.vy * fwdY;
      let lateralVel = car.vx * rightX + car.vy * rightY;

      // Throttle & Brake
      if (throttleInput > 0) {
        forwardVel += accel * throttleInput * dt;
      }
      if (brakeInput > 0) {
        if (forwardVel > 30) {
          forwardVel -= 820 * brakeInput * dt;
        } else {
          forwardVel -= 300 * brakeInput * dt;
        }
      }

      // --- 4. Drift Physics & Lateral Slip ---
      const speed = Math.hypot(car.vx, car.vy);
      const isDriftingInput = wantDrift || (brakeInput > 0 && Math.abs(steerInput) > 0.3 && speed > 150);
      const isSlipping = Math.abs(lateralVel) > 85 || (isDriftingInput && speed > 120);

      const lateralGrip = isDriftingInput ? 0.42 : isSlipping ? 0.55 : 0.94;
      const lateralFriction = Math.pow(1 - lateralGrip, dt * 10);

      let nearestPoint = trackPoints[0];
      let minTrackDist = 999999;
      for (let i = 0; i < trackPoints.length; i += 3) {
        const d = Math.hypot(trackPoints[i].x - car.x, trackPoints[i].y - car.y);
        if (d < minTrackDist) {
          minTrackDist = d;
          nearestPoint = trackPoints[i];
        }
      }

      const isOffRoad = minTrackDist > 65;
      const rollingFriction = Math.pow(isOffRoad ? 0.88 : 0.94, dt * 5);

      lateralVel *= lateralFriction;
      forwardVel *= rollingFriction;

      // Off-road dust particles
      if (isOffRoad && speed > 80 && Math.random() < 0.4) {
        particles.push({
          x: car.x + (Math.random() - 0.5) * 16,
          y: car.y + (Math.random() - 0.5) * 16,
          vx: -car.vx * 0.15 + (Math.random() - 0.5) * 30,
          vy: -car.vy * 0.15 + (Math.random() - 0.5) * 30,
          r: 5 + Math.random() * 5,
          alpha: 0.4,
          color: '#71717a',
          life: 0.35,
          maxLife: 0.35,
        });
      }

      car.vx = fwdX * forwardVel + rightX * lateralVel;
      car.vy = fwdY * forwardVel + rightY * lateralVel;

      // Speed-normalized turning: responsive at low speed, steady and controllable at top speed
      const speedTurnFactor = Math.min(1.0, Math.abs(forwardVel) / 140);
      const minJoyTurn = usingJoystick && throttleInput > 0 ? 0.55 : 0;
      const effectiveTurnFactor = Math.max(speedTurnFactor, minJoyTurn);
      const dirSign = forwardVel < -15 ? -1 : 1;
      const maxTurnRate = isDriftingInput ? 4.2 : 3.5;
      const angularVel = dirSign * effectiveTurnFactor * (car.steerAngle / 0.46) * maxTurnRate;

      if (usingJoystick && brakeInput === 0 && dirSign > 0) {
        // Prevent overshooting the joystick heading for rock-steady straight-line driving
        const deltaAngle = angularVel * dt;
        if (Math.sign(deltaAngle) === Math.sign(angleDiff) && Math.abs(deltaAngle) > Math.abs(angleDiff)) {
          car.a = targetAngle;
        } else {
          car.a += deltaAngle;
        }
      } else {
        car.a += angularVel * dt;
      }

      const curSpeed = Math.hypot(car.vx, car.vy);
      if (curSpeed > maxSpeed) {
        car.vx = (car.vx / curSpeed) * maxSpeed;
        car.vy = (car.vy / curSpeed) * maxSpeed;
      }

      car.x = Math.max(30, Math.min(WW - 30, car.x + car.vx * dt));
      car.y = Math.max(30, Math.min(WH - 30, car.y + car.vy * dt));
      car.v = forwardVel;

      // --- 5. Drift Scoring, Skid Marks & Smoke ---
      const rearLeftX = car.x - fwdX * 14 - rightX * 11;
      const rearLeftY = car.y - fwdY * 14 - rightY * 11;
      const rearRightX = car.x - fwdX * 14 + rightX * 11;
      const rearRightY = car.y - fwdY * 14 + rightY * 11;

      if (isSlipping && speed > 110) {
        car.isDrifting = true;
        car.driftTime += dt;

        const inDriftZone = nearestPoint.isDriftZone;
        const baseMultiplier = 1.0 + Math.floor(car.driftTime * 2) * 0.5;
        car.driftCombo = Math.min(6.0, inDriftZone ? baseMultiplier * 2.0 : baseMultiplier);
        car.driftScore += Math.floor(speed * 0.45 * car.driftCombo * dt);
        car.miniTurboCharge += dt;

        stationAudio.playDriftScreech(Math.min(1.0, Math.abs(lateralVel) / 220));

        skidMarks.push({
          x1: rearLeftX,
          y1: rearLeftY,
          x2: rearLeftX - car.vx * dt * 0.6,
          y2: rearLeftY - car.vy * dt * 0.6,
          alpha: 0.65,
          color: inDriftZone ? 'rgba(236,72,153,0.45)' : undefined,
        });
        skidMarks.push({
          x1: rearRightX,
          y1: rearRightY,
          x2: rearRightX - car.vx * dt * 0.6,
          y2: rearRightY - car.vy * dt * 0.6,
          alpha: 0.65,
          color: inDriftZone ? 'rgba(236,72,153,0.45)' : undefined,
        });

        if (Math.random() < 0.6) {
          particles.push({
            x: rearLeftX + (Math.random() - 0.5) * 6,
            y: rearLeftY + (Math.random() - 0.5) * 6,
            vx: -car.vx * 0.15 + (Math.random() - 0.5) * 20,
            vy: -car.vy * 0.15 + (Math.random() - 0.5) * 20,
            r: 4 + Math.random() * 5,
            alpha: 0.5,
            color: inDriftZone ? '#f472b6' : '#e2e8f0',
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
            color: inDriftZone ? '#f472b6' : '#e2e8f0',
            life: 0.45,
            maxLife: 0.45,
          });
        }
      } else {
        if (car.isDrifting) {
          if (car.miniTurboCharge > 0.8) {
            car.vx += fwdX * 250;
            car.vy += fwdY * 250;
            car.nitro = Math.min(100, car.nitro + 35);
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

      if (nearestPoint.isBoostPad && minTrackDist < 40 && !car.isBoosting) {
        car.vx += fwdX * 240;
        car.vy += fwdY * 240;
        car.nitro = 100;
        stationAudio.playNitroBoost();
        addPopup('BOOST PAD! ⚡', car.x, car.y - 30, '#06b6d4');
      }

      for (let i = skidMarks.length - 1; i >= 0; i--) {
        skidMarks[i].alpha -= dt * 0.05;
        if (skidMarks[i].alpha <= 0) skidMarks.splice(i, 1);
      }
      if (skidMarks.length > 500) skidMarks.splice(0, skidMarks.length - 500);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += dt * 8;
        p.life -= dt;
        p.alpha = (p.life / p.maxLife) * 0.5;
        if (p.life <= 0) particles.splice(i, 1);
      }

      for (let i = popups.length - 1; i >= 0; i--) {
        const pop = popups[i];
        pop.y -= 30 * dt;
        pop.alpha -= dt * 0.9;
        if (pop.alpha <= 0) popups.splice(i, 1);
      }

      stars.forEach((s) => {
        if (!s.collected && Math.hypot(s.x - car.x, s.y - car.y) < 38) {
          s.collected = true;
          car.totalScore += 150;
          stationAudio.playCoinPickup();
          addPopup('+150 STAR!', s.x, s.y, '#facc15');
        }
        s.anim += dt * 3;
      });

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

      cones.forEach((cone) => {
        cone.x += cone.vx * dt;
        cone.y += cone.vy * dt;
        cone.vx *= Math.pow(0.4, dt);
        cone.vy *= Math.pow(0.4, dt);
        cone.rot += cone.vrot * dt;
        cone.vrot *= Math.pow(0.5, dt);

        if (Math.hypot(cone.x - car.x, cone.y - car.y) < 26) {
          const hitAngle = Math.atan2(cone.y - car.y, cone.x - car.x);
          cone.vx = Math.cos(hitAngle) * (speed + 220);
          cone.vy = Math.sin(hitAngle) * (speed + 220);
          cone.vrot = (Math.random() - 0.5) * 22;
          stationAudio.playCrateSmash();
        }
      });

      npcCars.forEach((npc) => {
        const stepDist = (npc.v * dt) / 14;
        npc.trackIdx = (npc.trackIdx + stepDist) % trackPoints.length;
        const currentIdx = Math.floor(npc.trackIdx);
        const nextIdx = (currentIdx + 1) % trackPoints.length;
        const fraction = npc.trackIdx - currentIdx;

        const pA = trackPoints[currentIdx];
        const pB = trackPoints[nextIdx];
        npc.x = pA.x + (pB.x - pA.x) * fraction;
        npc.y = pA.y + (pB.y - pA.y) * fraction;
        npc.a = pA.angle;

        const dist = Math.hypot(npc.x - car.x, npc.y - car.y);
        if (dist < 60 && dist > 32 && speed > 220 && !npc.nearMissed) {
          npc.nearMissed = true;
          car.totalScore += 250;
          stationAudio.playCoinPickup();
          addPopup('NEAR MISS! +250', car.x, car.y - 30, '#ec4899');
        }
        if (dist > 120) npc.nearMissed = false;

        if (dist < 32) {
          const bumpAngle = Math.atan2(car.y - npc.y, car.x - npc.x);
          car.vx += Math.cos(bumpAngle) * 180;
          car.vy += Math.sin(bumpAngle) * 180;
          stationAudio.playCarBump();
        }
      });

      near = spots.find((s) => Math.hypot(s.x - car.x, s.y - car.y) < 85) ?? null;
      if (near && !seen.has(near.p.id)) {
        seen.add(near.p.id);
        car.totalScore += 500;
        stationAudio.playDriftBonus();
        addPopup(`SHOWCASE FOUND: ${near.p.title.slice(0, 16)}! +500`, near.x, near.y - 30, '#facc15');
      }
    },

    draw(c) {
      const { W, H, touch } = getDims();

      c.save();
      c.translate(W / 2 - car.x, H / 2 - car.y);

      c.fillStyle = '#111116';
      c.fillRect(0, 0, WW, WH);

      c.strokeStyle = 'rgba(255,255,255,0.025)';
      c.lineWidth = 1;
      const gridSize = 160;
      c.beginPath();
      for (let x = 0; x <= WW; x += gridSize) {
        c.moveTo(x, 0);
        c.lineTo(x, WH);
      }
      for (let y = 0; y <= WH; y += gridSize) {
        c.moveTo(0, y);
        c.lineTo(WW, y);
      }
      c.stroke();

      const roadW = 96;
      const halfW = roadW / 2;
      const totalPoints = trackPoints.length;

      // 1. Road Run-off Gravel / Base Border
      c.strokeStyle = '#272733';
      c.lineWidth = roadW + 28;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      for (let i = 0; i < totalPoints; i++) {
        const pt = trackPoints[i];
        if (i === 0) c.moveTo(pt.x, pt.y);
        else c.lineTo(pt.x, pt.y);
      }
      c.closePath();
      c.stroke();

      // 2. Asphalt Road Ribbon
      c.strokeStyle = '#1b1b22';
      c.lineWidth = roadW;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      for (let i = 0; i < totalPoints; i++) {
        const pt = trackPoints[i];
        if (i === 0) c.moveTo(pt.x, pt.y);
        else c.lineTo(pt.x, pt.y);
      }
      c.closePath();
      c.stroke();

      // 3. Racing Kerbs
      for (let i = 0; i < totalPoints; i += 2) {
        const pt = trackPoints[i];
        if (pt.isApex) {
          const isRed = (i / 2) % 2 === 0;
          c.fillStyle = isRed ? '#ef4444' : '#f8fafc';
          c.fillRect(pt.x + pt.nx * (halfW + 4) - 4, pt.y + pt.ny * (halfW + 4) - 4, 8, 8);
          c.fillRect(pt.x - pt.nx * (halfW + 4) - 4, pt.y - pt.ny * (halfW + 4) - 4, 8, 8);
        }
      }

      // 4. Drift Zones
      for (let i = 0; i < totalPoints; i += 4) {
        const pt = trackPoints[i];
        if (pt.isDriftZone) {
          c.fillStyle = 'rgba(236, 72, 153, 0.12)';
          c.beginPath();
          c.arc(pt.x, pt.y, halfW, 0, Math.PI * 2);
          c.fill();
        }
      }

      // 5. Speed Boost Pads
      trackPoints.forEach((pt) => {
        if (pt.isBoostPad) {
          c.save();
          c.translate(pt.x, pt.y);
          c.rotate(pt.angle);
          c.fillStyle = 'rgba(6, 182, 212, 0.4)';
          c.fillRect(-22, -18, 44, 36);
          c.fillStyle = '#22d3ee';
          c.font = 'bold 13px monospace';
          c.textAlign = 'center';
          c.fillText('>>>', 0, 4);
          c.restore();
        }
      });

      // 6. Yellow Dashed Centerline
      c.strokeStyle = '#eab308';
      c.lineWidth = 2.5;
      c.setLineDash([16, 14]);
      c.beginPath();
      for (let i = 0; i < totalPoints; i++) {
        const pt = trackPoints[i];
        if (i === 0) c.moveTo(pt.x, pt.y);
        else c.lineTo(pt.x, pt.y);
      }
      c.closePath();
      c.stroke();
      c.setLineDash([]);

      // 7. Checkered Start / Finish Line
      if (trackPoints[0]) {
        const sPt = trackPoints[0];
        c.save();
        c.translate(sPt.x, sPt.y);
        c.rotate(sPt.angle);
        const checkW = 12;
        const checkH = 8;
        for (let r = -halfW; r < halfW; r += checkH) {
          for (let col = -checkW; col <= checkW; col += checkW) {
            c.fillStyle = (Math.floor(r / checkH) + Math.floor(col / checkW)) % 2 === 0 ? '#ffffff' : '#09090b';
            c.fillRect(col, r, checkW, checkH);
          }
        }
        c.restore();
      }

      // Skid Marks
      skidMarks.forEach((sm) => {
        c.strokeStyle = sm.color || `rgba(10, 10, 12, ${sm.alpha})`;
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(sm.x1, sm.y1);
        c.lineTo(sm.x2, sm.y2);
        c.stroke();
      });

      // Project Showcases
      spots.forEach((s) => {
        const isNear = near?.p.id === s.p.id;
        const roadPt = trackPoints[s.roadIdx];

        if (roadPt) {
          c.strokeStyle = isNear ? '#fbbf24' : 'rgba(251, 191, 36, 0.35)';
          c.lineWidth = 3;
          c.setLineDash([8, 8]);
          c.beginPath();
          c.moveTo(roadPt.x, roadPt.y);
          c.lineTo(s.x, s.y);
          c.stroke();
          c.setLineDash([]);
        }

        c.fillStyle = '#18181f';
        c.fillRect(s.x - 52, s.y - 52, 104, 104);
        c.strokeStyle = isNear ? '#fbbf24' : seen.has(s.p.id) ? '#10b981' : '#52525b';
        c.lineWidth = isNear ? 2.5 : 1.5;
        c.strokeRect(s.x - 52, s.y - 52, 104, 104);

        c.fillStyle = '#09090b';
        c.fillRect(s.x - 44, s.y - 44, 88, 88);

        const img = imageCache.get(s.p.id);
        if (img && img.complete && img.naturalWidth > 0) {
          c.save();
          c.beginPath();
          c.rect(s.x - 44, s.y - 44, 88, 88);
          c.clip();
          c.drawImage(img, s.x - 44, s.y - 44, 88, 88);
          c.restore();
        } else {
          c.fillStyle = '#18181b';
          c.fillRect(s.x - 44, s.y - 44, 88, 88);
          c.fillStyle = '#a1a1aa';
          c.font = 'bold 11px monospace';
          c.textAlign = 'center';
          c.fillText('SHOWCASE', s.x, s.y + 4);
        }

        c.strokeStyle = isNear ? '#fbbf24' : 'rgba(255,255,255,0.2)';
        c.lineWidth = isNear ? 2 : 1;
        c.strokeRect(s.x - 44, s.y - 44, 88, 88);

        c.fillStyle = 'rgba(9, 9, 11, 0.94)';
        c.fillRect(s.x - 60, s.y + 48, 120, 24);
        c.strokeStyle = isNear ? '#fbbf24' : '#52525b';
        c.lineWidth = 1;
        c.strokeRect(s.x - 60, s.y + 48, 120, 24);

        c.fillStyle = isNear ? '#fbbf24' : seen.has(s.p.id) ? '#34d399' : '#e4e4e7';
        c.font = 'bold 11px monospace';
        c.textAlign = 'center';
        c.fillText(`${seen.has(s.p.id) ? '✓ ' : ''}${s.p.title.slice(0, 14)}`, s.x, s.y + 64);
      });

      stars.forEach((s) => {
        if (s.collected) return;
        c.save();
        c.translate(s.x, s.y);
        c.rotate(s.anim);
        c.fillStyle = '#facc15';
        c.shadowColor = '#facc15';
        c.shadowBlur = 10;
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
        c.fillStyle = '#fef08a';
        c.fillRect(15, -7, 2, 3);
        c.fillRect(15, 4, 2, 3);
        c.fillStyle = '#ef4444';
        c.fillRect(-17, -7, 2, 3);
        c.fillRect(-17, 4, 2, 3);
        c.restore();
      });

      particles.forEach((p) => {
        c.fillStyle = p.color;
        c.globalAlpha = p.alpha;
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fill();
      });
      c.globalAlpha = 1.0;

      // 2. Draw Player Cyber Drift Sports Car
      c.save();
      c.translate(car.x, car.y);
      c.rotate(car.a);

      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.beginPath();
      c.roundRect(-24, -13, 48, 26, 6);
      c.fill();

      const underglow = car.isBoosting ? '#38bdf8' : car.isDrifting ? '#ec4899' : '#f59e0b';
      c.shadowColor = underglow;
      c.shadowBlur = 18;
      c.fillStyle = underglow;
      c.globalAlpha = 0.5;
      c.fillRect(-18, -10, 36, 20);
      c.globalAlpha = 1.0;
      c.shadowBlur = 0;

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

      c.fillStyle = '#0284c7';
      c.beginPath();
      c.moveTo(-20, -10);
      c.lineTo(16, -10);
      c.lineTo(23, -6);
      c.lineTo(23, 6);
      c.lineTo(16, 10);
      c.lineTo(-20, 10);
      c.closePath();
      c.fill();

      c.fillStyle = '#fbbf24';
      c.fillRect(-20, -2, 43, 4);

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

      c.fillStyle = '#0f172a';
      c.fillRect(-23, -11, 4, 22);
      c.fillStyle = '#38bdf8';
      c.fillRect(-23, -12, 2, 3);
      c.fillRect(-23, 9, 2, 3);

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

      const isBraking = car.isBraking || car.v < -10;
      c.fillStyle = isBraking ? '#ef4444' : '#991b1b';
      c.shadowColor = '#ef4444';
      c.shadowBlur = isBraking ? 14 : 4;
      c.fillRect(-21, -8, 2, 3);
      c.fillRect(-21, 5, 2, 3);
      c.shadowBlur = 0;

      if (car.isAccelerating || car.isBoosting) {
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

      // 3. HUD: Speedometer, Nitro Gauge & Curved Minimap
      if (mode === 'drive') {
        const speedKmh = Math.round(Math.abs(car.v) * 0.85);
        const hudX = 20;
        const hudY = touch ? 64 : H - 54;

        c.fillStyle = 'rgba(9, 9, 11, 0.85)';
        c.fillRect(hudX, hudY, 140, 44);
        c.strokeStyle = '#f59e0b';
        c.lineWidth = 1.5;
        c.strokeRect(hudX, hudY, 140, 44);

        c.fillStyle = '#f8fafc';
        c.font = 'bold 16px monospace';
        c.textAlign = 'left';
        c.fillText(`${speedKmh} KM/H`, hudX + 10, hudY + 20);

        c.fillStyle = '#1e293b';
        c.fillRect(hudX + 10, hudY + 28, 120, 8);
        c.fillStyle = car.nitro > 20 ? '#06b6d4' : '#ef4444';
        c.fillRect(hudX + 10, hudY + 28, (car.nitro / 100) * 120, 8);

        if (car.isDrifting && car.driftCombo > 1.0) {
          c.fillStyle = '#ec4899';
          c.font = 'bold 14px monospace';
          c.textAlign = 'left';
          c.fillText(`DRIFT ${car.driftCombo.toFixed(1)}x`, hudX + 150, hudY + 22);
        }

        const mw = Math.min(140, Math.max(90, W * 0.18));
        const mh = (mw * WH) / WW;
        const mmX = W - mw - 16;
        const mmY = 54;

        c.fillStyle = 'rgba(0,0,0,0.85)';
        c.fillRect(mmX, mmY, mw, mh);
        c.strokeStyle = '#e0a030';
        c.lineWidth = 1;
        c.strokeRect(mmX, mmY, mw, mh);

        c.strokeStyle = 'rgba(255,255,255,0.35)';
        c.lineWidth = 2.5;
        c.beginPath();
        for (let i = 0; i < trackPoints.length; i += 4) {
          const pt = trackPoints[i];
          const mx = mmX + (pt.x / WW) * mw;
          const my = mmY + (pt.y / WH) * mh;
          if (i === 0) c.moveTo(mx, my);
          else c.lineTo(mx, my);
        }
        c.closePath();
        c.stroke();

        spots.forEach((s) => {
          c.fillStyle = seen.has(s.p.id) ? '#10b981' : '#e0a030';
          c.fillRect(mmX + (s.x / WW) * mw - 3, mmY + (s.y / WH) * mh - 3, 6, 6);
        });

        npcCars.forEach((npc) => {
          c.fillStyle = npc.color;
          c.fillRect(mmX + (npc.x / WW) * mw - 2, mmY + (npc.y / WH) * mh - 2, 4, 4);
        });

        const pmX = mmX + (car.x / WW) * mw;
        const pmY = mmY + (car.y / WH) * mh;
        c.fillStyle = '#38bdf8';
        c.fillRect(pmX - 2.5, pmY - 2.5, 5, 5);
        c.strokeStyle = '#38bdf8';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(pmX, pmY);
        c.lineTo(pmX + Math.cos(car.a) * 7, pmY + Math.sin(car.a) * 7);
        c.stroke();

        if (!touch) {
          c.fillStyle = 'rgba(255, 255, 255, 0.45)';
          c.font = '10px monospace';
          c.textAlign = 'center';
          c.fillText(
            'JOYSTICK / WASD: DRIVE & STEER · SPACE: DRIFT · SHIFT: NITRO · R: NEW TRACK · E: VIEW PROJECT',
            W / 2,
            H - 14
          );
        }
      }

      // 4. In-Game Project Modal
      if (mode === 'menu') {
        const { menuX, menuY, menuW, menuH, isMobile, isLandscape, current, btns } = getMenuLayout();

        c.fillStyle = 'rgba(6, 8, 14, 0.96)';
        c.fillRect(menuX, menuY, menuW, menuH);

        c.strokeStyle = '#e0a030';
        c.lineWidth = 2;
        c.strokeRect(menuX, menuY, menuW, menuH);

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
          const picW = Math.min(210, Math.floor(menuW * 0.42));
          const picH = Math.floor(picW * 0.72);

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

          c.textAlign = 'left';
          c.fillStyle = '#fbbf24';
          c.font = 'bold 10px monospace';
          const tags = (current.tags || []).slice(0, 3).map((t) => `[${t}]`).join(' ');
          c.fillText(tags.slice(0, 26), menuX + 20, menuY + 44 + picH + 18);

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
            c.fillStyle = '#ffa73d';
            c.font = 'bold 14px monospace';
            c.textAlign = 'left';
            c.fillText(current.title.slice(0, 30), menuX + 16, menuY + 152);

            c.fillStyle = '#d4d4d8';
            c.font = '10px monospace';
            wrapCanvasText(c, current.description || '', menuX + 16, menuY + 170, menuW - 32, 14, 3);
          }
        }

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

const GAMES: Record<string, (k: Keys, ctx: Ctx, getDims: () => Dims) => Game> = {
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
}) => {
  const pointerIdRef = useRef<number | null>(null);

  const release = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    if (hold) press(code, false);
  };

  return (
    <button
      className={`rounded-2xl border-2 border-amber-400/60 bg-black/70 backdrop-blur-md text-amber-300 touch-none select-none active:bg-amber-400/40 active:scale-95 transition-all shadow-[0_0_14px_rgba(245,158,11,0.3)] flex items-center justify-center font-bold cursor-pointer ${
        className || 'w-14 h-14'
      }`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hold) {
          pointerIdRef.current = e.pointerId;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore synthetic pointer events
          }
          press(code, true);
        } else {
          press(code, true);
          press(code, false);
        }
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        release(e);
      }}
      onPointerCancel={(e) => {
        e.preventDefault();
        release(e);
      }}
      onLostPointerCapture={(e) => {
        release(e);
      }}
    >
      {children}
    </button>
  );
};

// ============================================================================
// VIRTUAL JOYSTICK (High-Precision Analog Touch Controller)
// ============================================================================
const Joystick: React.FC<{
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
  className?: string;
}> = ({ onMove, onEnd, className }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);

  const updateKnob = (clientX: number, clientY: number) => {
    if (!baseRef.current || !knobRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxR = rect.width * 0.38;

    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }

    knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    onMove(dx / maxR, dy / maxR);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    pointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore synthetic pointer events
    }
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
    onEnd();
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      className={`relative rounded-full border-2 border-amber-400/60 bg-black/75 backdrop-blur-md touch-none select-none shadow-[0_0_24px_rgba(245,158,11,0.35)] flex items-center justify-center cursor-pointer pointer-events-auto ${
        className || 'w-32 h-32 sm:w-36 sm:h-36'
      }`}
    >
      {/* Decorative Cardinal & Reticle Indicators */}
      <div className="absolute inset-0 rounded-full border border-amber-400/20 m-2.5 pointer-events-none" />
      <div className="absolute w-full h-[1px] bg-amber-400/25 pointer-events-none" />
      <div className="absolute h-full w-[1px] bg-amber-400/25 pointer-events-none" />

      {/* Tactile Analog Knob */}
      <div
        ref={knobRef}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-300 bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_18px_rgba(245,158,11,0.7)] flex items-center justify-center pointer-events-none"
      >
        <div className="w-5 h-5 rounded-full bg-amber-100/90 shadow-inner" />
      </div>
    </div>
  );
};

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
  const joyRef = useRef({ x: 0, y: 0 });

  const [showControls, setShowControls] = useState(false);
  const showControlsRef = useRef(false);
  const gameInstanceRef = useRef<Game | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMenuOpenRef = useRef(false);
  const [nearProjectTitle, setNearProjectTitle] = useState<string | null>(null);
  const nearProjectRef = useRef<string | null>(null);

  useEffect(() => {
    showControlsRef.current = showControls;
    if (!showControls) {
      joyRef.current = { x: 0, y: 0 };
    }
  }, [showControls]);

  useEffect(() => {
    const isTouch =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0);
    setShowControls(isTouch);
  }, []);

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

    const getDims = (): Dims => ({
      W: canvas.width || window.innerWidth || 800,
      H: canvas.height || window.innerHeight || 600,
      touch: Boolean(showControlsRef.current),
      joy: joyRef.current,
    });

    const resizeCanvas = () => {
      canvas.width = window.innerWidth || 800;
      canvas.height = window.innerHeight || 600;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let g = (GAMES[game] || GAMES.drive)(keys, ctx, getDims);
    gameInstanceRef.current = g;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'F12' || e.code === 'F11' || e.code === 'F5') return;

      if (e.type === 'keydown' && g.onKeyDown && g.onKeyDown(e.code)) {
        e.preventDefault();
        return;
      }

      if (isPaused) return;
      if (e.type === 'keydown' && (e.code === 'Escape' || e.code === 'KeyQ')) return handleExitGame();

      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'Space',
          'KeyE',
          'KeyR',
          'KeyX',
          'ShiftLeft',
          'ShiftRight',
        ].includes(e.code)
      ) {
        e.preventDefault();
      }

      if (e.type === 'keydown') {
        keys.add(e.code);
        if (e.code === 'Space' && g.over()) {
          g = (GAMES[game] || GAMES.drive)(keys, ctx, getDims);
          gameInstanceRef.current = g;
        }
        if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) g.act?.();
      } else {
        keys.delete(e.code);
      }
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

        if (g.isMenuOpen) {
          const open = g.isMenuOpen();
          if (open !== isMenuOpenRef.current) {
            isMenuOpenRef.current = open;
            if (open) joyRef.current = { x: 0, y: 0 };
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
          c.fillStyle = 'rgba(0,0,0,0.75)';
          c.fillRect(0, 0, canvas.width, canvas.height);
          const overInfo = g.getGameOverText ? g.getGameOverText() : { title: 'GAME OVER', subtitle: '' };

          neon(c, '#f43f5e', 14);
          c.font = 'bold 34px monospace';
          c.textAlign = 'center';
          c.fillText(overInfo.title, canvas.width / 2, canvas.height / 2 - 16);

          if (overInfo.subtitle) {
            neon(c, '#fbbf24', 0);
            c.font = 'bold 17px monospace';
            c.fillText(overInfo.subtitle, canvas.width / 2, canvas.height / 2 + 18);
          }

          neon(c, '#ffffff', 0);
          c.font = '15px monospace';
          c.fillText(showControlsRef.current ? 'TAP TO RESTART' : 'PRESS SPACE TO RESTART', canvas.width / 2, canvas.height / 2 + 54);
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
  }, [game, projects, isPaused, onOpen]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (gameInstanceRef.current?.over()) {
      gameInstanceRef.current.act?.();
      return;
    }

    if (gameInstanceRef.current?.onClick) {
      gameInstanceRef.current.onClick(cx, cy);
    } else if (gameInstanceRef.current?.act) {
      gameInstanceRef.current.act();
    }
  };

  const handleTriggerNewTrack = () => {
    if (gameInstanceRef.current?.onKeyDown) {
      gameInstanceRef.current.onKeyDown('KeyR');
    }
  };

  const handleJoyMove = (x: number, y: number) => {
    joyRef.current = { x, y };
  };

  const handleJoyEnd = () => {
    joyRef.current = { x: 0, y: 0 };
  };

  const displayGameTitle = game === 'drive' ? 'CYBER DRIFT' : game.toUpperCase();

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden font-mono text-amber-300 select-none"
    >
      {/* Edge-to-Edge Canvas */}
      <canvas
        ref={ref}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full cursor-pointer block"
      />

      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.18)_0_2px,transparent_2px_4px)]" />

      {/* Floating Header */}
      <div className="absolute top-2.5 sm:top-3 left-3 sm:left-4 right-3 sm:right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          <span className="uppercase tracking-[0.2em] sm:tracking-[0.35em] text-xs sm:text-base font-bold text-amber-300 drop-shadow truncate">
            {displayGameTitle}
          </span>
          <div ref={hud} className="text-[11px] sm:text-sm font-bold text-amber-200/90 drop-shadow truncate" />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
          {game === 'drive' && (
            <button
              onClick={handleTriggerNewTrack}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs rounded bg-zinc-950/80 hover:bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 transition cursor-pointer backdrop-blur shadow"
              title="Generate a new road circuit (R)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Track (R)</span>
              <span className="sm:hidden">Track</span>
            </button>
          )}

          <button
            onClick={() => setShowControls((v) => !v)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs rounded border transition cursor-pointer backdrop-blur shadow ${
              showControls
                ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                : 'bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            title="Toggle On-Screen Joystick Controls"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Controls</span>
          </button>

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

      {/* Near Project Banner */}
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

      {/* On-Screen Joystick Controls */}
      {showControls && !isMenuOpen && (
        <div className="absolute inset-0 pointer-events-none z-30 select-none">
          {/* Left Side: Virtual Analog Joystick */}
          <div className="absolute left-4 sm:left-8 bottom-6 pointer-events-auto">
            <Joystick onMove={handleJoyMove} onEnd={handleJoyEnd} />
          </div>

          {/* Right Side Action Buttons */}
          {game === 'drive' ? (
            /* Cyber Drift Action Controls (No arrows!) */
            <div className="absolute right-4 sm:right-6 bottom-6 pointer-events-auto flex items-end gap-2.5">
              <div className="flex flex-col gap-2">
                <Btn
                  code="ArrowUp"
                  hold
                  className="w-14 h-14 rounded-2xl border-2 border-emerald-400/70 bg-emerald-950/70 text-emerald-300 font-bold text-xs tracking-wider shadow-[0_0_16px_rgba(16,185,129,0.4)] active:bg-emerald-400/40"
                >
                  GAS
                </Btn>
                <Btn
                  code="ArrowDown"
                  hold
                  className="w-14 h-12 rounded-2xl border-2 border-red-400/70 bg-red-950/70 text-red-300 font-bold text-xs tracking-wider shadow-[0_0_14px_rgba(239,68,68,0.4)] active:bg-red-400/40"
                >
                  BRAKE
                </Btn>
              </div>
              <div className="flex flex-col gap-2">
                <Btn
                  code="ShiftLeft"
                  hold
                  className="px-3.5 h-14 rounded-2xl border-2 border-cyan-400 bg-cyan-950/70 text-cyan-300 font-bold text-xs tracking-wider shadow-[0_0_18px_rgba(6,182,212,0.5)] active:bg-cyan-400/40 flex items-center justify-center gap-1"
                >
                  🚀 NITRO
                </Btn>
                <Btn
                  code="Space"
                  hold
                  className="px-3.5 h-12 rounded-2xl border-2 border-pink-400 bg-pink-950/70 text-pink-300 font-bold text-xs tracking-wider shadow-[0_0_18px_rgba(244,114,182,0.5)] active:bg-pink-400/40 flex items-center justify-center gap-1"
                >
                  ⚡ DRIFT
                </Btn>
              </div>
            </div>
          ) : (
            /* Retro Mini-Games Action Controls (No arrows!) */
            <div className="absolute right-4 sm:right-8 bottom-6 pointer-events-auto flex flex-col gap-2.5">
              <Btn code="KeyE" className="w-16 h-13 text-xs tracking-wider font-bold">
                ACT
              </Btn>
              <Btn code="Space" className="w-16 h-13 text-xs tracking-wider font-bold">
                RETRY
              </Btn>
              <Btn code="Escape" className="w-16 h-13 text-xs tracking-wider font-bold">
                EXIT
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Arcade;
