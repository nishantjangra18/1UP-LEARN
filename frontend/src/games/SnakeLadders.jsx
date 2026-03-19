import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL   = 42;           // px per cell
const BOARD  = CELL * 10;   // 420px total

// ─── Random board generation ──────────────────────────────────────────────────
function generateBoard() {
  const used    = new Set([1, 100]);
  const snakes  = {};
  const ladders = {};

  function pickUnused(min, max) {
    let n, tries = 0;
    do {
      n = Math.floor(Math.random() * (max - min + 1)) + min;
      if (++tries > 500) return null;
    } while (used.has(n));
    return n;
  }

  // 5 snakes — head (high cell) → tail (low cell), at least 10 apart
  let count = 0, tries = 0;
  while (count < 5 && ++tries < 300) {
    const head = pickUnused(22, 99);
    if (!head) continue;
    const tail = pickUnused(2, head - 10);
    if (!tail) continue;
    used.add(head); used.add(tail);
    snakes[head] = tail;
    count++;
  }

  // 5 ladders — bottom (low cell) → top (high cell), at least 10 apart
  count = 0; tries = 0;
  while (count < 5 && ++tries < 300) {
    const bottom = pickUnused(2, 88);
    if (!bottom || bottom + 10 > 99) continue;
    const top = pickUnused(bottom + 10, 99);
    if (!top) continue;
    used.add(bottom); used.add(top);
    ladders[bottom] = top;
    count++;
  }

  return { snakes, ladders };
}

// ─── Board coordinate helpers ─────────────────────────────────────────────────
// Returns SVG center {x,y} for a board position 1-100
function cellCenter(pos) {
  const idx     = pos - 1;
  const gameRow = Math.floor(idx / 10);           // 0 = bottom row (1-10)
  const col     = gameRow % 2 === 0 ? idx % 10 : 9 - (idx % 10);
  const vRow    = 9 - gameRow;                     // 0 = top of screen
  return { x: col * CELL + CELL / 2, y: vRow * CELL + CELL / 2 };
}

// Cell number for visual grid position (vRow=0 is top row = 91-100)
function cellNum(vRow, col) {
  const gameRow = 9 - vRow;
  const c       = gameRow % 2 === 0 ? col : 9 - col;
  return gameRow * 10 + c + 1;
}

