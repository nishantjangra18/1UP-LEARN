import { motion } from 'framer-motion';

export default function BadgeDisplay({ badges = [], max = 20 }) {
  const displayBadges = badges.slice(0, max);
  const empty = Array(Math.max(0, 4 - displayBadges.length)).fill(null);

  return (
    <div className="flex flex-wrap gap-3">
      {displayBadges.map((badge, i) => (
        <motion.div
          key={badge.id}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
          className="group relative"
          title={badge.name}
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg cursor-pointer hover:scale-110 transition">
            {badge.icon}
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
            <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl border border-slate-600">
              <div className="font-bold text-yellow-400">{badge.name}</div>
              <div className="text-slate-300">{badge.description}</div>
            </div>
          </div>
        </motion.div>
      ))}
      {/* Empty badge slots */}
      {empty.map((_, i) => (
        <div
          key={`empty-${i}`}
          className="w-14 h-14 rounded-2xl bg-slate-700/50 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-xl"
        >
          ?
        </div>
      ))}
    </div>
  );
}
