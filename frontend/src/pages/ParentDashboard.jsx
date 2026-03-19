import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import BadgeDisplay from '../components/BadgeDisplay';
import XPBar from '../components/XPBar';

export default function ParentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [activeChild, setActiveChild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/progress/children').then((res) => {
      setChildren(res.data);
      if (res.data.length > 0) setActiveChild(res.data[0]);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-slate-400 font-game text-2xl animate-pulse">{t('common.loading')}</div>;
  }

  if (children.length === 0) {
    return (
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-6">👨‍👧</div>
        <h2 className="font-game text-3xl text-white mb-4">{t('parent.dashboard')}</h2>
        <p className="text-slate-400 mb-6">{t('parent.no_children')}</p>
        <div className="bg-slate-800 rounded-2xl p-6 inline-block">
          <p className="text-slate-400 text-sm mb-2">Your link code:</p>
          <div className="font-game text-3xl text-purple-400 tracking-widest">{user?.childCode}</div>
        </div>
      </div>
    );
  }

  // Prepare chart data for active child
  const gameChartData = activeChild?.gameHistory?.slice(-7).map((g) => ({
    name: g.gameName?.substring(0, 8),
    xp: g.xpEarned,
    coins: g.coinsEarned,
  })) || [];

  const trackData = activeChild?.trackProgress?.map((tp) => ({
    subject: tp.trackName,
    progress: Math.round((tp.levelsCompleted / (tp.totalLevels || 10)) * 100),
  })) || [];

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-game text-4xl text-white">{t('parent.dashboard')} 👨‍👧</h1>
        <p className="text-slate-400">Monitor your child's learning journey</p>
      </motion.div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-3 mb-6">
          {children.map((child) => (
            <button
              key={child._id}
              onClick={() => setActiveChild(child)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold transition
                ${activeChild?._id === child._id ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <img
                src={child.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${child.name}`}
                className="w-6 h-6 rounded-full"
              />
              {child.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {activeChild && (
        <div className="space-y-6">
          {/* Child Overview Card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-800/70 rounded-3xl p-6 border border-slate-700"
          >
            <div className="flex items-start gap-4 mb-4">
              <img
                src={activeChild.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${activeChild.name}`}
                className="w-16 h-16 rounded-2xl"
              />
              <div className="flex-1">
                <h2 className="font-game text-2xl text-white">{activeChild.name}</h2>
                <div className="flex flex-wrap gap-3 mt-1 text-sm">
                  <span className="text-yellow-400 font-bold">⭐ {activeChild.xp} XP</span>
                  <span className="text-purple-400 font-bold">🎮 Level {activeChild.level}</span>
                  <span className="text-amber-400 font-bold">🪙 {activeChild.coins} Coins</span>
                  <span className="text-orange-400 font-bold">🔥 {activeChild.wordleStreak || 0} Day Streak</span>
                </div>
              </div>
            </div>
            <XPBar xp={activeChild.xp} level={activeChild.level} />
          </motion.div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* XP Progress Chart */}
            <div className="bg-slate-800/70 rounded-3xl p-5 border border-slate-700">
              <h3 className="font-game text-lg text-white mb-4">📊 Recent Game XP</h3>
              {gameChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={gameChartData}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                    <Bar dataKey="xp" fill="#7c3aed" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500">
                  No game data yet
                </div>
              )}
            </div>

            {/* Track Radar Chart */}
            <div className="bg-slate-800/70 rounded-3xl p-5 border border-slate-700">
              <h3 className="font-game text-lg text-white mb-4">🗺️ Learning Track Progress</h3>
              {trackData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={trackData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Radar name="Progress" dataKey="progress" fill="#7c3aed" fillOpacity={0.4} stroke="#7c3aed" />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500">
                  No track progress yet
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="bg-slate-800/70 rounded-3xl p-5 border border-slate-700">
            <h3 className="font-game text-lg text-white mb-4">
              🏅 {t('parent.achievements')} ({activeChild.badges?.length || 0})
            </h3>
            <BadgeDisplay badges={activeChild.badges || []} max={10} />
          </div>

          {/* Recent Games Timeline */}
          <div className="bg-slate-800/70 rounded-3xl p-5 border border-slate-700">
            <h3 className="font-game text-lg text-white mb-4">🎮 {t('parent.recent_games')}</h3>
            {activeChild.gameHistory?.length > 0 ? (
              <div className="space-y-3">
                {[...activeChild.gameHistory].reverse().slice(0, 8).map((g, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 bg-slate-700/40 rounded-xl p-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-white text-sm font-bold">{g.gameName}</div>
                      <div className="text-slate-500 text-xs">{new Date(g.completedAt).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                      <div className="text-yellow-400 font-bold">+{g.xpEarned} XP</div>
                      {g.feedbackRating && <div className="text-amber-400">{'★'.repeat(g.feedbackRating)}</div>}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">No games played yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
