import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const W = 380, H = 520;
const BIRD_X   = 80;
const BIRD_R   = 16;          // collision radius
const PIPE_W   = 50;
const PIPE_GAP = 160;         // wider gap → more playable
const PIPE_SPEED   = 1.8;     // slower speed
const GRAVITY      = 0.28;    // softer gravity
const JUMP         = -6;      // gentle jump
const PIPE_INTERVAL = 140;    // more space between pipes

export default function FlappyBird({ onComplete }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);
  const animRef     = useRef(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [started,  setStarted]  = useState(false);
  const [alive,    setAlive]    = useState(false);
  const [bestScore,setBestScore] = useState(0);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    if (!s.started) {
      s.started = true;
      s.alive   = true;
      setStarted(true);
      setAlive(true);
    }
    if (s.alive) s.birdVY = JUMP;
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.code === 'Space') { e.preventDefault(); jump(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    stateRef.current = {
      birdY: H / 2, birdVY: 0,
      pipes: [], score: 0, frame: 0,
      alive: false, started: false,
      bgX: 0, // scrolling background offset
    };

    const draw = () => {
      const s = stateRef.current;

      /* ── Scrolling sky gradient ── */
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#1e3a5f');
      sky.addColorStop(1, '#4e9af1');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      /* ── Moving clouds (decorative) ── */
      s.bgX = (s.bgX - 0.3 + W) % W;
      [[s.bgX, 60], [(s.bgX + W * 0.5) % W, 110], [(s.bgX + W * 0.3) % W, 180]].forEach(([cx, cy]) => {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+22, cy+4, 18, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx-18, cy+6, 16, 0, Math.PI*2); ctx.fill();
      });

      /* ── Ground ── */
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(0, H - 50, W, 50);
      ctx.fillStyle = '#8bc34a';
      ctx.fillRect(0, H - 50, W, 12);
      // Ground stripes
      ctx.fillStyle = '#7cb342';
      for (let gx = (s.bgX * 2) % 40 - 40; gx < W; gx += 40) {
        ctx.fillRect(gx, H - 50, 20, 12);
      }

      if (s.alive) {
        s.birdVY += GRAVITY;
        s.birdY  += s.birdVY;
        s.frame++;

        // Spawn pipe
        if (s.frame % PIPE_INTERVAL === 0) {
          const topH = 60 + Math.random() * (H - PIPE_GAP - 120);
          s.pipes.push({ x: W, topH });
        }

        // Move pipes
        s.pipes.forEach(p => {
          p.x -= PIPE_SPEED;
          if (!p.passed && p.x + PIPE_W < BIRD_X) {
            p.passed = true;
            s.score++;
            setDisplayScore(s.score);
          }
        });
        s.pipes = s.pipes.filter(p => p.x > -PIPE_W - 10);

        // Collisions
        const botY = H - 50;
        if (s.birdY + BIRD_R > botY || s.birdY - BIRD_R < 0) {
          s.alive = false;
          setAlive(false);
          setBestScore(b => Math.max(b, s.score));
          onComplete?.({ score: s.score, won: false });
        }
        for (const p of s.pipes) {
          const inX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
          const inY = s.birdY - BIRD_R < p.topH || s.birdY + BIRD_R > p.topH + PIPE_GAP;
          if (inX && inY) {
            s.alive = false;
            setAlive(false);
            setBestScore(b => Math.max(b, s.score));
            onComplete?.({ score: s.score, won: false });
          }
        }
      }

      /* ── Pipes ── */
      s.pipes.forEach(p => {
        const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        grad.addColorStop(0, '#388e3c');
        grad.addColorStop(0.5, '#66bb6a');
        grad.addColorStop(1, '#2e7d32');
        ctx.fillStyle = grad;
        // Top pipe
        ctx.fillRect(p.x, 0, PIPE_W, p.topH);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(p.x - 4, p.topH - 22, PIPE_W + 8, 22);
        // Bottom pipe
        const botStart = p.topH + PIPE_GAP;
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, botStart, PIPE_W, H - botStart - 50);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(p.x - 4, botStart, PIPE_W + 8, 22);
      });

      /* ── Bird ── */
      const tilt = Math.min(Math.max(s.birdVY * 0.07, -0.5), 1.0);
      ctx.save();
      ctx.translate(BIRD_X, s.birdY);
      ctx.rotate(tilt);
      ctx.font = `${BIRD_R * 2 + 4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐦', 0, 0);
      ctx.restore();

      /* ── Score HUD ── */
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, W, 36);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 20px Fredoka One, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(s.score, W / 2, 26);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Nunito, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Best: ${Math.max(bestScore, s.score)}`, W - 8, 26);

      /* ── Start message ── */
      if (!s.started) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.roundRect(W/2 - 110, H/2 - 36, 220, 72, 12);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 17px Fredoka One, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tap or Space to fly!', W/2, H/2 - 8);
        ctx.font = '12px Nunito, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Avoid the pipes!', W/2, H/2 + 16);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const restart = () => {
    stateRef.current = {
      birdY: H / 2, birdVY: 0,
      pipes: [], score: 0, frame: 0,
      alive: false, started: false, bgX: 0,
    };
    setDisplayScore(0);
    setStarted(false);
    setAlive(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-6 text-sm font-bold">
        <span className="text-yellow-400">⭐ {displayScore}</span>
        <span className="text-slate-400">Best: {bestScore}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={W} height={H}
        onClick={jump}
        onTouchStart={(e) => { e.preventDefault(); jump(); }}
        className="rounded-2xl shadow-2xl border-2 border-slate-700"
        style={{ maxWidth: '100%', touchAction: 'none' }}
      />

      {!alive && started && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={restart}
          className="bg-sky-600 hover:bg-sky-500 text-white font-game text-lg px-8 py-3 rounded-2xl transition hover:scale-105"
        >
          🔄 Try Again
        </motion.button>
      )}
      <p className="text-slate-500 text-xs">Tap / Click / Space to flap</p>
    </div>
  );
}
