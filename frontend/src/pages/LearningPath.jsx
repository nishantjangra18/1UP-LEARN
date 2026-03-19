import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { TRACK_QUESTIONS } from '../data/questions';
import { fetchLevelQuestions, toTrackFormat, fetchTutorExplanation, fetchRival } from '../services/quizService';
import TutorModal from '../components/TutorModal';
import { RivalBanner, RivalResult } from '../components/RivalCard';

// Dynamic pass threshold — always 70% of however many questions are in the level
const passThreshold = (totalQuestions) => Math.ceil(totalQuestions * 0.7);

const TRACKS = [
  {
    id: 'science',
    emoji: '🔬',
    name: 'Science',
    color: 'from-blue-600 to-teal-600',
    borderColor: 'border-blue-500',
    description: 'Explore the natural world through discovery!',
    totalLevels: 5,
  },
  {
    id: 'math',
    emoji: '🧮',
    name: 'Math',
    color: 'from-green-600 to-emerald-600',
    borderColor: 'border-green-500',
    description: 'Master numbers, shapes, and patterns!',
    totalLevels: 5,
  },
  {
    id: 'english',
    emoji: '📚',
    name: 'English',
    color: 'from-purple-600 to-indigo-600',
    borderColor: 'border-purple-500',
    description: 'Build vocabulary, grammar, and reading skills!',
    totalLevels: 5,
  },
  {
    id: 'history',
    emoji: '🏛️',
    name: 'History',
    color: 'from-amber-600 to-orange-600',
    borderColor: 'border-amber-500',
    description: 'Travel through time and great civilizations!',
    totalLevels: 5,
  },
  {
    id: 'current',
    emoji: '📰',
    name: 'Current Events',
    color: 'from-cyan-600 to-blue-600',
    borderColor: 'border-cyan-500',
    description: 'Stay informed about the world with fun trivia!',
    totalLevels: 5,
  },
  {
    id: 'creative',
    emoji: '🎨',
    name: 'Creative Arts',
    color: 'from-pink-600 to-rose-600',
    borderColor: 'border-pink-500',
    description: 'Express yourself through art, stories, and music!',
    totalLevels: 5,
  },
];

/* ──────────────────────────────────────────────────
   LevelQuiz — plays 20 MCQs, no timer
   ────────────────────────────────────────────────── */
