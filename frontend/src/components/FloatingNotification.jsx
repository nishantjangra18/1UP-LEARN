import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';

const COLORS = {
  xp: 'from-yellow-500 to-amber-500',
  reward: 'from-purple-500 to-pink-500',
  badge: 'from-blue-500 to-cyan-500',
  egg: 'from-green-500 to-teal-500',
};

export default function FloatingNotification() {
  const { notification } = useGame();

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={notification.message}
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.8 }}
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r ${COLORS[notification.type] || COLORS.reward}
            text-white font-game text-lg px-6 py-3 rounded-full shadow-2xl pointer-events-none`}
        >
          {notification.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
