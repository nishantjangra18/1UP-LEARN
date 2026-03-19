import { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

const COLS = 20, ROWS = 20, CELL = 22;
const W = COLS * CELL, H = ROWS * CELL;
const TICK_START = 160; // ms per frame — comfortable speed
const TICK_MIN   = 80;

const DIR = { UP: [0,-1], DOWN: [0,1], LEFT: [-1,0], RIGHT: [1,0] };

function randomCell(snake = []) {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

export default function SnakeGame({ onComplete }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const tickRef    = useRef(null);
  const [started,  setStarted]  = useState(false);
  const [dead,     setDead]     = useState(false);
  const [score,    setScore]    = useState(0);
  const [best,     setBest]     = useState(0);

  const initState = useCallback(() => ({
    snake: [{ x: 10, y: 10 }],
    dir:   [1, 0],
    nextDir: [1, 0],
    food:  randomCell([{ x: 10, y: 10 }]),
    score: 0,
    tick:  TICK_START,
  }), []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s   = stateRef.current;

    // Background grid
    ctx.fillStyle = '#0f2027';
    ctx.fillRect(0, 0, W, H);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
    }

    // Food
    const fx = s.food.x * CELL + CELL / 2;
    const fy = s.food.y * CELL + CELL / 2;
    const gf = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL * 0.45);
    gf.addColorStop(0, '#ff6b6b');
    gf.addColorStop(1, '#c0392b');
    ctx.fillStyle = gf;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL * 0.42, 0, Math.PI * 2);
    ctx.fill();
    // Highlight dot
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(fx - CELL * 0.1, fy - CELL * 0.1, CELL * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Snake body
    s.snake.forEach((seg, i) => {
      const isHead = i === 0;
      const t  = 1 - (i / s.snake.length) * 0.5; // fade tail slightly
      const sx = seg.x * CELL + 2;
      const sy = seg.y * CELL + 2;
      const sz = CELL - 4;
      const r  = isHead ? 8 : 6;

      if (isHead) {
        // Head: bright gradient
        const gh = ctx.createLinearGradient(sx, sy, sx + sz, sy + sz);
        gh.addColorStop(0, '#00e676');
        gh.addColorStop(1, '#00b248');
        ctx.fillStyle = gh;
      } else {
        ctx.fillStyle = `rgba(0, ${Math.round(200 * t + 55)}, ${Math.round(100 * t + 30)}, ${0.7 + t * 0.3})`;
      }

      // Rounded rect
      ctx.beginPath();
      ctx.roundRect(sx, sy, sz, sz, r);
      ctx.fill();

      // Head eyes
      if (isHead) {
        const [dx, dy] = s.dir;
        const ex = sx + sz / 2 + dx * sz * 0.2;
        const ey = sy + sz / 2 + dy * sz * 0.2;
        const eyeOffset = dy !== 0 ? sz * 0.2 : 0;
        const eyeOffset2 = dx !== 0 ? sz * 0.2 : 0;

        [[ex - eyeOffset2 - (dy !== 0 ? sz*0.18 : 0),
          ey - eyeOffset  - (dx !== 0 ? sz*0.18 : 0)],
         [ex - eyeOffset2 + (dy !== 0 ? sz*0.18 : 0),
          ey - eyeOffset  + (dx !== 0 ? sz*0.18 : 0)]].forEach(([ex2, ey2]) => {
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(ex2, ey2, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#222';
          ctx.beginPath(); ctx.arc(ex2 + dx, ey2 + dy, 2, 0, Math.PI * 2); ctx.fill();
        });
      }
    });

    // Score overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 28);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 14px Fredoka One, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⭐ ${s.score}`, 8, 19);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Best: ${best}`, W - 8, 19);
  }, [best]);

  const step = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;

    s.dir = s.nextDir;
    const head = s.snake[0];
    const next = { x: head.x + s.dir[0], y: head.y + s.dir[1] };

    // Wall collision
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      setDead(true);
      setBest(b => Math.max(b, s.score));
      onComplete?.({ score: s.score, won: false });
      clearTimeout(tickRef.current);
      return;
    }
    // Self collision
    if (s.snake.some(seg => seg.x === next.x && seg.y === next.y)) {
      setDead(true);
      setBest(b => Math.max(b, s.score));
      onComplete?.({ score: s.score, won: false });
      clearTimeout(tickRef.current);
      return;
    }

    const ateFood = next.x === s.food.x && next.y === s.food.y;
    s.snake = [next, ...s.snake];
    if (!ateFood) s.snake.pop();
    else {
      s.score++;
      s.food = randomCell(s.snake);
      s.tick = Math.max(TICK_MIN, s.tick - 4); // speed up slightly
      setScore(s.score);
    }

    draw();
    tickRef.current = setTimeout(step, s.tick);
  }, [draw, onComplete]);

  const start = useCallback(() => {
    stateRef.current = initState();
    setStarted(true);
    setDead(false);
    setScore(0);
    draw();
    tickRef.current = setTimeout(step, TICK_START);
  }, [initState, draw, step]);

  // Keyboard handler
  useEffect(() => {
    const onKey = (e) => {
      if (!stateRef.current) return;
      const s = stateRef.current;
      const map = {
        ArrowUp: DIR.UP, w: DIR.UP, W: DIR.UP,
        ArrowDown: DIR.DOWN, s: DIR.DOWN, S: DIR.DOWN,
        ArrowLeft: DIR.LEFT, a: DIR.LEFT, A: DIR.LEFT,
        ArrowRight: DIR.RIGHT, d: DIR.RIGHT, D: DIR.RIGHT,
      };
      const nd = map[e.key];
      if (!nd) return;
      e.preventDefault();
      // Prevent reversing
      if (nd[0] === -s.dir[0] && nd[1] === -s.dir[1]) return;
      s.nextDir = nd;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f2027';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 18px Fredoka One, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press Start to Play!', W / 2, H / 2 - 10);
    ctx.font = '13px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText('Arrow keys or WASD to move', W / 2, H / 2 + 18);
  }, []);

  useEffect(() => () => clearTimeout(tickRef.current), []);

  // Swipe support for mobile
  const touchStart = useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0]; };
  const onTouchEnd   = (e) => {
    if (!touchStart.current || !stateRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.clientX;
    const dy = e.changedTouches[0].clientY - touchStart.current.clientY;
    const s  = stateRef.current;
    let nd;
    if (Math.abs(dx) > Math.abs(dy)) nd = dx > 0 ? DIR.RIGHT : DIR.LEFT;
    else nd = dy > 0 ? DIR.DOWN : DIR.UP;
    if (nd[0] === -s.dir[0] && nd[1] === -s.dir[1]) return;
    s.nextDir = nd;
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-8 text-sm font-bold">
        <span className="text-yellow-400">⭐ {score}</span>
        <span className="text-slate-400">Best: {best}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-2xl border-2 border-slate-600 shadow-2xl"
        style={{ maxWidth: '100%' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      />

      {/* D-Pad for mobile */}
      <div className="grid grid-cols-3 gap-1 mt-1 sm:hidden">
        {[['', '↑', ''], ['←', '↓', '→']].map((row, ri) => (
          row.map((btn, ci) => btn ? (
            <button key={`${ri}-${ci}`}
              className="w-10 h-10 bg-slate-700 rounded-lg text-white font-bold hover:bg-slate-600 active:scale-95 transition"
              onTouchStart={(e) => {
                e.preventDefault();
                const s = stateRef.current;
                if (!s) return;
                const map = { '↑': DIR.UP, '↓': DIR.DOWN, '←': DIR.LEFT, '→': DIR.RIGHT };
                const nd = map[btn];
                if (nd && !(nd[0] === -s.dir[0] && nd[1] === -s.dir[1])) s.nextDir = nd;
              }}
            >
              {btn}
            </button>
          ) : <div key={`${ri}-${ci}`} />)
        ))}
      </div>

      {(!started || dead) && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={start}
          className="bg-green-600 hover:bg-green-500 text-white font-game text-xl px-8 py-3 rounded-2xl transition hover:scale-105 shadow-lg"
        >
          {dead ? '🔄 Play Again' : '▶ Start Game'}
        </motion.button>
      )}

      <p className="text-slate-600 text-xs">Arrow keys / WASD to move • Eat 🔴 to grow</p>
    </div>
  );
}