function LevelQuiz({ track, levelData, onComplete, onBack }) {
  const { user } = useAuth();

  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);   // array of booleans
  const [selected, setSelected] = useState(null);

  // AI Tutor state
  const [tutorData,    setTutorData]    = useState(null);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [showTutor,    setShowTutor]    = useState(false);

  // AI Rival state — fetched in background while quiz loads
  const [rival, setRival] = useState(null);

  const questions = levelData.questions;
  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const answered = selected !== null;

  const handleAnswer = async (opt) => {
    if (answered) return;
    setSelected(opt);

    const correct = opt === q.a;
    // On wrong answer → silently fetch AI tutor explanation in background
    if (!correct) {
      setTutorLoading(true);
      try {
        const explanation = await fetchTutorExplanation({
          question:      q.q,
          correctAnswer: q.a,
          userAnswer:    opt,
          topic:         `${track.name} — ${levelData.topic}`,
          age:           user?.age || 8,
        });
        setTutorData(explanation);
        setShowTutor(true);
      } catch {
        // Tutor unavailable — no interruption, just continue normally
      } finally {
        setTutorLoading(false);
      }
    }
  };

  const handleNext = () => {
    const correct = selected === q.a;
    const newResults = [...results, correct];

    if (isLast) {
      const score = newResults.filter(Boolean).length;
      onComplete(score, rival);  // pass rival so result screen can show comparison
    } else {
      setResults(newResults);
      setIdx((i) => i + 1);
      setSelected(null);
      setTutorData(null);
    }
  };

  const progress = ((idx + (answered ? 1 : 0)) / questions.length) * 100;
  const correctSoFar = results.filter(Boolean).length;

  // Fetch rival character intro in background when quiz starts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchRival({
      score:    0,
      accuracy: 50,
      gameType: 'mcq',
      topic:    `${track.name} — ${levelData.topic}`,
      maxScore: questions.length,
    })
      .then((d) => setRival(d?.rival || null))
      .catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col gap-5 max-w-xl mx-auto w-full"
    >
      {/* Rival intro banner */}
      {rival && <RivalBanner rival={rival} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-xl">←</button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{track.emoji} {track.name} — Level {levelData.level}: {levelData.topic}</span>
            <span>{correctSoFar} correct</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${track.color}`}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <span className="text-slate-400 text-sm font-bold">{idx + 1}/{questions.length}</span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className={`bg-slate-800 rounded-2xl p-6 border-2 transition ${
            answered
              ? selected === q.a ? 'border-green-500' : 'border-red-500'
              : 'border-slate-600'
          }`}
        >
          <p className="text-white text-lg leading-relaxed font-semibold mb-6">{q.q}</p>

          <div className="grid grid-cols-1 gap-3">
            {q.o.map((opt) => {
              let cls = 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600';
              if (answered) {
                if (opt === q.a) cls = 'bg-green-600 text-white border border-green-500';
                else if (opt === selected) cls = 'bg-red-600 text-white border border-red-500';
                else cls = 'bg-slate-800 text-slate-500 border border-slate-700';
              }
              return (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  disabled={answered}
                  className={`mcq-option text-left px-4 py-3 rounded-xl font-bold transition ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex flex-col gap-2"
            >
              <div className={`text-sm font-bold ${selected === q.a ? 'text-green-400' : 'text-red-400'}`}>
                {selected === q.a ? '✓ Correct!' : `✗ The answer was: ${q.a}`}
              </div>
              {q.explanation && (
                <div className="text-xs text-slate-300 bg-slate-700/50 rounded-lg px-3 py-2">
                  💡 {q.explanation}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tutor loading indicator — shown while AI prepares explanation */}
      {tutorLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-purple-400 text-sm bg-purple-900/20 rounded-xl px-4 py-2 border border-purple-800/40"
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            🤖
          </motion.span>
          AI Tutor is preparing an explanation…
        </motion.div>
      )}

      {/* Next button — show after tutor is closed (or immediately on correct answer) */}
      {answered && !showTutor && !tutorLoading && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleNext}
          className={`w-full py-3 rounded-2xl font-game text-lg text-white transition bg-gradient-to-r ${track.color} hover:brightness-110`}
        >
          {isLast ? 'See Results 🏁' : 'Next Question →'}
        </motion.button>
      )}

      {/* AI Tutor modal — shows after wrong answer */}
      {showTutor && tutorData && (
        <TutorModal
          tutorData={tutorData}
          trackColor={track.color}
          onClose={() => setShowTutor(false)}
        />
      )}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────
   QuizResult — shows pass/fail, score
   ────────────────────────────────────────────────── */
