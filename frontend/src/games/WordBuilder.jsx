import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Word Builder — unscramble a given set of letters to form the hidden word.
 * Rules:
 *  - The answer must be the EXACT target word.
 *  - Each letter can only be used as many times as it appears in the given letters.
 *  - Hint shows the first letter (no score penalty — per spec).
 */

const PUZZLES = [
  { word: 'CLOUD',  hint: 'Fluffy things in the sky ☁️',      track: 'Science' },
  { word: 'PLANT',  hint: 'It grows from a seed 🌱',           track: 'Science' },
  { word: 'ORBIT',  hint: 'Path around a star 🪐',            track: 'Science' },
  { word: 'LIGHT',  hint: 'Makes things visible 💡',           track: 'Science' },
  { word: 'RIVER',  hint: 'Flows to the sea 🏞️',              track: 'Science' },
  { word: 'EQUAL',  hint: 'Same on both sides ⚖️',            track: 'Math' },
  { word: 'PRIME',  hint: 'Divisible only by 1 and itself 🔢', track: 'Math' },
  { word: 'ANGLE',  hint: 'Measured in degrees 📐',            track: 'Math' },
  { word: 'GRAPH',  hint: 'A chart that shows data 📊',        track: 'Math' },
  { word: 'BRAVE',  hint: 'Not afraid 🦁',                     track: 'English' },
  { word: 'STORY',  hint: 'A tale you read or hear 📖',        track: 'English' },
  { word: 'RHYME',  hint: 'Words that sound similar at the end 🎵', track: 'English' },
  { word: 'NOVEL',  hint: 'A long book 📚',                    track: 'English' },
  { word: 'EARTH',  hint: 'Our home planet 🌍',                track: 'History' },
  { word: 'QUEEN',  hint: 'A female ruler 👑',                  track: 'History' },
  { word: 'SWORD',  hint: 'A knight\'s weapon ⚔️',             track: 'History' },
  { word: 'GLOBE',  hint: 'A round map of the world 🌐',       track: 'Geography' },
  { word: 'OCEAN',  hint: 'Vast body of salt water 🌊',        track: 'Geography' },
  { word: 'MUSIC',  hint: 'Sound organized into art 🎶',       track: 'Creative' },
  { word: 'PAINT',  hint: 'Used by artists on canvas 🎨',      track: 'Creative' },
];

/** Shuffle a string's letters */
function scramble(word) {
  const arr = word.split('');
  let shuffled;
  do {
    shuffled = [...arr].sort(() => Math.random() - 0.5);
  } while (shuffled.join('') === word); // ensure it's actually scrambled
  return shuffled;
}

export default function WordBuilder({ onComplete }) {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [score,     setScore]     = useState(0);
  const [hintUsed,  setHintUsed]  = useState(false);
  const [feedback,  setFeedback]  = useState(null); // 'correct' | 'wrong'
  const [solved,    setSolved]    = useState([]);

  const puzzle = PUZZLES[puzzleIdx % PUZZLES.length];

  // Generate scrambled letters once per puzzle
  const letters = useMemo(() => scramble(puzzle.word), [puzzleIdx]);
  const [selected, setSelected] = useState([]);   // array of letter-indices from `letters`

  const currentWord = selected.map(i => letters[i]).join('');

  const selectLetter = (i) => {
    if (selected.includes(i)) return;
    setSelected(s => [...s, i]);
  };

  const deselectLast = () => {
    setSelected(s => s.slice(0, -1));
  };

  const clearSelection = () => setSelected([]);

  const submit = () => {
    if (currentWord.length !== puzzle.word.length) return;
    if (currentWord === puzzle.word) {
      setFeedback('correct');
      setScore(s => s + (hintUsed ? 5 : 10));
      setSolved(p => [...p, puzzleIdx]);
      setTimeout(() => {
        const next = puzzleIdx + 1;
        if (next >= PUZZLES.length) {
          onComplete?.({ score: score + 10, won: true });
        } else {
          setPuzzleIdx(next);
          setSelected([]);
          setFeedback(null);
          setHintUsed(false);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      setSelected([]);
      setTimeout(() => {
        setFeedback(null);
        onComplete?.({ score, won: false });
      }, 700);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 max-w-sm mx-auto w-full">
      {/* Header */}
      <div className="flex gap-4 text-sm font-bold w-full justify-between">
        <span className="text-yellow-400">⭐ {score} pts</span>
        <span className="text-purple-400">{puzzle.track}</span>
        <span className="text-slate-400">{puzzleIdx + 1}/{PUZZLES.length}</span>
      </div>

      {/* Hint */}
      <div className="bg-slate-700/50 rounded-xl px-4 py-2 text-sm text-slate-300 text-center">
        💡 {puzzle.hint}
      </div>

      {/* Answer display */}
      <div className={`w-full min-h-[60px] bg-slate-800 rounded-2xl p-3 flex items-center justify-center gap-1
        border-2 transition ${feedback === 'correct' ? 'border-green-500 bg-green-900/20' :
          feedback === 'wrong' ? 'border-red-500 bg-red-900/20 animate-wiggle' : 'border-slate-600'}`}
      >
        {Array(puzzle.word.length).fill(0).map((_, i) => {
          const letter = selected[i] !== undefined ? letters[selected[i]] : null;
          return (
            <motion.div
              key={i}
              className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-game text-xl
                ${letter ? 'border-purple-500 bg-purple-600/30 text-white' : 'border-slate-600 text-slate-600'}`}
            >
              {letter || (hintUsed && i === 0 ? puzzle.word[0] : '·')}
            </motion.div>
          );
        })}
      </div>

      {feedback && (
        <div className={`font-bold text-lg ${feedback === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
          {feedback === 'correct' ? '🎉 Correct!' : '❌ Try again!'}
        </div>
      )}

      {/* Scrambled letter buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {letters.map((letter, i) => (
          <motion.button
            key={i}
            onClick={() => selectLetter(i)}
            disabled={selected.includes(i) || !!feedback}
            whileHover={!selected.includes(i) ? { scale: 1.1, y: -2 } : {}}
            whileTap={{ scale: 0.9 }}
            className={`w-12 h-12 rounded-xl font-game text-xl transition shadow-md
              ${selected.includes(i)
                ? 'bg-slate-700 text-slate-500 scale-95'
                : 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white hover:from-purple-500'
              }`}
          >
            {letter}
          </motion.button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap justify-center">
        <button onClick={deselectLast}
          className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-2 rounded-xl text-sm transition">
          ⌫ Back
        </button>
        <button onClick={clearSelection}
          className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-2 rounded-xl text-sm transition">
          🔄 Clear
        </button>
        <button
          onClick={() => setHintUsed(true)}
          disabled={hintUsed}
          className="bg-amber-700/70 hover:bg-amber-600/70 disabled:opacity-40 text-white font-bold px-3 py-2 rounded-xl text-sm transition"
        >
          💡 Show First Letter
        </button>
        <button
          onClick={submit}
          disabled={currentWord.length !== puzzle.word.length || !!feedback}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-xl transition"
        >
          ✓ Check
        </button>
      </div>
    </div>
  );
}
