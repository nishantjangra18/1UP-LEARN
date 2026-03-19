import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Math Blast — Timed arithmetic challenge.
 * Difficulty scales with level.
 * No penalty for hints (removed per spec).
 * Manual "End Game" (submit) button.
 */

function generateQuestion(level) {
  // Operators available per level
  const ops = level <= 1 ? ['+', '-']
    : level <= 2 ? ['+', '-', '×']
    : level <= 3 ? ['+', '-', '×', '÷']
    : ['+', '-', '×', '÷', '^']; // level 4+ includes squares

  const op = ops[Math.floor(Math.random() * ops.length)];

  let a, b, answer;
  const range = 10 + level * 12; // harder numbers at higher levels

  switch (op) {
    case '+':
      a = Math.ceil(Math.random() * range);
      b = Math.ceil(Math.random() * range);
      answer = a + b;
      break;
    case '-':
      a = Math.ceil(Math.random() * range);
      b = Math.ceil(Math.random() * a);
      answer = a - b;
      break;
    case '×':
      a = Math.ceil(Math.random() * (level < 3 ? 12 : 20));
      b = Math.ceil(Math.random() * (level < 3 ? 12 : 15));
      answer = a * b;
      break;
    case '÷':
      b = Math.ceil(Math.random() * 12);
      a = b * Math.ceil(Math.random() * 12);
      answer = a / b;
      break;
    case '^':
      a = Math.ceil(Math.random() * 10);
      b = 2;
      answer = a ** b;
      break;
    default:
      a = 5; b = 3; answer = 8;
  }

  // 3 unique wrong options near the correct answer
  const wrong = new Set();
  while (wrong.size < 3) {
    const delta = Math.ceil(Math.random() * Math.max(5, Math.floor(answer * 0.2)));
    const w = answer + (Math.random() > 0.5 ? delta : -delta);
    if (w !== answer && w >= 0 && Number.isInteger(w)) wrong.add(w);
  }
  const options = [...wrong, answer].sort(() => Math.random() - 0.5);

  return { question: op === '^' ? `${a}² = ?` : `${a} ${op} ${b} = ?`, answer, options };
}

const TIME_PER_Q = 18; // seconds per question (more generous)

export default function MathBlast({ onComplete }) {
  const [level,        setLevel]        = useState(1);
  const [q,            setQ]            = useState(() => generateQuestion(1));
  const [score,        setScore]        = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [timeLeft,     setTimeLeft]     = useState(TIME_PER_Q);
  const [feedback,     setFeedback]     = useState(null);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalPlayed,  setTotalPlayed]  = useState(0);
  const [gameOver,     setGameOver]     = useState(false);
  const timerRef = useRef(null);

  const nextQuestion = (lvl = level) => {
    setQ(generateQuestion(lvl));
    setFeedback(null);
    setTimeLeft(TIME_PER_Q);
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // Timeout counts as wrong
          setStreak(0);
          setTotalPlayed(n => n + 1);
          setFeedback('timeout');
          setTimeout(() => nextQuestion(), 900);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => { startTimer(); return () => clearInterval(timerRef.current); }, [q]);

  const answer = (opt) => {
    if (feedback) return;
    clearInterval(timerRef.current);
    const correct = opt === q.answer;
    const newPlayed = totalPlayed + 1;
    setTotalPlayed(newPlayed);

    if (correct) {
      const bonus = streak >= 3 ? 30 : 15; // higher base points
      const time_bonus = timeLeft * 3;
      setScore(s => s + bonus + time_bonus);
      setStreak(s => s + 1);
      setTotalCorrect(n => {
        const tc = n + 1;
        // Level up every 5 correct answers
        if (tc % 5 === 0) setLevel(l => Math.min(l + 1, 5));
        return tc;
      });
      setFeedback('correct');
    } else {
      setStreak(0);
      setFeedback('wrong');
    }

    setTimeout(() => nextQuestion(level), 900);
  };

  const endGame = () => {
    clearInterval(timerRef.current);
    setGameOver(true);
    onComplete?.({ score, won: totalCorrect >= 5 });
  };

  const timerColor = timeLeft > 10 ? 'text-green-400' : timeLeft > 5 ? 'text-yellow-400' : 'text-red-400';

  if (gameOver) {
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-5xl mb-3">🧮</div>
        <div className="font-game text-3xl text-white mb-2">Well done!</div>
        <div className="font-game text-xl text-yellow-400 mb-1">Score: {score}</div>
        <div className="text-slate-400 text-sm mb-5">
          Correct: {totalCorrect} / {totalPlayed} &nbsp;|&nbsp; Level reached: {level}
        </div>
        <button
          onClick={() => {
            setScore(0); setStreak(0); setLevel(1); setTotalCorrect(0); setTotalPlayed(0);
            setGameOver(false); setQ(generateQuestion(1)); setTimeLeft(TIME_PER_Q);
          }}
          className="bg-purple-600 hover:bg-purple-500 text-white font-game px-8 py-3 rounded-2xl transition"
        >
          Play Again
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 max-w-sm mx-auto w-full">
      {/* Header */}
      <div className="flex gap-4 text-sm font-bold w-full justify-between">
        <span className="text-yellow-400">⭐ {score}</span>
        <span className="text-purple-400">Lv.{level}</span>
        <span className="text-orange-400">🔥 ×{streak}</span>
        <button onClick={endGame}
          className="text-slate-400 hover:text-green-400 text-xs font-bold px-2 py-1 rounded-lg border border-slate-600 hover:border-green-500 transition">
          ✓ Submit
        </button>
      </div>

      {/* Timer bar */}
      <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-colors ${
            timeLeft > 10 ? 'bg-green-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          animate={{ width: `${(timeLeft / TIME_PER_Q) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span className={`font-game text-2xl ${timerColor}`}>{timeLeft}s</span>

      {/* Question card */}
      <motion.div
        key={q.question}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-full bg-slate-800 rounded-2xl p-6 text-center border-2 transition
          ${feedback === 'correct' ? 'border-green-500 bg-green-900/20' :
            feedback === 'wrong' || feedback === 'timeout' ? 'border-red-500 bg-red-900/20' :
            'border-slate-600'}`}
      >
        <div className="font-game text-4xl text-white">{q.question}</div>
        {feedback === 'correct' && (
          <div className="text-green-400 font-bold mt-2">✓ Correct! +{streak >= 3 ? '30' : '15'} pts</div>
        )}
        {feedback === 'wrong' && (
          <div className="text-red-400 font-bold mt-2">✗ Answer: {q.answer}</div>
        )}
        {feedback === 'timeout' && (
          <div className="text-orange-400 font-bold mt-2">⏱ Time! Answer: {q.answer}</div>
        )}
      </motion.div>

      {/* Answer options */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {q.options.map(opt => (
          <motion.button
            key={opt}
            onClick={() => answer(opt)}
            disabled={!!feedback}
            whileHover={!feedback ? { scale: 1.04 } : {}}
            whileTap={!feedback ? { scale: 0.96 } : {}}
            className={`py-4 rounded-2xl font-game text-xl transition
              ${feedback
                ? opt === q.answer ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-500'
                : 'bg-gradient-to-br from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg'
              }`}
          >
            {opt}
          </motion.button>
        ))}
      </div>

      <p className="text-slate-600 text-xs">
        Correct: {totalCorrect} / {totalPlayed} &nbsp;|&nbsp;
        Streak bonus kicks in at ×3 🔥
      </p>
    </div>
  );
}