function QuizResult({ track, levelData, score, passed, rival, onContinue, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center flex flex-col items-center gap-5 max-w-sm mx-auto py-4"
    >
      <div className="text-7xl">{passed ? '🏆' : '💪'}</div>
      <h2 className="font-game text-3xl text-white">
        {passed ? 'Level Complete!' : 'Almost There!'}
      </h2>
      <div className={`font-game text-5xl ${passed ? 'text-green-400' : 'text-orange-400'}`}>
        {score} / {levelData.questions.length}
      </div>
      <p className="text-slate-400 text-sm">
        {passed
          ? `Great job on "${levelData.topic}"! Next level unlocked.`
          : `You need ${passThreshold(levelData.questions.length)}+ to pass. Keep trying!`}
      </p>

      {/* Your score bar */}
      <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${passed ? 'bg-green-500' : 'bg-orange-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${(score / levelData.questions.length) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-slate-500">Pass threshold: {passThreshold(levelData.questions.length)}/{levelData.questions.length} (70%)</p>

      {/* AI Rival comparison */}
      {rival && (
        <div className="w-full">
          <RivalResult
            rival={rival}
            userScore={score}
            maxScore={levelData.questions.length}
            trackColor={track.color}
          />
        </div>
      )}

      <div className="flex gap-3 w-full">
        {!passed && (
          <button
            onClick={onRetry}
            className="flex-1 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition"
          >
            🔄 Try Again
          </button>
        )}
        <button
          onClick={onContinue}
          className={`flex-1 py-3 rounded-2xl font-game text-white transition bg-gradient-to-r ${track.color} hover:brightness-110`}
        >
          {passed ? 'Continue →' : 'Back to Levels'}
        </button>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────
   Main LearningPath page
   ────────────────────────────────────────────────── */
export default function LearningPath() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();

  const [activeTrack,    setActiveTrack]    = useState(null);  // track object
  const [activeLevel,    setActiveLevel]    = useState(null);  // level data { level, topic, questions }
  const [quizScore,      setQuizScore]      = useState(null);  // null while playing
  const [quizRival,      setQuizRival]      = useState(null);  // rival from last quiz
  const [saving,         setSaving]         = useState(false);
  const [loadingLevel,   setLoadingLevel]   = useState(false); // true while fetching AI questions
  const [usingFallback,  setUsingFallback]  = useState(false); // true if AI failed

  // Adaptive difficulty: track score fraction from the last completed quiz
  const [lastScore,      setLastScore]      = useState(null);

  // Repeat prevention: store question texts per track to pass back to AI
  const [shownByTrack,   setShownByTrack]   = useState({});    // { trackId: [questionTexts] }

  // Pre-fetch cache: questions fetched in background while user browses level list
  // key: "<trackId>-<levelIndex>", value: Promise<levelData>
  const prefetchCache = useRef({});

  /* Get how many levels a user has completed in a track */
  const getLevelsCompleted = (trackId) =>
    user?.trackProgress?.find((p) => p.trackId === trackId)?.levelsCompleted || 0;

  /* Pre-fetch questions for a level silently in the background */
  const prefetchLevel = (track, levelIndex) => {
    const key = `${track.id}-${levelIndex}`;
    if (prefetchCache.current[key]) return; // already fetching or fetched

    const staticLevelData = TRACK_QUESTIONS[track.id]?.[levelIndex];
    if (!staticLevelData) return;

    prefetchCache.current[key] = fetchLevelQuestions(
      track.id,
      staticLevelData.topic,
      staticLevelData.level,
      user?.age || 8,
      shownByTrack[track.id] || [],
      lastScore
    ).catch(() => null); // swallow errors — startLevel handles fallback
  };

  /* Start a level quiz — uses pre-fetched result if available, else fetches now */
  const startLevel = async (track, levelIndex) => {
    const staticLevelData = TRACK_QUESTIONS[track.id]?.[levelIndex];
    if (!staticLevelData) return;

    setActiveTrack(track);
    setQuizScore(null);
    setUsingFallback(false);

    // Use pre-fetched promise if it exists, otherwise fetch now
    const prefetchKey = `${track.id}-${levelIndex}`;
    const existingPromise = prefetchCache.current[prefetchKey];

    // Only show loading spinner if we don't already have a result waiting
    if (!existingPromise) setLoadingLevel(true);

    try {
      const avoidQuestions = shownByTrack[track.id] || [];
      const fetchPromise = existingPromise || fetchLevelQuestions(
        track.id,
        staticLevelData.topic,
        staticLevelData.level,
        user?.age || 8,
        avoidQuestions,
        lastScore
      );
      const res = await fetchPromise;
      // Clear the pre-fetch slot so next visit generates fresh questions
      delete prefetchCache.current[prefetchKey];
      setLoadingLevel(false);

      if (res?.questions?.length >= 5) {
        // Convert AI format → LevelQuiz format and build a level data object
        const aiLevelData = {
          ...staticLevelData,
          questions: res.questions.map(toTrackFormat),
        };

        // Remember these question texts for repeat prevention
        const texts = res.questions.map((q) => q.question);
        setShownByTrack((prev) => ({
          ...prev,
          [track.id]: [...(prev[track.id] || []), ...texts].slice(-60),
        }));

        setActiveLevel(aiLevelData);
      } else {
        // AI returned too few questions — use static
        throw new Error('Insufficient AI questions');
      }
    } catch {
      // Graceful fallback to static question bank
      setUsingFallback(true);
      setActiveLevel(staticLevelData);
    } finally {
      setLoadingLevel(false);
    }
  };

  /* Quiz finished */
  const handleQuizComplete = async (score, rival = null) => {
    setQuizScore(score);
    setQuizRival(rival);

    // Store score fraction for adaptive difficulty on the next quiz
    const scoreFraction = score / (activeLevel?.questions?.length || 20);
    setLastScore(scoreFraction);

    const passed = score >= passThreshold(activeLevel?.questions?.length || 20);

    if (passed && user) {
      const current = getLevelsCompleted(activeTrack.id);
      const levelNum = activeLevel.level; // 1-indexed
      if (levelNum > current) {
        setSaving(true);
        try {
          const res = await axios.post('/api/progress/track-progress', {
            trackId: activeTrack.id,
            trackName: activeTrack.name,
            levelsCompleted: levelNum,
            totalLevels: activeTrack.totalLevels,
          });
          // Update local user context with new trackProgress
          if (user && res.data?.trackProgress) {
            updateUser({ trackProgress: res.data.trackProgress });
          }
        } catch {/* silent */} finally {
          setSaving(false);
        }
      }
    }
  };

  /* Back from quiz to level selection */
  const backToLevels = () => {
    setActiveLevel(null);
    setQuizScore(null);
    setQuizRival(null);
  };

  /* Back from track to track list */
  const backToTracks = () => {
    setActiveTrack(null);
    setActiveLevel(null);
    setQuizScore(null);
    setQuizRival(null);
  };

  /* ─── Loading view (AI fetching questions) ─── */
  if (loadingLevel) {
    return (
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 flex flex-col items-center justify-center gap-4 min-h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-5xl"
        >
          🤖
        </motion.div>
        <p className="text-slate-300 font-game text-lg animate-pulse">
          AI is creating your questions…
        </p>
        <p className="text-slate-500 text-sm">Generating fresh content just for you ✨</p>
      </div>
    );
  }

  /* ─── Quiz view ─── */
  if (activeLevel && quizScore === null) {
    return (
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {usingFallback && (
          <div className="mb-3 text-xs text-amber-400 bg-amber-900/20 border border-amber-800 rounded-xl px-3 py-2 text-center">
            ⚡ Using offline questions — AI is temporarily unavailable
          </div>
        )}
        <LevelQuiz
          track={activeTrack}
          levelData={activeLevel}
          onComplete={handleQuizComplete}
          onBack={backToLevels}
        />
      </div>
    );
  }

  /* ─── Result view ─── */
  if (activeLevel && quizScore !== null) {
    return (
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {saving ? (
          <div className="text-center text-slate-400 py-10">Saving progress...</div>
        ) : (
          <QuizResult
            track={activeTrack}
            levelData={activeLevel}
            score={quizScore}
            passed={quizScore >= passThreshold(activeLevel?.questions?.length || 20)}
            rival={quizRival}
            onContinue={backToLevels}
            onRetry={() => setQuizScore(null)}
          />
        )}
      </div>
    );
  }

  /* ─── Level selection view ─── */
  if (activeTrack) {
    const levelsCompleted = getLevelsCompleted(activeTrack.id);
    const trackData = TRACK_QUESTIONS[activeTrack.id] || [];

    return (
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={backToTracks} className="text-slate-400 hover:text-white text-sm font-bold mb-4 flex items-center gap-2 transition">
            ← All Tracks
          </button>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{activeTrack.emoji}</span>
            <div>
              <h1 className="font-game text-3xl text-white">{activeTrack.name}</h1>
              <p className="text-slate-400 text-sm">{activeTrack.description}</p>
            </div>
          </div>
          <div className="mt-4 bg-slate-800 rounded-full h-3 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${activeTrack.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${(levelsCompleted / activeTrack.totalLevels) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">{levelsCompleted} / {activeTrack.totalLevels} levels complete</p>
        </motion.div>

        {/* Level nodes */}
        <div className="relative">
          <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-slate-700/60" />
          {trackData.map((levelData, i) => {
            const levelNum = levelData.level;
            const isCompleted = levelsCompleted >= levelNum;
            const isUnlocked = levelsCompleted >= levelNum - 1;
            const isNext = levelsCompleted === levelNum - 1;

            return (
              <motion.div
                key={levelNum}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 mb-5 relative"
              >
                {/* Node circle */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-game shadow-lg flex-shrink-0 z-10 transition
                    ${isCompleted
                      ? 'bg-green-600 text-white'
                      : isUnlocked
                        ? `bg-gradient-to-br ${activeTrack.color} text-white`
                        : 'bg-slate-700 text-slate-500 grayscale'
                    }`}
                >
                  {isCompleted ? '✓' : isUnlocked ? levelNum : '🔒'}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className={`font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                    Level {levelNum}: {levelData.topic}
                  </div>
                  <div className="text-slate-500 text-xs">AI-generated questions • Pass 70% to unlock next</div>
                  {isNext && (
                    <div className="text-xs text-yellow-400 font-bold mt-0.5">← Up next!</div>
                  )}
                </div>

                {/* Action button */}
                {isUnlocked && (
                  <button
                    onClick={() => startLevel(activeTrack, i)}
                    className={`font-bold px-4 py-2 rounded-xl text-xs transition text-white
                      ${isCompleted
                        ? 'bg-slate-700 hover:bg-slate-600'
                        : `bg-gradient-to-r ${activeTrack.color} hover:brightness-110`
                      }`}
                  >
                    {isCompleted ? 'Replay' : t('learn.start')}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ─── Track grid ─── */
  return (
    <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <h1 className="font-game text-5xl text-white mb-2">{t('learn.paths_title')} 🗺️</h1>
        <p className="text-slate-400">{t('learn.paths_subtitle')}</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {TRACKS.map((track, i) => {
          const done = getLevelsCompleted(track.id);
          const total = track.totalLevels;
          const pct = Math.round((done / total) * 100);

          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => {
                setActiveTrack(track);
                // Pre-fetch the next unlocked level immediately in the background
                // so by the time the user clicks Start, questions are likely ready
                const levelsCompleted = getLevelsCompleted(track.id);
                const nextIndex = levelsCompleted; // 0-based index of next level
                if (nextIndex < track.totalLevels) prefetchLevel(track, nextIndex);
              }}
              className={`cursor-pointer bg-gradient-to-br ${track.color} rounded-3xl p-6 shadow-xl relative overflow-hidden`}
            >
              <div className="absolute -bottom-4 -right-4 text-8xl opacity-20">{track.emoji}</div>

              <div className="text-4xl mb-3">{track.emoji}</div>
              <h3 className="font-game text-2xl text-white mb-1">{track.name}</h3>
              <p className="text-white/70 text-sm mb-4">{track.description}</p>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>{done}/{total} levels</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-2.5">
                  <motion.div
                    className="h-full bg-white/80 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {done >= total && (
                <div className="mt-2 bg-black/20 rounded-full px-3 py-1 text-xs text-white font-bold inline-block">
                  ✓ Completed!
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
