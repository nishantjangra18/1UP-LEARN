import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { fetchJeopardyCategory, toJeopardyFormat, fetchRival } from '../services/quizService';
import { RivalBanner, RivalResult } from '../components/RivalCard';

/**
 * Jeopardy-style Quiz — uses Candy 🍬 instead of money.
 *
 * Questions are fetched dynamically from the AI backend.
 * Falls back to STATIC_CATEGORIES if the AI is unavailable.
 */

// ─── Static fallback questions (used if AI is unavailable) ───────────────────
const STATIC_CATEGORIES = {
  '🔬 Science': {
    10: { q: 'What do plants use to make food?', a: 'Sunlight', options: ['Water','Sunlight','Soil','Air'], explanation: 'Plants use sunlight through photosynthesis to produce their own food.' },
    20: { q: 'Which planet is closest to the Sun?', a: 'Mercury', options: ['Venus','Earth','Mercury','Mars'], explanation: 'Mercury is the innermost planet in our Solar System.' },
    30: { q: 'What gas do humans breathe to survive?', a: 'Oxygen', options: ['Nitrogen','Carbon Dioxide','Oxygen','Hydrogen'], explanation: 'Our cells need oxygen to release energy from food.' },
    40: { q: 'How many bones are in an adult human body?', a: '206', options: ['105','206','312','178'], explanation: 'Adults have 206 bones; babies are born with about 270 that fuse over time.' },
    50: { q: 'What is the smallest unit of life?', a: 'Cell', options: ['Atom','Molecule','Cell','Organ'], explanation: 'Every living thing is made of one or more cells.' },
  },
  '🧮 Math': {
    10: { q: 'What is 7 × 8?', a: '56', options: ['48','54','56','63'], explanation: '7 groups of 8 equals 56.' },
    20: { q: 'What is the value of π approximately?', a: '3.14', options: ['2.71','3.14','1.41','1.73'], explanation: 'Pi is the ratio of a circle\'s circumference to its diameter.' },
    30: { q: 'What is 25% of 200?', a: '50', options: ['25','40','50','75'], explanation: '25% means one quarter — 200 ÷ 4 = 50.' },
    40: { q: 'What is the next prime number after 11?', a: '13', options: ['12','13','14','15'], explanation: '13 is only divisible by 1 and itself.' },
    50: { q: 'What is the square root of 144?', a: '12', options: ['11','12','13','14'], explanation: '12 × 12 = 144.' },
  },
  '🏛️ History': {
    10: { q: 'Who was the first US President?', a: 'George Washington', options: ['Abraham Lincoln','Thomas Jefferson','George Washington','John Adams'], explanation: 'George Washington served as president from 1789 to 1797.' },
    20: { q: 'Which ancient wonder was in Egypt?', a: 'Great Pyramid', options: ['Colosseum','Great Wall','Great Pyramid','Parthenon'], explanation: 'The Great Pyramid of Giza is the only ancient wonder still standing.' },
    30: { q: 'In what year did World War II end?', a: '1945', options: ['1939','1942','1945','1950'], explanation: 'WWII ended in 1945 with the surrender of Germany and Japan.' },
    40: { q: 'Who invented the telephone?', a: 'Alexander Graham Bell', options: ['Thomas Edison','Nikola Tesla','Alexander Graham Bell','Benjamin Franklin'], explanation: 'Bell patented the telephone in 1876.' },
    50: { q: 'Which empire was the largest in history?', a: 'British Empire', options: ['Roman Empire','Mongol Empire','British Empire','Ottoman Empire'], explanation: 'At its peak the British Empire covered about 24% of Earth\'s land area.' },
  },
  '📚 English': {
    10: { q: 'What is the opposite of "happy"?', a: 'Sad', options: ['Sad','Fast','Hot','Big'], explanation: '"Sad" is the antonym of "happy".' },
    20: { q: 'Which word means "very large"?', a: 'Enormous', options: ['Tiny','Enormous','Gentle','Quiet'], explanation: '"Enormous" describes something extremely big.' },
    30: { q: 'What is a synonym for "brave"?', a: 'Courageous', options: ['Cowardly','Courageous','Timid','Reckless'], explanation: '"Courageous" and "brave" both mean showing courage in the face of fear.' },
    40: { q: 'What type of word is "quickly"?', a: 'Adverb', options: ['Noun','Adjective','Verb','Adverb'], explanation: 'Adverbs modify verbs — "quickly" tells us how something is done.' },
    50: { q: 'Who wrote "Romeo and Juliet"?', a: 'Shakespeare', options: ['Dickens','Austen','Shakespeare','Twain'], explanation: 'William Shakespeare wrote Romeo and Juliet in the late 16th century.' },
  },
};

