import React, { useEffect, useRef } from 'react';
import { Project } from '@/types/Project';

type Ctx = { projects: Project[]; open: (p: Project) => void };
type Game = { act?: () => void; step: (dt: number) => void; draw: (c: CanvasRenderingContext2D) => void; score: () => string; over: () => boolean };
type Keys = Set<string>;
const W = 480;
const H = 360;
const up = (k: Keys) => k.has('ArrowUp') || k.has('KeyW');
const down = (k: Keys) => k.has('ArrowDown') || k.has('KeyS');
const left = (k: Keys) => k.has('ArrowLeft') || k.has('KeyA');
const right = (k: Keys) => k.has('ArrowRight') || k.has('KeyD');
const neon = (c: CanvasRenderingContext2D, color: string, blur = 12) => {
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = blur;
};

const snake = (k: Keys): Game => {
  const C = 20;
  let s = [{ x: 12, y: 9 }];
  let d = { x: 1, y: 0 };
  let f = { x: 5, y: 5 };
  let t = 0;
  let dead = false;
  let score = 0;
  return {
    score: () => String(score),
    over: () => dead,
    step(dt) {
      if (up(k) && d.y !== 1) d = { x: 0, y: -1 };
      else if (down(k) && d.y !== -1) d = { x: 0, y: 1 };
      else if (left(k) && d.x !== 1) d = { x: -1, y: 0 };
      else if (right(k) && d.x !== -1) d = { x: 1, y: 0 };
      t += dt;
      if (t < 0.09 || dead) return;
      t = 0;
      const h = { x: s[0].x + d.x, y: s[0].y + d.y };
      if (h.x < 0 || h.y < 0 || h.x >= W / C || h.y >= H / C || s.some((p) => p.x === h.x && p.y === h.y)) {
        dead = true;
        return;
      }
      s.unshift(h);
      if (h.x === f.x && h.y === f.y) {
        score++;
        f = { x: Math.floor(Math.random() * (W / C)), y: Math.floor(Math.random() * (H / C)) };
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

const pong = (k: Keys): Game => {
  const P = 64;
  let py = H / 2 - P / 2;
  let ay = py;
  let sc = [0, 0];
  let b = { x: W / 2, y: H / 2, vx: 240, vy: 120 };
  const serve = (dir: number) => (b = { x: W / 2, y: H / 2, vx: 240 * dir, vy: (Math.random() - 0.5) * 240 });
  return {
    score: () => `${sc[0]} - ${sc[1]}`,
    over: () => sc[0] >= 7 || sc[1] >= 7,
    step(dt) {
      if (this.over()) return;
      py = Math.max(0, Math.min(H - P, py + ((down(k) ? 1 : 0) - (up(k) ? 1 : 0)) * 320 * dt));
      ay = Math.max(0, Math.min(H - P, ay + Math.sign(b.y - P / 2 - ay) * Math.min(200 * dt, Math.abs(b.y - P / 2 - ay))));
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < 6 || b.y > H - 6) b.vy *= -1;
      if (b.vx < 0 && b.x < 28 && b.y > py && b.y < py + P) {
        b.vx = Math.abs(b.vx) * 1.06;
        b.vy = (b.y - (py + P / 2)) * 7;
      }
      if (b.vx > 0 && b.x > W - 28 && b.y > ay && b.y < ay + P) {
        b.vx = -Math.abs(b.vx) * 1.06;
        b.vy = (b.y - (ay + P / 2)) * 7;
      }
      if (b.x < 0) { sc[1]++; serve(1); }
      if (b.x > W) { sc[0]++; serve(-1); }
    },
    draw(c) {
      neon(c, '#22d3ee');
      c.fillRect(16, py, 8, P);
      neon(c, '#f472b6');
      c.fillRect(W - 24, ay, 8, P);
      neon(c, '#fff');
      c.fillRect(b.x - 6, b.y - 6, 12, 12);
    },
  };
};

const breakout = (k: Keys): Game => {
  const PW = 80;
  let px = W / 2 - PW / 2;
  let b = { x: W / 2, y: H - 50, vx: 150, vy: -230 };
  let lives = 3;
  const bricks = Array.from({ length: 60 }, (_, i) => ({ x: (i % 10) * 48 + 2, y: 40 + Math.floor(i / 10) * 20, alive: true }));
  const cols = ['#f43f5e', '#fb923c', '#facc15', '#34d399', '#22d3ee', '#a78bfa'];
  return {
    score: () => `${bricks.filter((x) => !x.alive).length}  ♥${lives}`,
    over: () => lives <= 0 || bricks.every((x) => !x.alive),
    step(dt) {
      if (this.over()) return;
      px = Math.max(0, Math.min(W - PW, px + ((right(k) ? 1 : 0) - (left(k) ? 1 : 0)) * 380 * dt));
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 5 || b.x > W - 5) b.vx *= -1;
      if (b.y < 5) b.vy = Math.abs(b.vy);
      if (b.vy > 0 && b.y > H - 24 && b.y < H - 10 && b.x > px && b.x < px + PW) {
        b.vy = -Math.abs(b.vy);
        b.vx = (b.x - (px + PW / 2)) * 6;
      }
      if (b.y > H) {
        lives--;
        b = { x: W / 2, y: H - 50, vx: 150, vy: -230 };
      }
      const hit = bricks.find((r) => r.alive && b.x > r.x && b.x < r.x + 44 && b.y > r.y && b.y < r.y + 16);
      if (hit) {
        hit.alive = false;
        b.vy *= -1;
      }
    },
    draw(c) {
      bricks.forEach((r, i) => {
        if (!r.alive) return;
        neon(c, cols[Math.floor(i / 10)], 8);
        c.fillRect(r.x, r.y, 44, 16);
      });
      neon(c, '#22d3ee');
      c.fillRect(px, H - 16, PW, 8);
      neon(c, '#fff');
      c.fillRect(b.x - 5, b.y - 5, 10, 10);
    },
  };
};


// top-down car roaming a road grid; every project is a building, the minimap shows them all
const drive = (k: Keys, { projects, open }: Ctx): Game => {
  const GAP = 320;
  const cols = Math.max(1, Math.ceil(Math.sqrt(projects.length)));
  const rows = Math.max(1, Math.ceil(projects.length / cols));
  const WW = (cols + 1) * GAP;
  const WH = (rows + 1) * GAP;
  const spots = projects.map((p, i) => ({ p, x: ((i % cols) + 1) * GAP + 70, y: (Math.floor(i / cols) + 1) * GAP + 70 }));
  const seen = new Set<string>();
  const car = { x: GAP / 2, y: GAP / 2, a: 0, v: 0 };
  let near: (typeof spots)[number] | null = null;
  const road = (c: CanvasRenderingContext2D, horizontal: boolean, at: number) => {
    c.fillStyle = '#3a3631';
    if (horizontal) c.fillRect(0, at - 28, WW, 56);
    else c.fillRect(at - 28, 0, 56, WH);
  };
  return {
    score: () => `${seen.size}/${projects.length} visited`,
    over: () => false,
    act: () => near && open(near.p),
    step(dt) {
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
      for (let i = 1; i <= rows; i++) { c.moveTo(0, i * GAP); c.lineTo(WW, i * GAP); }
      for (let i = 1; i <= cols; i++) { c.moveTo(i * GAP, 0); c.lineTo(i * GAP, WH); }
      c.stroke();
      c.setLineDash([]);
      c.textAlign = 'center';
      spots.forEach((s) => {
        c.fillStyle = seen.has(s.p.id) ? '#c8553d' : '#e0a030';
        c.fillRect(s.x - 40, s.y - 40, 80, 80);
        c.fillStyle = '#14110c';
        c.fillRect(s.x - 34, s.y - 34, 68, 68);
        c.fillStyle = '#e8e2d4';
        c.font = 'bold 14px monospace';
        c.fillText(s.p.title.slice(0, 14), s.x, s.y + 5);
      });
      c.translate(car.x, car.y);
      c.rotate(car.a);
      c.fillStyle = '#4aa3df';
      c.fillRect(-14, -8, 28, 16);
      c.fillStyle = '#cfe8f7';
      c.fillRect(2, -6, 8, 12);
      c.fillStyle = '#fff';
      c.fillRect(13, -7, 2, 4);
      c.fillRect(13, 3, 2, 4);
      c.restore();
      if (!projects.length) {
        c.fillStyle = '#e8e2d4';
        c.font = '16px monospace';
        c.textAlign = 'center';
        c.fillText('No projects yet', W / 2, 30);
      }
      // minimap
      const mw = 120;
      const mh = (mw * WH) / WW;
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillRect(W - mw - 10, 10, mw, mh);
      c.strokeStyle = '#e0a030';
      c.lineWidth = 1;
      c.strokeRect(W - mw - 10, 10, mw, mh);
      spots.forEach((s) => {
        c.fillStyle = seen.has(s.p.id) ? '#c8553d' : '#e0a030';
        c.fillRect(W - mw - 10 + (s.x / WW) * mw - 3, 10 + (s.y / WH) * mh - 3, 6, 6);
      });
      c.fillStyle = '#4aa3df';
      c.fillRect(W - mw - 10 + (car.x / WW) * mw - 2, 10 + (car.y / WH) * mh - 2, 4, 4);
      if (near) {
        c.fillStyle = 'rgba(0,0,0,0.8)';
        c.fillRect(20, H - 60, W - 40, 44);
        c.fillStyle = '#e0a030';
        c.font = 'bold 16px monospace';
        c.textAlign = 'left';
        c.fillText(near.p.title.slice(0, 40), 32, H - 38);
        c.font = '12px monospace';
        c.fillText('Press E / Enter to open', 32, H - 22);
      }
    },
  };
};

const GAMES: Record<string, (k: Keys, ctx: Ctx) => Game> = { snake, pong, breakout, drive };
const HINTS: Record<string, string> = {
  snake: 'WASD / arrows to steer',
  pong: 'W/S or up/down. First to 7',
  breakout: 'A/D or left/right',
  drive: 'W/S gas and brake, A/D steer. Find every project on the map',
};

const press = (code: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
const Btn: React.FC<{ code: string; hold?: boolean; children: React.ReactNode }> = ({ code, hold, children }) => (
  <button
    className="w-14 h-14 rounded-full border border-amber-500 bg-amber-500/15 text-amber-300 touch-none select-none"
    onPointerDown={() => { press(code, true); if (!hold) press(code, false); }}
    onPointerUp={() => hold && press(code, false)}
    onPointerLeave={() => hold && press(code, false)}
    onPointerCancel={() => hold && press(code, false)}
  >
    {children}
  </button>
);

const Arcade: React.FC<{ game: string; projects: Project[]; onOpen: (p: Project) => void; onExit: () => void }> = ({ game, projects, onOpen, onExit }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const touch = window.matchMedia('(pointer: coarse)').matches;

  useEffect(() => {
    const keys: Keys = new Set();
    const c = ref.current!.getContext('2d')!;
    const ctx: Ctx = { projects, open: onOpen };
    let g = GAMES[game](keys, ctx);
    const onKey = (e: KeyboardEvent) => {
      if (e.type === 'keydown' && (e.code === 'Escape' || e.code === 'KeyQ')) return onExit();
      e.preventDefault();
      if (e.type === 'keydown') {
        keys.add(e.code);
        if (e.code === 'Space' && g.over()) g = GAMES[game](keys, ctx);
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
      g.step(dt);
      c.shadowBlur = 0;
      c.fillStyle = '#05070d';
      c.fillRect(0, 0, W, H);
      g.draw(c);
      c.shadowBlur = 0;
      if (g.over()) {
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(0, 0, W, H);
        neon(c, '#fff', 0);
        c.font = 'bold 32px monospace';
        c.textAlign = 'center';
        c.fillText('GAME OVER', W / 2, H / 2 - 10);
        c.font = '16px monospace';
        c.fillText('SPACE to restart', W / 2, H / 2 + 22);
      }
      if (hud.current) hud.current.textContent = `SCORE  ${g.score()}`;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [game, projects, onOpen, onExit]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center gap-2 bg-black p-2 font-mono text-amber-300">
      <div className="uppercase tracking-[0.4em] text-lg">{game}</div>
      <div className="relative min-h-0 w-full flex-1">
        <canvas ref={ref} width={W} height={H} className="absolute inset-0 h-full w-full object-contain" />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.2)_0_2px,transparent_2px_4px)]" />
      </div>
      <div ref={hud} />
      <div className="text-xs opacity-70 text-center px-4">{HINTS[game]} · {touch ? 'Exit button to leave' : 'Press Q to quit (Esc also works, but then click once)'}</div>
      {touch && (
        <div className="flex w-full max-w-md items-center justify-between px-6">
          <div className="grid grid-cols-3 gap-1 place-items-center">
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
          <div className="flex flex-col gap-2">
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
