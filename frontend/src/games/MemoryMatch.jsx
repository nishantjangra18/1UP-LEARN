import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CARD_SETS = [
  { id: 'cat', emoji: '🐱' }, { id: 'dog', emoji: '🐶' },
  { id: 'star', emoji: '⭐' }, { id: 'sun', emoji: '☀️' },
  { id: 'moon', emoji: '🌙' }, { id: 'rocket', emoji: '🚀' },
  { id: 'fish', emoji: '🐟' }, { id: 'flower', emoji: '🌸' },
  { id: 'fire', emoji: '🔥' }, { id: 'gem', emoji: '💎' },
  { id: 'rainbow', emoji: '🌈' }, { id: 'crown', emoji: '👑' },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function MemoryMatch({ onComplete }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);

  const PAIRS = 4 + level * 2; // Start with 6 pairs, increase per level

  const initGame = () => {
    const selected = CARD_SETS.slice(0, Math.min(PAIRS, CARD_SETS.length));
    const doubled = [...selected, ...selected].map((c, i) => ({ ...c, uid: i }));
    setCards(shuffle(doubled));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameOver(false);
  };

  useEffect(() => { initGame(); }, [level]);

  const handleFlip = (uid) => {
    if (flipped.length === 2) return;
    if (flipped.includes(uid) || matched.some((m) => m === cards.find((c) => c.uid === uid)?.id)) return;

    const newFlipped = [...flipped, uid];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newFlipped.map((uid) => cards.find((c) => c.uid === uid));
      if (a.id === b.id) {
        const newMatched = [...matched, a.id];
        setMatched(newMatched);
        setScore((s) => s + 10);
        setTimeout(() => setFlipped([]), 500);

        if (newMatched.length === PAIRS) {
          setTimeout(() => {
            setGameOver(true);
            onComplete?.({ score: score + 10, won: true });
          }, 600);
        }
      } else {
        // Wrong pair — flash red briefly then flip back
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  const isFlipped = (uid) => {
    const card = cards.find((c) => c.uid === uid);
    return flipped.includes(uid) || matched.includes(card?.id);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Stats */}
      <div className="flex gap-6 text-sm font-bold">
        <span className="text-yellow-400">⭐ Score: {score}</span>
        <span className="text-slate-300">Moves: {moves}</span>
        <span className="text-teal-400">Matched: {matched.length}/{PAIRS}</span>
      </div>

      {/* Grid */}
      <div className={`grid gap-2 ${PAIRS <= 6 ? 'grid-cols-4' : 'grid-cols-5'}`}>
        {cards.map((card) => (
          <motion.button
            key={card.uid}
            onClick={() => handleFlip(card.uid)}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl perspective-500"
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotateY: isFlipped(card.uid) ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="relative w-full h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Back face */}
              <div
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-800 flex items-center justify-center text-2xl shadow-md"
                style={{ backfaceVisibility: 'hidden' }}
              >
                ?
              </div>
              {/* Front face */}
              <div
                className={`absolute inset-0 rounded-xl flex items-center justify-center text-2xl shadow-md
                  ${matched.includes(card.id) ? 'bg-green-700/80' : 'bg-slate-700'}`}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                {card.emoji}
              </div>
            </motion.div>
          </motion.button>
        ))}
      </div>

      {/* Game over */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center mt-2"
          >
            <div className="text-4xl mb-2">🎉</div>
            <div className="font-game text-xl text-green-400">All pairs matched!</div>
            <button
              onClick={() => setLevel((l) => l + 1)}
              className="mt-3 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded-xl transition"
            >
              Next Level →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!gameOver && (
        <button
          onClick={initGame}
          className="text-slate-400 hover:text-white text-sm transition"
        >
          🔄 Restart
        </button>
      )}
    </div>
  );
}
