import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const W = 400, H = 400;
const SHOTS_PER_ROUND = 10;
const TARGET_SPEED    = 1.8; // px per frame (comfortable)
const TARGET_R        = 70;  // outer radius of bullseye

/* Ring definitions: radius, score, color */
const RINGS = [
  { r: 14, score: 100, fill: '#facc15', label: 'BULLSEYE!' },
  { r: 28, score:  75, fill: '#f97316', label: 'Amazing!' },
  { r: 42, score:  50, fill: '#ef4444', label: 'Great!' },
  { r: 56, score:  25, fill: '#ffffff', label: 'Good!' },
  { r: TARGET_R, score: 10, fill: '#1e293b', label: 'Hit!' },
];

export default function Bullseye({ onComplete }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const stateRef  = useRef(null);
  const [shotsLeft, setShotsLeft] = useState(SHOTS_PER_ROUND);
  const [score,     setScore]     = useState(0);
  const [hits,      setHits]      = useState([]); // [{label, value}]
  const [gameOver,  setGameOver]  = useState(false);
  const [started,   setStarted]   = useState(false);

  const initState = () => ({
    tx: W / 2, ty: H / 2,
    vx: (Math.random() > 0.5 ? 1 : -1) * TARGET_SPEED,
    vy: (Math.random() > 0.5 ? 1 : -1) * TARGET_SPEED * 0.7,
    shotsLeft: SHOTS_PER_ROUND,
    score: 0,
    hitFlash: 0,
  });

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s   = stateRef.current;

    // Move target
    s.tx += s.vx;
    s.ty += s.vy;
    // Bounce off walls with buffer
    if (s.tx - TARGET_R < 0)   { s.tx = TARGET_R;     s.vx *= -1; }
    if (s.tx + TARGET_R > W)   { s.tx = W - TARGET_R; s.vx *= -1; }
    if (s.ty - TARGET_R < 0)   { s.ty = TARGET_R;     s.vy *= -1; }
    if (s.ty + TARGET_R > H)   { s.ty = H - TARGET_R; s.vy *= -1; }

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Draw rings (outer to inner)
    [...RINGS].reverse().forEach(ring => {
      ctx.beginPath();
      ctx.arc(s.tx, s.ty, ring.r, 0, Math.PI * 2);
      ctx.fillStyle = ring.fill;
      ctx.fill();
      // Ring border
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Cross-hair on target center
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.tx - 12, s.ty); ctx.lineTo(s.tx + 12, s.ty);
    ctx.moveTo(s.tx, s.ty - 12); ctx.lineTo(s.tx, s.ty + 12);
    ctx.stroke();

    // Hit flash overlay
    if (s.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,220,50,${s.hitFlash * 0.4})`;
      ctx.beginPath();
      ctx.arc(s.tx, s.ty, TARGET_R, 0, Math.PI * 2);
      ctx.fill();
      s.hitFlash -= 0.1;
    }

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, 36);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 14px Fredoka One, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⭐ ${s.score}`, 10, 23);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`🏹 ${s.shotsLeft} shots left`, W / 2, 23);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('Click to shoot!', W - 10, 23);

    animRef.current = requestAnimationFrame(drawFrame);
  }, []);

  const shoot = useCallback((e) => {
    const s = stateRef.current;
    if (!s || s.shotsLeft <= 0 || !started || gameOver) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top)  * scaleY;

    const dist = Math.hypot(cx - s.tx, cy - s.ty);
    let hitRing = null;
    for (const ring of RINGS) {
      if (dist <= ring.r) { hitRing = ring; break; }
    }

    if (hitRing) {
      s.score += hitRing.score;
      s.hitFlash = 1;
      setScore(s.score);
      setHits(h => [...h.slice(-4), { label: hitRing.label, value: hitRing.score }]);
    } else {
      setHits(h => [...h.slice(-4), { label: 'Miss!', value: 0 }]);
    }

    s.shotsLeft--;
    setShotsLeft(s.shotsLeft);

    if (s.shotsLeft <= 0) {
      cancelAnimationFrame(animRef.current);
      setGameOver(true);
      onComplete?.({ score: s.score, won: s.score >= 200 });
    }
  }, [started, gameOver, onComplete]);

  const startGame = () => {
    stateRef.current = initState();
    setScore(0); setShotsLeft(SHOTS_PER_ROUND);
    setHits([]); setGameOver(false); setStarted(true);
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(drawFrame);
  };

  useEffect(() => {
    // Draw initial state
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = 'bold 18px Fredoka One, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎯 Click Start to Play!', W / 2, H / 2);
  }, []);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Hit feed */}
      <div className="flex gap-2 flex-wrap justify-center min-h-7">
        <AnimatePresence>
          {hits.map((h, i) => (
            <motion.span
              key={`${i}-${h.label}`}
              initial={{ opacity: 0, scale: 0.5, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={`font-game text-sm px-3 py-0.5 rounded-full
                ${h.value >= 100 ? 'bg-yellow-500 text-black' :
                  h.value >= 50  ? 'bg-orange-500 text-white' :
                  h.value > 0    ? 'bg-green-600 text-white'  :
                                   'bg-slate-700 text-slate-400'}`}
            >
              {h.label} {h.value > 0 && `+${h.value}`}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={shoot}
        className="rounded-2xl border-2 border-slate-600 shadow-2xl"
        style={{ maxWidth: '100%', cursor: started && !gameOver ? 'crosshair' : 'default' }}
      />

      {!started && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={startGame}
          className="bg-orange-600 hover:bg-orange-500 text-white font-game text-xl px-8 py-3 rounded-2xl transition hover:scale-105"
        >
          🎯 Start Game
        </motion.button>
      )}

      {gameOver && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="font-game text-2xl text-yellow-400 mb-2">⭐ Final Score: {score}</div>
          <button onClick={startGame}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-2 rounded-xl transition">
            🔄 Play Again
          </button>
        </motion.div>
      )}

      <div className="text-xs text-slate-500 flex gap-4">
        <span className="text-yellow-400">🎯 Center = 100pts</span>
        <span className="text-orange-400">● = 75</span>
        <span className="text-red-400">● = 50</span>
        <span className="text-white">● = 25</span>
      </div>
    </div>
  );
}
