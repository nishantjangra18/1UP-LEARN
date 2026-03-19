import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

const TILE_COLORS = {
  correct: 'bg-green-600 border-green-600',
  present: 'bg-yellow-600 border-yellow-600',
  absent: 'bg-slate-600 border-slate-600',
  empty: 'bg-transparent border-slate-600',
  active: 'bg-transparent border-slate-400',
};

export default function WordleModal({ onClose }) {
  const { t } = useTranslation();
  const [wordLength, setWordLength] = useState(5);
  const [hint, setHint] = useState('');
  const [relatedTrack, setRelatedTrack] = useState('');
  const [guesses, setGuesses] = useState([]); // [{letter, status}[]]
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [definition, setDefinition] = useState('');
  const [revealedWord, setRevealedWord] = useState('');
  const [loading, setLoading] = useState(true);
  const [letterColors, setLetterColors] = useState({}); // keyboard color tracking

  const MAX_GUESSES = 6;

  useEffect(() => {
    axios.get('/api/wordle/today').then((res) => {
      setWordLength(res.data.wordLength);
      setHint(res.data.hint);
      setRelatedTrack(res.data.relatedTrack);
      setLoading(false);
    });
  }, []);

  const submitGuess = async () => {
    if (currentGuess.length !== wordLength) return;

    try {
      const res = await axios.post('/api/wordle/guess', { guess: currentGuess });
      const newRow = currentGuess.split('').map((letter, i) => ({
        letter,
        status: res.data.result[i],
      }));

      // Update keyboard colors
      const newColors = { ...letterColors };
      newRow.forEach(({ letter, status }) => {
        const priority = { correct: 3, present: 2, absent: 1 };
        if ((priority[status] || 0) > (priority[newColors[letter]] || 0)) {
          newColors[letter] = status;
        }
      });
      setLetterColors(newColors);

      const newGuesses = [...guesses, newRow];
      setGuesses(newGuesses);
      setCurrentGuess('');

      if (res.data.isWin) {
        setWon(true);
        setGameOver(true);
        setDefinition(res.data.definition);
        setRevealedWord(res.data.word);
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameOver(true);
        // Reveal word
        setRevealedWord(res.data.word || '?????');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting guess');
    }
  };

  const handleKey = (key) => {
    if (gameOver) return;
    if (key === 'ENTER') { submitGuess(); return; }
    if (key === '⌫') { setCurrentGuess((p) => p.slice(0, -1)); return; }
    if (currentGuess.length < wordLength && /^[A-Z]$/.test(key)) {
      setCurrentGuess((p) => p + key);
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toUpperCase();
      if (key === 'BACKSPACE') handleKey('⌫');
      else if (key === 'ENTER') handleKey('ENTER');
      else if (/^[A-Z]$/.test(key)) handleKey(key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentGuess, gameOver]);

  // Build the grid rows
  const rows = [
    ...guesses,
    // Active row (if game still going)
    ...((!gameOver && guesses.length < MAX_GUESSES)
      ? [currentGuess.split('').map((l) => ({ letter: l, status: 'active' })).concat(
          Array(wordLength - currentGuess.length).fill({ letter: '', status: 'active' })
        )]
      : []),
    // Empty future rows
    ...Array(Math.max(0, MAX_GUESSES - guesses.length - (gameOver ? 0 : 1))).fill(
      Array(wordLength).fill({ letter: '', status: 'empty' })
    ),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-game text-2xl text-white">{t('wordle.title')} 🔤</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl transition">✕</button>
        </div>

        {hint && (
          <div className="mb-4 bg-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300">
            💡 <span className="font-bold">{t('wordle.hint')}:</span> {hint}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-slate-400">{t('common.loading')}</div>
        ) : (
          <>
            {/* Guess Grid */}
            <div className="flex flex-col gap-1.5 mb-6">
              {rows.slice(0, MAX_GUESSES).map((row, ri) => (
                <div key={ri} className="flex gap-1.5 justify-center">
                  {row.map((tile, ci) => (
                    <motion.div
                      key={ci}
                      animate={tile.status !== 'empty' && tile.status !== 'active' && tile.letter ? { rotateX: [0, 90, 0] } : {}}
                      transition={{ delay: ci * 0.1 }}
                      className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center font-game text-xl text-white uppercase
                        ${TILE_COLORS[tile.status] || TILE_COLORS.empty}`}
                    >
                      {tile.letter}
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>

            {/* Game over message */}
            <AnimatePresence>
              {gameOver && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-2xl p-4 mb-4 text-center ${won ? 'bg-green-800/60' : 'bg-red-900/60'}`}
                >
                  <div className="text-3xl mb-1">{won ? '🎉' : '😢'}</div>
                  <div className="font-game text-lg text-white">
                    {won ? t('wordle.congrats') : `The word was: ${revealedWord}`}
                  </div>
                  {definition && (
                    <div className="text-sm text-slate-300 mt-2">
                      📖 {t('wordle.definition')}: {definition}
                    </div>
                  )}
                  {relatedTrack && (
                    <a
                      href={`/learn`}
                      className="inline-block mt-3 bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-purple-500 transition"
                    >
                      🗺️ {t('wordle.explore')} — {relatedTrack}
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keyboard */}
            <div className="flex flex-col gap-1.5">
              {KEYBOARD_ROWS.map((row, ri) => (
                <div key={ri} className="flex gap-1 justify-center">
                  {row.map((key) => {
                    const status = letterColors[key];
                    const isSpecial = key === 'ENTER' || key === '⌫';
                    return (
                      <button
                        key={key}
                        onClick={() => handleKey(key)}
                        className={`${isSpecial ? 'px-2 text-xs min-w-[44px]' : 'w-9'} h-12 rounded-lg font-bold text-sm transition hover:brightness-110
                          ${status === 'correct' ? 'bg-green-600 text-white' :
                            status === 'present' ? 'bg-yellow-600 text-white' :
                            status === 'absent' ? 'bg-slate-700 text-slate-400' :
                            'bg-slate-600 text-white'}`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
