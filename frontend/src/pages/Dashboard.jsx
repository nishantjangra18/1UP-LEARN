import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import XPBar from '../components/XPBar';
import BadgeDisplay from '../components/BadgeDisplay';
import WordleModal from '../components/WordleModal';

// Quick access games
const QUICK_GAMES = [
  { id: 'memory-match', emoji: '🃏', title: 'Memory Match', gradient: 'card-gradient-purple' },
  { id: 'whack-a-mole', emoji: '🔨', title: 'Whack-a-Mole', gradient: 'card-gradient-orange' },
  { id: 'connect4', emoji: '🔴', title: 'Connect 4', gradient: 'card-gradient-blue' },
  { id: 'quiz', emoji: '❓', title: 'Jeopardy Quiz', gradient: 'card-gradient-green' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showWordle, setShowWordle] = useState(false);

  if (!user) return null;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
      {/* Header greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user.name}`}
            alt={user.name}
            className="w-16 h-16 rounded-2xl border-2 border-purple-500 shadow-lg"
          />
          <div>
            <h1 className="font-game text-3xl text-white">
              {greeting()}, {user.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-slate-400 text-sm">Ready for today's adventure?</p>
          </div>
        </div>

        {/* XP Bar */}
        <div className="bg-slate-800/80 rounded-2xl p-4">
          <XPBar xp={user.xp} level={user.level} />
          <div className="flex gap-4 mt-3 text-sm">
            <span className="text-amber-400 font-bold">🪙 {user.coins} Coins</span>
            <span className="text-purple-400 font-bold">🏅 {user.badges?.length || 0} Badges</span>
            <span className="text-teal-400 font-bold">🔥 {user.wordleStreak || 0} Day Streak</span>
          </div>
        </div>
      </motion.div>

      {/* Daily Challenge Banner */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-purple-500/30 rounded-2xl p-5 flex items-center justify-between"
      >
        <div>
          <div className="font-game text-lg text-yellow-400">🎯 Daily Challenge</div>
          <div className="text-slate-300 text-sm">Complete Today's Word & earn bonus XP!</div>
        </div>
        <button
          onClick={() => setShowWordle(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition"
        >
          Play Wordle
        </button>
      </motion.div>

      {/* Quick Play Games */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-game text-2xl text-white">⚡ Quick Play</h2>
          <Link to="/games" className="text-purple-400 hover:text-purple-300 text-sm font-bold transition">
            All Games →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_GAMES.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              whileHover={{ scale: 1.05 }}
            >
              <Link
                to={`/games/${g.id}`}
                className={`${g.gradient} rounded-2xl p-4 flex flex-col items-center text-center text-white shadow-lg block hover:brightness-110 transition`}
              >
                <span className="text-4xl mb-2">{g.emoji}</span>
                <span className="font-game text-sm">{g.title}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Learning Paths Teaser */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-game text-2xl text-white">🗺️ Learning Paths</h2>
          <Link to="/learn" className="text-teal-400 hover:text-teal-300 text-sm font-bold transition">
            Explore →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { id: 'science', emoji: '🔬', color: 'from-blue-600 to-teal-600', label: t('learn.science') },
            { id: 'math', emoji: '🧮', color: 'from-green-600 to-emerald-600', label: t('learn.math') },
            { id: 'english', emoji: '📚', color: 'from-purple-600 to-indigo-600', label: t('learn.english') },
            { id: 'history', emoji: '🏛️', color: 'from-amber-600 to-orange-600', label: t('learn.history') },
            { id: 'creative', emoji: '🎨', color: 'from-pink-600 to-rose-600', label: t('learn.creative') },
            { id: 'current', emoji: '📰', color: 'from-cyan-600 to-blue-600', label: t('learn.current_events') },
          ].map((track, i) => {
            const progress = user.trackProgress?.find((t) => t.trackId === track.id);
            const pct = progress ? Math.round((progress.levelsCompleted / (progress.totalLevels || 10)) * 100) : 0;
            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <Link
                  to="/learn"
                  className={`bg-gradient-to-br ${track.color} rounded-2xl p-4 block hover:brightness-110 transition`}
                >
                  <div className="text-3xl mb-2">{track.emoji}</div>
                  <div className="font-game text-sm text-white mb-2">{track.label}</div>
                  <div className="w-full bg-black/30 rounded-full h-1.5">
                    <div className="bg-white/80 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-white/70 mt-1">{pct}%</div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Recent Badges */}
      {user.badges?.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-game text-2xl text-white">🏅 Recent Badges</h2>
            <Link to="/profile" className="text-yellow-400 hover:text-yellow-300 text-sm font-bold transition">
              View All →
            </Link>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-4">
            <BadgeDisplay badges={user.badges.slice(-8)} max={8} />
          </div>
        </motion.section>
      )}

      {showWordle && <WordleModal onClose={() => setShowWordle(false)} />}
    </div>
  );
}
