/**
 * RivalCard — shows the AI rival's character, score, and result comparison.
 *
 * Two display modes:
 *   mode="banner"  → compact top banner shown during the game
 *   mode="result"  → full result card shown on the quiz result screen
 */

import { motion } from 'framer-motion';

// Maps personality → colour palette
const PERSONALITY_STYLES = {
  cocky:     { bg: 'from-red-600 to-orange-600',    badge: 'bg-red-500' },
  nerdy:     { bg: 'from-blue-600 to-indigo-600',   badge: 'bg-blue-500' },
  sporty:    { bg: 'from-green-600 to-teal-600',    badge: 'bg-green-500' },
  mysterious:{ bg: 'from-purple-700 to-slate-700',  badge: 'bg-purple-500' },
  bubbly:    { bg: 'from-pink-500 to-rose-500',     badge: 'bg-pink-500' },
  wise:      { bg: 'from-amber-600 to-yellow-500',  badge: 'bg-amber-500' },
  cheeky:    { bg: 'from-cyan-500 to-blue-500',     badge: 'bg-cyan-500' },
};

function getStyle(personality = 'bubbly') {
  return PERSONALITY_STYLES[personality.toLowerCase()] || PERSONALITY_STYLES.bubbly;
}

/* ── Banner (during game) ──────────────────────────────────────────────────── */
export function RivalBanner({ rival }) {
  if (!rival) return null;
  const style = getStyle(rival.personality);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 bg-gradient-to-r ${style.bg} rounded-2xl px-4 py-2.5 shadow-lg`}
    >
      <span className="text-2xl">{rival.emoji || '🤖'}</span>
      <div className="flex-1 min-w-0">
        <div className="font-game text-white text-sm truncate">{rival.name}</div>
        <div className="text-white/70 text-xs truncate">{rival.message}</div>
      </div>
      <div className={`${style.badge} text-white font-game text-sm px-2 py-1 rounded-lg whitespace-nowrap`}>
        Score: {rival.score}
      </div>
    </motion.div>
  );
}

/* ── Full result card ──────────────────────────────────────────────────────── */
export function RivalResult({ rival, userScore, maxScore, trackColor }) {
  if (!rival) return null;

  const style         = getStyle(rival.personality);
  const userWon       = userScore > rival.score;
  const tied          = userScore === rival.score;
  const userPct       = Math.round((userScore / maxScore) * 100);
  const rivalPct      = Math.round((rival.score / maxScore) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="w-full rounded-2xl overflow-hidden border border-slate-700 shadow-xl"
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${style.bg} px-4 py-3 flex items-center gap-2`}>
        <span className="text-2xl">{rival.emoji || '🤖'}</span>
        <div>
          <div className="font-game text-white text-base">{rival.name}</div>
          <div className="text-white/70 text-xs capitalize">{rival.personality} rival</div>
        </div>
        <div className="ml-auto">
          {userWon ? (
            <span className="bg-green-500 text-white font-game text-xs px-3 py-1 rounded-full">
              You Won! 🏆
            </span>
          ) : tied ? (
            <span className="bg-yellow-500 text-white font-game text-xs px-3 py-1 rounded-full">
              Tie! 🤝
            </span>
          ) : (
            <span className="bg-red-500 text-white font-game text-xs px-3 py-1 rounded-full">
              Rival Wins 😤
            </span>
          )}
        </div>
      </div>

      {/* Score comparison bars */}
      <div className="bg-slate-800 px-4 py-4 flex flex-col gap-3">
        {/* User bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold text-white">⭐ You</span>
            <span>{userScore} / {maxScore}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${trackColor || 'from-blue-500 to-cyan-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${userPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Rival bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{rival.emoji} {rival.name}</span>
            <span>{rival.score} / {maxScore}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${style.bg}`}
              initial={{ width: 0 }}
              animate={{ width: `${rivalPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
            />
          </div>
        </div>

        {/* Rival's trash-talk / motivational message */}
        <p className="text-slate-300 text-sm text-center italic mt-1">
          "{rival.message}"
        </p>
      </div>
    </motion.div>
  );
}
