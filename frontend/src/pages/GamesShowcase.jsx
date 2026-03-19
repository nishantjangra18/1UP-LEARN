import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import GameCard from '../components/GameCard';
import { GAMES } from '../utils/games';

const SUBJECTS = ['All', 'Math', 'English', 'Science', 'Reflex', 'Strategy', 'Logic', 'Brain'];

export default function GamesShowcase() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = GAMES.filter((g) => {
    const matchesSubject = filter === 'All' || g.subject === filter;
    const matchesSearch = g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-game text-5xl text-white mb-2">{t('games.title')} 🎮</h1>
        <p className="text-slate-400">{t('games.subtitle')}</p>
      </motion.div>

      {/* Search */}
      <div className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search games..."
          className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 outline-none border border-slate-700 focus:border-purple-500 transition"
        />
      </div>

      {/* Subject filter tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {SUBJECTS.map((sub) => (
          <button
            key={sub}
            onClick={() => setFilter(sub)}
            className={`px-4 py-2 rounded-full font-bold text-sm transition
              ${filter === sub
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {filtered.map((game, i) => (
          <GameCard key={game.id} game={game} index={i} />
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-3">🔍</div>
          <p>No games found for "{search}"</p>
        </div>
      )}
    </div>
  );
}
