import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
      {/* Floating background emojis */}
      {['🎮', '⭐', '🚀', '🏆', '🎲'].map((e, i) => (
        <motion.div
          key={i}
          className="fixed text-4xl opacity-10 pointer-events-none select-none"
          style={{ left: `${10 + i * 20}%`, top: `${15 + (i % 3) * 25}%` }}
          animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.4 }}
        >
          {e}
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/90 backdrop-blur rounded-3xl p-8 w-full max-w-md border border-slate-700 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="text-5xl">🎮</span>
            <h1 className="font-game text-3xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mt-1">
              1up Learn
            </h1>
          </Link>
          <p className="text-slate-400 text-sm mt-2">Welcome back, adventurer!</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm font-bold mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none border border-slate-600 focus:border-purple-500 transition placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm font-bold mb-1.5">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none border border-slate-600 focus:border-purple-500 transition placeholder-slate-500"
            />
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/40 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-xl"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500
              disabled:opacity-50 disabled:cursor-not-allowed text-white font-game text-lg py-3 rounded-2xl
              transition hover:scale-[1.02] active:scale-[0.98] shadow-lg mt-2"
          >
            {loading ? '🔄 Logging in...' : '🚀 Login'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-purple-400 hover:text-purple-300 font-bold transition">
            Sign up here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
