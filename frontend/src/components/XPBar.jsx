import { motion } from 'framer-motion';

// XP needed to reach each level = level * 100
export default function XPBar({ xp, level, compact = false }) {
  const xpForCurrentLevel = (level - 1) * 100;
  const xpForNextLevel = level * 100;
  const progress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-yellow-400">Lv.{level}</span>
        <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs text-slate-400">{xp}/{xpForNextLevel}</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm font-bold mb-1">
        <span className="text-yellow-400">⭐ Level {level}</span>
        <span className="text-slate-400">{xp} / {xpForNextLevel} XP</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          {/* Shining effect */}
          <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse-fast" />
        </motion.div>
      </div>
    </div>
  );
}
