import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = ['from-yellow-600 to-amber-500', 'from-slate-500 to-slate-400', 'from-amber-700 to-orange-600'];

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/progress/leaderboard').then((res) => {
      setLeaders(res.data);
      setLoading(false);
    });
  }, []);

  const userRank = leaders.findIndex((l) => l._id === user?._id) + 1;

  return (
    <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="text-7xl mb-3">🏆</div>
        <h1 className="font-game text-5xl text-white">Leaderboard</h1>
        <p className="text-slate-400">Top learners this month</p>
      </motion.div>

      {/* Your rank */}
      {userRank > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-purple-900/40 border border-purple-500/30 rounded-2xl px-4 py-3 mb-6 flex items-center gap-3"
        >
          <span className="text-slate-400 font-bold">Your Rank:</span>
          <span className="font-game text-2xl text-yellow-400">#{userRank}</span>
          <span className="text-slate-300">{user?.name}</span>
          <span className="ml-auto text-yellow-400 font-bold">⭐ {user?.xp} XP</span>
        </motion.div>
      )}

      {/* Leaderboard List */}
      {loading ? (
        <div className="text-center py-10 text-slate-400 animate-pulse">Loading...</div>
      ) : (
        <div className="space-y-3">
          {leaders.map((leader, i) => {
            const isMe = leader._id === user?._id;
            const medal = MEDALS[i];
            const rankColor = RANK_COLORS[i];

            return (
              <motion.div
                key={leader._id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-4 rounded-2xl p-4 border transition
                  ${isMe ? 'bg-purple-900/50 border-purple-500/50' : 'bg-slate-800/60 border-slate-700/50'}`}
              >
                {/* Rank */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-game text-lg
                  ${medal ? `bg-gradient-to-br ${rankColor} text-white` : 'bg-slate-700 text-slate-400'}`}
                >
                  {medal || `#${i + 1}`}
                </div>

                {/* Avatar */}
                <img
                  src={leader.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${leader.name}`}
                  className="w-10 h-10 rounded-xl"
                />

                {/* Name + Level */}
                <div className="flex-1">
                  <div className={`font-bold ${isMe ? 'text-purple-300' : 'text-white'}`}>
                    {leader.name} {isMe && '(You)'}
                  </div>
                  <div className="text-slate-400 text-xs">Level {leader.level} · {leader.badges?.length || 0} badges</div>
                </div>

                {/* XP */}
                <div className="text-right">
                  <div className="font-game text-yellow-400">⭐ {leader.xp.toLocaleString()}</div>
                  <div className="text-slate-500 text-xs">XP</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
