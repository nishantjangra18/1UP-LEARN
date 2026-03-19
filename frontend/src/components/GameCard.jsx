import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export default function GameCard({ game, index = 0 }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  // A game is locked if user doesn't have enough coins
  const isLocked = game.requiredCoins && (!user || user.coins < game.requiredCoins);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.04, y: -4 }}
      className={`relative rounded-2xl overflow-hidden shadow-xl cursor-pointer group
        ${isLocked ? 'opacity-60 grayscale' : ''}`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 ${game.gradient || 'card-gradient-purple'}`} />

      {/* Game emoji / icon */}
      <div className="relative p-5">
        <div className="text-6xl mb-3 filter drop-shadow-lg group-hover:animate-bounce-slow">
          {game.emoji}
        </div>

        <h3 className="font-game text-xl text-white mb-1">{game.title}</h3>
        <p className="text-white/80 text-sm leading-snug">{game.description}</p>

        {/* XP reward badge */}
        <div className="mt-3 flex items-center gap-2">
          <span className="bg-black/30 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded-full">
            ⭐ +{game.xpReward || 20} XP
          </span>
          <span className="bg-black/30 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full">
            🪙 +{game.coinReward || 10}
          </span>
        </div>

        {/* Play button */}
        {!isLocked ? (
          <Link
            to={`/games/${game.id}`}
            className="mt-4 block text-center bg-white/20 hover:bg-white/30 backdrop-blur text-white font-bold py-2 rounded-xl transition"
          >
            {t('games.play')} →
          </Link>
        ) : (
          <div className="mt-4 block text-center bg-black/30 text-white/60 font-bold py-2 rounded-xl">
            🔒 {t('games.unlock_with', { coins: game.requiredCoins })}
          </div>
        )}
      </div>

      {/* Subject tag */}
      {game.subject && (
        <div className="absolute top-3 right-3 bg-black/30 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur">
          {game.subject}
        </div>
      )}
    </motion.div>
  );
}
