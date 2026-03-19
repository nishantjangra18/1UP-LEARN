import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Pool of quick revival questions
const REVIVAL_QUESTIONS = [
  { q: 'What is 6 × 7?', o: ['40','41','42','43'], a: '42' },
  { q: 'Which planet is closest to the Sun?', o: ['Venus','Mercury','Mars','Earth'], a: 'Mercury' },
  { q: 'What is the capital of France?', o: ['London','Berlin','Paris','Madrid'], a: 'Paris' },
  { q: 'How many sides does a hexagon have?', o: ['5','6','7','8'], a: '6' },
  { q: 'What gas do plants produce?', o: ['Carbon dioxide','Nitrogen','Oxygen','Hydrogen'], a: 'Oxygen' },
  { q: 'What is 15 × 4?', o: ['50','55','60','65'], a: '60' },
  { q: 'Which is the largest ocean?', o: ['Atlantic','Indian','Pacific','Arctic'], a: 'Pacific' },
  { q: 'What does a caterpillar turn into?', o: ['Moth','Bee','Butterfly','Wasp'], a: 'Butterfly' },
  { q: 'What is 144 ÷ 12?', o: ['11','12','13','14'], a: '12' },
  { q: 'How many bones in an adult body?', o: ['106','206','306','406'], a: '206' },
  { q: 'Who wrote Romeo and Juliet?', o: ['Dickens','Austen','Shakespeare','Twain'], a: 'Shakespeare' },
  { q: 'What is the square root of 81?', o: ['7','8','9','10'], a: '9' },
  { q: 'What is the boiling point of water?', o: ['90°C','95°C','100°C','110°C'], a: '100°C' },
  { q: 'How many continents are on Earth?', o: ['5','6','7','8'], a: '7' },
  { q: 'What animal is the fastest on land?', o: ['Lion','Horse','Cheetah','Leopard'], a: 'Cheetah' },
];

/**
 * ReviveModal — shows when a player loses a game.
 * Props:
 *   onRevive(boolean)  — called with true if answered correctly, false if wrong
 */
export default function ReviveModal({ onRevive }) {
  const [question] = useState(
    () => REVIVAL_QUESTIONS[Math.floor(Math.random() * REVIVAL_QUESTIONS.length)]
  );
  const [selected, setSelected] = useState(null);
  const [countdown, setCountdown] = useState(null); // null → not started, 0 → done

  const handleAnswer = (opt) => {
    if (selected) return;
    setSelected(opt);
    const correct = opt === question.a;

    if (correct) {
      // Start 1.5s countdown before reviving
      setCountdown(1.5);
    } else {
      // Wrong — notify parent after short delay
      setTimeout(() => onRevive(false), 1200);
    }
  };

  // Countdown tick
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => {
      const next = parseFloat((countdown - 0.1).toFixed(1));
      if (next <= 0) {
        setCountdown(0);
        onRevive(true);
      } else {
        setCountdown(next);
      }
    }, 100);
    return () => clearTimeout(t);
  }, [countdown]);

  const countdownPct = countdown !== null ? ((1.5 - countdown) / 1.5) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7 }}
        className="bg-slate-800 rounded-3xl p-7 max-w-md w-full border border-red-500/40 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-5xl mb-2">💔</div>
          <h3 className="font-game text-2xl text-white">Game Over!</h3>
          <p className="text-slate-400 text-sm mt-1">Answer correctly to keep playing!</p>
        </div>

        {/* Question */}
        <div className="bg-slate-700/60 rounded-2xl p-4 mb-5 text-center">
          <p className="text-white font-bold text-lg leading-relaxed">{question.q}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {question.o.map((opt) => {
            let cls = 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600';
            if (selected) {
              if (opt === question.a)
                cls = 'bg-green-600 text-white border border-green-500';
              else if (opt === selected)
                cls = 'bg-red-600 text-white border border-red-500';
              else
                cls = 'bg-slate-800 text-slate-500 border border-slate-700';
            }
            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={!!selected}
                className={`mcq-option py-3 px-2 rounded-xl font-bold text-sm transition ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Reviving countdown */}
        <AnimatePresence>
          {selected === question.a && countdown !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none" stroke="#22c55e" strokeWidth="6"
                    strokeDasharray="176"
                    strokeDashoffset={`${176 - (countdownPct / 100) * 176}`}
                    className="transition-all duration-100"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-game text-green-400 text-lg">
                  {countdown !== null && countdown > 0 ? '✓' : '→'}
                </span>
              </div>
              <p className="text-green-400 font-bold text-sm">Correct! Reviving…</p>
            </motion.div>
          )}
          {selected && selected !== question.a && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-red-400 font-bold">
                Wrong! The answer was <span className="text-white">{question.a}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