// ─── Alternating row colours (vivid, kid-friendly pairs) ─────────────────────
const ROW_COLORS = [
  ['#fef3c7', '#fde68a'], // 91-100 — amber
  ['#dbeafe', '#bfdbfe'], // 81-90  — sky blue
  ['#dcfce7', '#bbf7d0'], // 71-80  — green
  ['#fce7f3', '#fbcfe8'], // 61-70  — pink
  ['#ede9fe', '#ddd6fe'], // 51-60  — violet
  ['#ffedd5', '#fed7aa'], // 41-50  — orange
  ['#cffafe', '#a5f3fc'], // 31-40  — cyan
  ['#fef9c3', '#fef08a'], // 21-30  — yellow
  ['#f0fdf4', '#bbf7d0'], // 11-20  — mint
  ['#fdf2f8', '#fce7f3'], // 1-10   — blush
];

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SnakeLadders({ onComplete }) {
  const [board,    setBoard]   = useState(generateBoard);
  const [players,  setPlayers] = useState([
    { name: 'You', pos: 0, color: '#7c3aed', emoji: '🟣' },
    { name: 'CPU', pos: 0, color: '#ef4444', emoji: '🔴' },
  ]);
  const [current,  setCurrent]  = useState(0);
  const [dice,     setDice]     = useState(null);
  const [message,  setMessage]  = useState('🎲 Roll the dice to start!');
  const [gameOver, setGameOver] = useState(false);
  const [rolling,  setRolling]  = useState(false);

  // Refs used to safely read latest values inside delayed callbacks
  const gameOverRef = useRef(false);
  const sessionRef  = useRef(0);        // incremented on reset to cancel stale timeouts

  const { snakes, ladders } = board;

  // Core roll logic — receives current players snapshot to avoid stale reads
  const rollInternal = (playerIdx, currentPlayers, session) => {
    if (gameOverRef.current || sessionRef.current !== session) return;
    setRolling(true);
    const d = Math.ceil(Math.random() * 6);
    setDice(d);

    setTimeout(() => {
      if (sessionRef.current !== session) return; // reset happened during delay

      const player = currentPlayers[playerIdx];
      let newPos   = player.pos + d;
      let msg      = `${player.name} rolled ${d}!`;
      let ended    = false;

      if (newPos > 100) {
        msg   += ' — too far, stay put!';
        newPos = player.pos;
      } else if (snakes[newPos] !== undefined) {
        msg   += ` 🐍 Snake! ${newPos} → ${snakes[newPos]}`;
        newPos = snakes[newPos];
      } else if (ladders[newPos] !== undefined) {
        msg   += ` 🪜 Ladder! ${newPos} → ${ladders[newPos]}`;
        newPos = ladders[newPos];
      }

      const newPlayers = currentPlayers.map((p, i) =>
        i === playerIdx ? { ...p, pos: newPos } : p
      );

      if (newPos >= 100) {
        ended = true;
        msg   = `🎉 ${player.name} wins!`;
        gameOverRef.current = true;
        setGameOver(true);
        if (playerIdx === 0) onComplete?.({ score: 50, won: true });
        else onComplete?.({ score: 0, won: false });
      }

      setPlayers(newPlayers);
      setMessage(msg);
      setRolling(false);

      if (!ended) {
        const next = playerIdx === 0 ? 1 : 0;
        setCurrent(next);
        if (next === 1) {
          setTimeout(() => rollInternal(1, newPlayers, session), 1200);
        }
      }
    }, 500);
  };

  const rollDice = () => {
    if (gameOver || rolling || current !== 0) return;
    rollInternal(0, players, sessionRef.current);
  };

  const reset = () => {
    sessionRef.current++;           // invalidate any pending CPU timeouts
    gameOverRef.current = false;
    setBoard(generateBoard());
    setPlayers([
      { name: 'You', pos: 0, color: '#7c3aed', emoji: '🟣' },
      { name: 'CPU', pos: 0, color: '#ef4444', emoji: '🔴' },
    ]);
    setCurrent(0);
    setDice(null);
    setMessage('🎲 Roll the dice to start!');
    setGameOver(false);
    setRolling(false);
  };

  // ── Board rows: vRow 0 = top (91-100), vRow 9 = bottom (1-10) ──────────────
  const boardRows = Array.from({ length: 10 }, (_, vRow) =>
    Array.from({ length: 10 }, (_, col) => cellNum(vRow, col))
  );

  // ── SVG path for a snake (cubic bezier, wavy) ─────────────────────────────
  const snakePath = (from, to) => {
    const h = cellCenter(from), t = cellCenter(to);
    const dx = t.x - h.x, dy = t.y - h.y;
    const c1x = h.x + dx * 0.33 + dy * 0.45;
    const c1y = h.y + dy * 0.33 - dx * 0.45;
    const c2x = h.x + dx * 0.66 - dy * 0.45;
    const c2y = h.y + dy * 0.66 + dx * 0.45;
    return { path: `M${h.x},${h.y} C${c1x},${c1y} ${c2x},${c2y} ${t.x},${t.y}`, head: h, tail: t };
  };

  // ── SVG geometry for a ladder ─────────────────────────────────────────────
  const ladderGeom = (from, to) => {
    const a = cellCenter(from), b = cellCenter(to);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const nx = (-dy / len) * 5, ny = (dx / len) * 5;
    const rungs = Math.max(2, Math.round(len / 26));
    return { a, b, dx, dy, nx, ny, rungs };
  };

  return (
    <div className="flex flex-col items-center gap-4 max-w-lg mx-auto w-full select-none">

      {/* ── Message banner ── */}
      <motion.div
        key={message}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800 rounded-xl px-4 py-2 text-sm text-center text-white font-bold w-full"
      >
        {message}
      </motion.div>

      {/* ── Board ── */}
      <div className="overflow-x-auto w-full flex justify-center">
        <div className="relative" style={{ width: BOARD, flexShrink: 0 }}>

          {/* Grid */}
          <div
            className="grid rounded-xl overflow-hidden shadow-2xl border-2 border-slate-500"
            style={{ gridTemplateColumns: `repeat(10, ${CELL}px)` }}
          >
            {boardRows.map((row, vRow) =>
              row.map((cell, col) => {
                const isSnakeHead = snakes[cell]  !== undefined;
                const isLadderBot = ladders[cell] !== undefined;
                const [c1, c2]   = ROW_COLORS[vRow];
                const bg         = (col + vRow) % 2 === 0 ? c1 : c2;
                const p0Here     = players[0].pos === cell;
                const p1Here     = players[1].pos === cell;
                const isSpecial  = cell === 1 || cell === 100;

                return (
                  <div
                    key={cell}
                    style={{
                      width: CELL, height: CELL,
                      backgroundColor: bg,
                      border: '1px solid rgba(0,0,0,0.1)',
                      ...(isSpecial ? { outline: '2.5px solid #7c3aed', outlineOffset: '-2px' } : {}),
                    }}
                    className="flex flex-col items-center justify-start pt-0.5 relative"
                  >
                    {/* Cell number */}
                    <span style={{
                      fontSize: 9, fontWeight: 700, lineHeight: 1,
                      color: isSnakeHead ? '#991b1b' : isLadderBot ? '#166534' : '#374151',
                    }}>
                      {cell}
                    </span>

                    {/* Player tokens — shown above SVG via z-index */}
                    {(p0Here || p1Here) && (
                      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ fontSize: 18 }}>
                        {p0Here && p1Here ? (
                          <span style={{ fontSize: 11 }}>🟣🔴</span>
                        ) : p0Here ? '🟣' : '🔴'}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* SVG overlay — snakes & ladders drawn on top */}
          <svg
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            width={BOARD}
            height={BOARD}
            viewBox={`0 0 ${BOARD} ${BOARD}`}
          >
            {/* ── Ladders ── */}
            {Object.entries(ladders).map(([from, to]) => {
              const { a, b, dx, dy, nx, ny, rungs } = ladderGeom(+from, +to);
              return (
                <g key={`L${from}-${to}`} opacity={0.88}>
                  {/* Shadow */}
                  <line x1={a.x-nx+1} y1={a.y-ny+1} x2={b.x-nx+1} y2={b.y-ny+1}
                    stroke="rgba(0,0,0,0.18)" strokeWidth="4" strokeLinecap="round" />
                  <line x1={a.x+nx+1} y1={a.y+ny+1} x2={b.x+nx+1} y2={b.y+ny+1}
                    stroke="rgba(0,0,0,0.18)" strokeWidth="4" strokeLinecap="round" />
                  {/* Left rail */}
                  <line x1={a.x-nx} y1={a.y-ny} x2={b.x-nx} y2={b.y-ny}
                    stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
                  {/* Right rail */}
                  <line x1={a.x+nx} y1={a.y+ny} x2={b.x+nx} y2={b.y+ny}
                    stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
                  {/* Rungs */}
                  {Array.from({ length: rungs }, (_, i) => {
                    const t  = (i + 1) / (rungs + 1);
                    const rx = a.x + dx * t;
                    const ry = a.y + dy * t;
                    return (
                      <line key={i}
                        x1={rx - nx * 1.5} y1={ry - ny * 1.5}
                        x2={rx + nx * 1.5} y2={ry + ny * 1.5}
                        stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
                    );
                  })}
                  {/* Base dot (green = safe to climb) */}
                  <circle cx={a.x} cy={a.y} r="5.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                  {/* Top dot */}
                  <circle cx={b.x} cy={b.y} r="5.5" fill="#15803d" stroke="#fff" strokeWidth="1.5" />
                </g>
              );
            })}

            {/* ── Snakes ── */}
            {Object.entries(snakes).map(([from, to]) => {
              const { path, head, tail } = snakePath(+from, +to);
              return (
                <g key={`S${from}-${to}`} opacity={0.9}>
                  {/* Drop shadow */}
                  <path d={path} fill="none"
                    stroke="rgba(0,0,0,0.22)" strokeWidth="9" strokeLinecap="round" />
                  {/* Body */}
                  <path d={path} fill="none"
                    stroke="#15803d" strokeWidth="7" strokeLinecap="round" />
                  {/* Scale stripe */}
                  <path d={path} fill="none"
                    stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray="5 9" />
                  {/* Head */}
                  <circle cx={head.x} cy={head.y} r="8" fill="#166534" stroke="#fff" strokeWidth="2" />
                  {/* Eyes */}
                  <circle cx={head.x - 3}  cy={head.y - 2} r="2"   fill="#fef08a" />
                  <circle cx={head.x + 3}  cy={head.y - 2} r="2"   fill="#fef08a" />
                  <circle cx={head.x - 3}  cy={head.y - 2} r="0.9" fill="#1e293b" />
                  <circle cx={head.x + 3}  cy={head.y - 2} r="0.9" fill="#1e293b" />
                  {/* Tail tip */}
                  <circle cx={tail.x} cy={tail.y} r="4.5" fill="#14532d" stroke="#fff" strokeWidth="1.5" />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-6">
        <div className="text-center min-w-[52px]">
          {rolling ? (
            <motion.div
              animate={{ rotate: [0, 25, -25, 15, -15, 0] }}
              transition={{ duration: 0.35, repeat: Infinity }}
              className="text-4xl"
            >
              🎲
            </motion.div>
          ) : (
            <div className="text-4xl">{dice ? DICE_FACES[dice - 1] : '🎲'}</div>
          )}
          <div className="text-xs text-slate-400 mt-0.5">
            {dice && !rolling ? `Rolled ${dice}` : 'Dice'}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={rollDice}
          disabled={current !== 0 || gameOver || rolling}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-game text-lg px-8 py-3 rounded-2xl transition"
        >
          🎲 Roll!
        </motion.button>

        <button
          onClick={reset}
          className="text-slate-400 hover:text-white transition text-sm font-semibold"
        >
          New Game
        </button>
      </div>

      {/* ── Player status ── */}
      <div className="flex gap-4 text-sm">
        {players.map((p, i) => (
          <div
            key={i}
            className={`text-center px-4 py-2 rounded-xl transition ${
              current === i && !gameOver
                ? 'bg-slate-700 ring-2 ring-purple-500'
                : 'bg-slate-800/50'
            }`}
          >
            <span style={{ color: p.color }} className="font-bold">
              {p.emoji} {p.name}
            </span>
            <div className="text-slate-400 text-xs mt-0.5">
              Square {p.pos || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex gap-5 text-xs text-slate-500">
        <span>
          <span className="inline-block w-3 h-1.5 rounded bg-green-700 mr-1 align-middle" />
          Snake (slide down)
        </span>
        <span>
          <span className="inline-block w-3 h-1.5 rounded bg-amber-700 mr-1 align-middle" />
          Ladder (climb up)
        </span>
        <span className="text-purple-400">⬡ = Start/End</span>
      </div>
    </div>
  );
}