const VALUES      = [10, 20, 30, 40, 50];
const CATEGORY_LABELS = ['🔬 Science', '🧮 Math', '🏛️ History', '📚 English'];
// Map label → plain topic name for the AI prompt
const LABEL_TO_TOPIC = {
  '🔬 Science': 'science',
  '🧮 Math':    'math',
  '🏛️ History': 'history',
  '📚 English': 'english vocabulary and grammar',
};

export default function Quiz({ onComplete }) {
  const { user } = useAuth();
  const age = user?.age || 8;

  // ── Board state ─────────────────────────────────────────────────────────
  const [categories, setCategories] = useState(null);   // null = loading
  const [loadError,  setLoadError]  = useState(false);  // true = AI failed
  const [answered,   setAnswered]   = useState({});     // key → true/false
  const [activeQ,    setActiveQ]    = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [candy,      setCandy]      = useState(0);

  // Track questions already shown — passed to AI to avoid repetition
  const [shownQuestions, setShownQuestions] = useState([]);

  // AI Rival
  const [rival,       setRival]       = useState(null);
  const [showRivalResult, setShowRivalResult] = useState(false);

  // ── Fetch AI questions on mount ─────────────────────────────────────────
  const loadQuestions = useCallback(async () => {
    setCategories(null);
    setLoadError(false);
    setAnswered({});
    setCandy(0);

    try {
      // Fetch all 4 categories in parallel
      const results = await Promise.allSettled(
        CATEGORY_LABELS.map((label) =>
          fetchJeopardyCategory(LABEL_TO_TOPIC[label], age, shownQuestions)
        )
      );

      const built = {};
      results.forEach((result, i) => {
        const label = CATEGORY_LABELS[i];
        if (result.status === 'fulfilled' && result.value?.questions?.length >= 5) {
          // Map 5 AI questions → value slots 10, 20, 30, 40, 50
          const cellMap = {};
          result.value.questions.slice(0, 5).forEach((q, idx) => {
            cellMap[VALUES[idx]] = toJeopardyFormat(q);
          });
          built[label] = cellMap;
        } else {
          // Fall back to static for this category only
          built[label] = STATIC_CATEGORIES[label];
        }
      });

      // Remember all question texts to pass as avoidQuestions next time
      const allQTexts = Object.values(built)
        .flatMap((cells) => Object.values(cells).map((c) => c.q));
      setShownQuestions((prev) => [...prev, ...allQTexts].slice(-50)); // keep last 50

      setCategories(built);
    } catch {
      // Full failure — use all-static fallback
      setLoadError(true);
      setCategories(STATIC_CATEGORIES);
    }
  }, [age]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadQuestions(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch rival intro after questions load (non-blocking)
  useEffect(() => {
    if (!categories) return;
    fetchRival({ score: 0, accuracy: 50, gameType: 'jeopardy', topic: 'General Knowledge', maxScore: 150 })
      .then((d) => setRival(d?.rival || null))
      .catch(() => {});
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Game logic ─────────────────────────────────────────────────────────
  const categoryKeys = categories ? Object.keys(categories) : CATEGORY_LABELS;
  const totalQ  = categoryKeys.length * VALUES.length;
  const doneQ   = Object.keys(answered).length;

  const openQuestion = (cat, val) => {
    const key = `${cat}-${val}`;
    if (answered.hasOwnProperty(key) || !categories) return;
    setActiveQ({ category: cat, value: val, ...categories[cat][val] });
    setSelected(null);
  };

  const submitAnswer = (option) => {
    if (selected || !activeQ) return;
    setSelected(option);
    const key = `${activeQ.category}-${activeQ.value}`;
    const correct = option === activeQ.a;
    setAnswered((p) => ({ ...p, [key]: correct }));
    if (correct) setCandy((c) => c + activeQ.value);

    setTimeout(() => {
      setActiveQ(null);
      if (doneQ + 1 >= totalQ) {
        const finalScore = candy + (correct ? activeQ.value : 0);
        if (rival) {
          setShowRivalResult(true);   // show rival comparison first
          // Fetch rival with actual score for accurate comparison
          fetchRival({ score: finalScore, accuracy: Math.round((finalScore / 150) * 100), gameType: 'jeopardy', topic: 'General Knowledge', maxScore: 150 })
            .then((d) => { if (d?.rival) setRival(d.rival); })
            .catch(() => {});
          // Call onComplete after a short delay so rival screen is seen
          setTimeout(() => onComplete?.({ score: finalScore, won: true }), 4000);
        } else {
          onComplete?.({ score: finalScore, won: true });
        }
      }
    }, 1800);
  };

  // ── Loading screen ──────────────────────────────────────────────────────
  if (!categories) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 w-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-5xl"
        >
          🤖
        </motion.div>
        <p className="text-slate-300 font-game text-lg animate-pulse">
          AI is generating your questions…
        </p>
        <p className="text-slate-500 text-sm">This takes a few seconds ✨</p>
      </div>
    );
  }

  // ── Board ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
      {/* Rival banner — shows when rival character is ready */}
      {rival && !showRivalResult && <RivalBanner rival={rival} />}

      {/* Rival result overlay — shows when game ends */}
      {showRivalResult && rival && (
        <div className="w-full">
          <RivalResult
            rival={rival}
            userScore={candy}
            maxScore={150}
            trackColor="from-blue-600 to-indigo-600"
          />
        </div>
      )}

      {/* Header row */}
      <div className="flex gap-6 items-center">
        <span className="font-game text-xl text-pink-400">🍬 {candy} Candy</span>
        <span className="text-slate-400 text-sm">{doneQ}/{totalQ} answered</span>
        {loadError && (
          <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-lg">
            ⚡ Using backup questions
          </span>
        )}
        {/* Regenerate button — allows a fresh AI set mid-game */}
        {doneQ === 0 && (
          <button
            onClick={loadQuestions}
            className="text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-lg transition"
          >
            🔄 New Questions
          </button>
        )}
      </div>

      {/* Jeopardy board */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {categoryKeys.map((cat) => (
                <th
                  key={cat}
                  className="bg-blue-900 text-white font-game text-xs sm:text-sm p-2 border border-blue-700 text-center"
                >
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VALUES.map((val) => (
              <tr key={val}>
                {categoryKeys.map((cat) => {
                  const key = `${cat}-${val}`;
                  const isAnswered = answered.hasOwnProperty(key);
                  const isCorrect  = answered[key];
                  return (
                    <td key={cat} className="p-1 border border-blue-900/50">
                      <motion.button
                        onClick={() => openQuestion(cat, val)}
                        whileHover={!isAnswered ? { scale: 1.06 } : {}}
                        className={`w-full py-3 rounded-xl font-game text-base transition
                          ${isAnswered
                            ? isCorrect
                              ? 'bg-green-800/60 text-green-400'
                              : 'bg-red-900/60 text-red-400 line-through'
                            : 'bg-blue-800 hover:bg-blue-700 text-pink-300'
                          }`}
                      >
                        {isAnswered ? (isCorrect ? '✓' : '✗') : `🍬 ${val}`}
                      </motion.button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Question modal */}
      <AnimatePresence>
        {activeQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.75, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.75, y: 40 }}
              className="bg-blue-950 rounded-3xl p-7 max-w-md w-full border border-blue-700 shadow-2xl"
            >
              <div className="font-game text-pink-400 text-lg mb-0.5">{activeQ.category}</div>
              <div className="font-game text-3xl text-pink-300 mb-3">🍬 {activeQ.value} Candy</div>
              <p className="text-white text-lg mb-6 leading-relaxed">{activeQ.q}</p>

              <div className="grid grid-cols-1 gap-3">
                {activeQ.options.map((opt) => {
                  let cls = 'bg-blue-800 hover:bg-blue-700 text-white border border-blue-700';
                  if (selected) {
                    if (opt === activeQ.a)       cls = 'bg-green-600 text-white border border-green-500';
                    else if (opt === selected)   cls = 'bg-red-600 text-white border border-red-500';
                    else                         cls = 'bg-blue-950 text-slate-500 border border-blue-900';
                  }
                  return (
                    <button
                      key={opt}
                      onClick={() => submitAnswer(opt)}
                      disabled={!!selected}
                      className={`mcq-option py-3 px-4 rounded-xl font-bold text-left transition ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Explanation shown after answering */}
              {selected && activeQ.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-sm text-slate-300 bg-slate-800/60 rounded-xl px-4 py-3"
                >
                  💡 {activeQ.explanation}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
