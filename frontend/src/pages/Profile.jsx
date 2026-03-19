import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import XPBar from '../components/XPBar';
import BadgeDisplay from '../components/BadgeDisplay';
import axios from 'axios';

const AVATAR_COLORS = ['#7c3aed', '#ec4899', '#f97316', '#22c55e', '#3b82f6', '#14b8a6', '#eab308'];
const AVATAR_ACCESSORIES = ['none', 'hat', 'crown', 'glasses', 'bow'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState('stats');
  const [linkCode, setLinkCode] = useState('');
  const [linkMsg, setLinkMsg] = useState('');
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileInputRef = useRef(null);

  if (!user) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadErr('Please select an image file.');
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setUploadErr('Image must be smaller than 1.5 MB.');
      return;
    }
    setUploadErr('');
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      const res = await axios.put('/api/auth/avatar', { avatar: preview });
      updateUser({ avatar: res.data.avatar });
      setPreview(null);
    } catch (err) {
      setUploadErr(err.response?.data?.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const stats = [
    { label: 'Total XP', value: user.xp, icon: '⭐', color: 'text-yellow-400' },
    { label: 'Level', value: user.level, icon: '🎮', color: 'text-purple-400' },
    { label: 'Coins', value: user.coins, icon: '🪙', color: 'text-amber-400' },
    { label: 'Badges', value: user.badges?.length || 0, icon: '🏅', color: 'text-blue-400' },
    { label: 'Games Played', value: user.gameHistory?.length || 0, icon: '🎯', color: 'text-green-400' },
    { label: 'Wordle Streak', value: user.wordleStreak || 0, icon: '🔥', color: 'text-orange-400' },
  ];

  const handleLinkParent = async () => {
    if (!linkCode || linkCode.length !== 6) {
      setLinkMsg('❌ Please enter a valid 6-character code.');
      return;
    }
    try {
      const res = await axios.post('/api/auth/link-child', { childCode: linkCode });
      setLinkMsg(`✅ Linked to ${res.data.child?.name || 'child'} successfully!`);
      setLinkCode('');
    } catch (err) {
      setLinkMsg(`❌ ${err.response?.data?.message || 'Invalid code. Try again.'}`);
    }
  };

  const copyChildCode = () => {
    navigator.clipboard.writeText(user.childCode || '');
    setLinkMsg('✅ Code copied!');
  };

  return (
    <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/70 rounded-3xl p-6 mb-6 border border-slate-700"
      >
        <div className="flex items-center gap-5 mb-4">
          <div className="relative group">
            <img
              src={preview || user.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user.name}`}
              alt={user.name}
              className="w-20 h-20 rounded-2xl border-4 shadow-xl object-cover"
              style={{ borderColor: user.avatarConfig?.color || '#7c3aed' }}
            />
            {/* Upload overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold"
            >
              📷 Change
            </button>
            <div className="absolute -bottom-1 -right-1 text-xl">{user.role === 'parent' ? '👨‍👧' : '🧒'}</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          <div>
            <h1 className="font-game text-3xl text-white">{user.name}</h1>
            <div className="text-slate-400 text-sm">{user.email}</div>
            <div className="mt-1 inline-block bg-purple-600/30 text-purple-400 text-xs font-bold px-3 py-0.5 rounded-full">
              {user.role === 'parent' ? '👨‍👧 Parent' : '🧒 Learner'}
            </div>
          </div>
        </div>
        <XPBar xp={user.xp} level={user.level} />

        {/* Avatar preview actions */}
        {preview && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="text-slate-400 text-sm">New avatar selected</span>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-xl text-sm transition"
            >
              {uploading ? 'Saving…' : '✓ Save Avatar'}
            </button>
            <button
              onClick={() => { setPreview(null); setUploadErr(''); }}
              disabled={uploading}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-1.5 rounded-xl text-sm transition"
            >
              Cancel
            </button>
          </div>
        )}
        {uploadErr && <p className="text-red-400 text-sm mt-2">{uploadErr}</p>}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['stats', 'badges', 'history', 'account'].map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition capitalize
              ${tab === t_ ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {t_}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-slate-800 rounded-2xl p-4 text-center"
              >
                <div className="text-3xl mb-1">{s.icon}</div>
                <div className={`font-game text-2xl ${s.color}`}>{s.value}</div>
                <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Track Progress */}
          {user.trackProgress?.length > 0 && (
            <div className="mt-6 bg-slate-800 rounded-2xl p-5">
              <h3 className="font-game text-lg text-white mb-4">Learning Progress</h3>
              {user.trackProgress.map((tp) => {
                const pct = Math.round((tp.levelsCompleted / (tp.totalLevels || 10)) * 100);
                return (
                  <div key={tp.trackId} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white font-bold">{tp.trackName}</span>
                      <span className="text-slate-400">{tp.levelsCompleted}/{tp.totalLevels}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Badges Tab */}
      {tab === 'badges' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 rounded-2xl p-5">
          <h3 className="font-game text-lg text-white mb-4">
            🏅 Badges ({user.badges?.length || 0})
          </h3>
          {user.badges?.length > 0 ? (
            <BadgeDisplay badges={user.badges} max={20} />
          ) : (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">🏅</div>
              <p>Play games to earn your first badge!</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Game History Tab */}
      {tab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 rounded-2xl p-5">
          <h3 className="font-game text-lg text-white mb-4">🎮 Recent Games</h3>
          {user.gameHistory?.length > 0 ? (
            <div className="flex flex-col gap-3">
              {[...user.gameHistory].reverse().slice(0, 10).map((g, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-700/50 rounded-xl p-3">
                  <div className="text-2xl">🎮</div>
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm">{g.gameName}</div>
                    <div className="text-slate-400 text-xs">{new Date(g.completedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-yellow-400 font-bold">+{g.xpEarned} XP</div>
                    <div className="text-amber-400">+{g.coinsEarned} 🪙</div>
                  </div>
                  {g.feedbackRating && (
                    <div className="text-yellow-400">{'★'.repeat(g.feedbackRating)}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">🎮</div>
              <p>No games played yet. Go have fun!</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Account Tab */}
      {tab === 'account' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 rounded-2xl p-5">
          <h3 className="font-game text-lg text-white mb-4">Account Settings</h3>

          {/* Parent linking */}
          {user.role === 'child' && (
            <div className="mb-6">
              <label className="text-slate-400 text-sm font-bold">Your Linking Code</label>
              <div className="flex gap-2 mt-2">
                <div className="flex-1 bg-slate-700 rounded-xl px-4 py-3 font-game text-xl text-purple-400 tracking-widest">
                  {user.childCode || 'Loading...'}
                </div>
                <button
                  onClick={copyChildCode}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 rounded-xl transition"
                >
                  📋 Copy
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-1">Share this with your parent to link accounts</p>
            </div>
          )}

          {user.role === 'parent' && (
            <div className="mb-6">
              <label className="text-slate-400 text-sm font-bold block mb-2">Link a Child Account</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                  placeholder="Enter child's code"
                  maxLength={6}
                  className="flex-1 bg-slate-700 rounded-xl px-4 py-3 text-white font-game tracking-widest outline-none border border-slate-600 focus:border-purple-500"
                />
                <button
                  onClick={handleLinkParent}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 rounded-xl transition"
                >
                  Link
                </button>
              </div>
            </div>
          )}

          {linkMsg && <div className="text-sm font-bold mb-4">{linkMsg}</div>}

          {/* Avatar color picker */}
          <div>
            <label className="text-slate-400 text-sm font-bold block mb-2">Avatar Color</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-full transition hover:scale-110 ${user.avatarConfig?.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => updateUser({ avatarConfig: { ...user.avatarConfig, color } })}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
