import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GRID_SIZE = 9; // 3x3 grid
const GAME_DURATION = 30; // seconds

export default function WhackAMole({ onComplete }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [moles, setMoles] = useState(Array(GRID_SIZE).fill(false));
  const [hits, setHits] = useState([]);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [missed, setMissed] = useState([]);

  const timerRef = useRef(null);
  const moleRef = useRef(null);

  // Spawn moles at increasing frequency
  const spawnMole = useCallback(() => {
    setMoles((prev) => {
      const newMoles = Array(GRID_SIZE).fill(false);
      // Active 1-3 moles at once depending on remaining time
      const count = timeLeft > 20 ? 1 : timeLeft > 10 ? 2 : 3;
      const indices = [];
      while (indices.length < count) {
        const i = Math.floor(Math.random() * GRID_SIZE);
        if (!indices.includes(i)) indices.push(i);
      }
      indices.forEach((i) => (newMoles[i] = true));
      return newMoles;
    });
  }, [timeLeft]);

  useEffect(() => {
    if (!started || gameOver) return;

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setGameOver(true);
          setMoles(Array(GRID_SIZE).fill(false));
          onComplete?.({ score, won: true });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Spawn moles every 800ms
    moleRef.current = setInterval(spawnMole, 800);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(moleRef.current);
    };
  }, [started, gameOver, spawnMole]);

  const whack = (i) => {
    if (!started || gameOver || !moles[i]) return;
    setScore((s) => s + 10);
    setHits((h) => [...h, { id: Date.now(), i }]);
    setMoles((m) => m.map((v, idx) => (idx === i ? false : v)));
    setTimeout(() => setHits((h) => h.slice(1)), 600);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setMoles(Array(GRID_SIZE).fill(false));
    setGameOver(false);
    setStarted(true);
  };

  const timerColor = timeLeft > 15 ? 'text-green-400' : timeLeft > 7 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Header */}
      <div className="flex gap-8 items-center">
        <span className="font-game text-2xl text-yellow-400">⭐ {score}</span>
        <span className={`font-game text-2xl ${timerColor}`}>⏱ {timeLeft}s</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-green-900/30 rounded-3xl">
        {Array(GRID_SIZE).fill(0).map((_, i) => (
          <button
            key={i}
            onClick={() => whack(i)}
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-green-800/60 overflow-hidden flex items-end justify-center border-2 border-green-700/50 hover:bg-green-700/60 transition active:scale-95"
          >
            {/* Mole hole */}
            <div className="absolute bottom-0 w-14 h-5 bg-green-950/80 rounded-full" />
            {/* Mole */}
            <AnimatePresence>
              {moles[i] && (
                <motion.div
                  initial={{ y: 60 }}
                  animate={{ y: 0 }}
                  exit={{ y: 60 }}
                  transition={{ duration: 0.15 }}
                  className="relative z-10 text-4xl sm:text-5xl pb-1 select-none cursor-pointer"
                >
                  🐹
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      {/* +10 hit animations */}
      {hits.map((h) => (
        <motion.div
          key={h.id}
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -40 }}
          className="fixed pointer-events-none font-game text-xl text-yellow-400 z-50"
          style={{ top: '40%', left: '50%' }}
        >
          +10
        </motion.div>
      ))}

      {/* Start / Game Over overlay */}
      <AnimatePresence>
        {(!started || gameOver) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-3xl z-20"
          >
            {gameOver ? (
              <>
                <div className="text-5xl mb-3">🏁</div>
                <div className="font-game text-3xl text-white mb-1">Time's Up!</div>
                <div className="font-game text-xl text-yellow-400 mb-4">Score: {score}</div>
              </>
            ) : (
              <>
                <div className="text-5xl mb-3">🐹</div>
                <div className="font-game text-2xl text-white mb-4">Whack-a-Mole!</div>
              </>
            )}
            <button
              onClick={startGame}
              className="bg-orange-500 hover:bg-orange-400 text-white font-game text-xl px-8 py-3 rounded-2xl transition hover:scale-105"
            >
              {gameOver ? 'Play Again' : 'Start!'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
