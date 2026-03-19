import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role) return setError('Please select your role (Kid or Parent)');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    setError('');
    try {
      await register({ name: form.name, email: form.email, password: form.password, role: form.role });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative z-10">
      {/* Floating background emojis */}
      {['🌟', '🎯', '🏅', '🎨', '🔬'].map((e, i) => (
        <motion.div
          key={i}
          className="fixed text-4xl opacity-10 pointer-events-none select-none"
          style={{ left: `${8 + i * 18}%`, top: `${10 + (i % 3) * 28}%` }}
          animate={{ y: [0, -12, 0], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
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
        <div className="text-center mb-6">
          <Link to="/" className="inline-block">
            <span className="text-5xl">🎮</span>
            <h1 className="font-game text-3xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mt-1">
              1up Learn
            </h1>
          </Link>
          <p className="text-slate-400 text-sm mt-2">Create your account and start your adventure!</p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => { setForm((p) => ({ ...p, role: 'child' })); setError(''); }}
            className={`p-4 rounded-2xl border-2 text-center transition hover:scale-105
              ${form.role === 'child'
                ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'}`}
          >
            <div className="text-3xl mb-1">🧒</div>
            <div className="font-bold text-sm">I'm a Kid</div>
            <div className="text-xs opacity-70 mt-0.5">Play & Learn</div>
          </button>
          <button
            type="button"
            onClick={() => { setForm((p) => ({ ...p, role: 'parent' })); setError(''); }}
            className={`p-4 rounded-2xl border-2 text-center transition hover:scale-105
              ${form.role === 'parent'
                ? 'border-teal-500 bg-teal-900/40 text-teal-300'
                : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'}`}
          >
            <div className="text-3xl mb-1">👨‍👧</div>
            <div className="font-bold text-sm">I'm a Parent</div>
            <div className="text-xs opacity-70 mt-0.5">Monitor Progress</div>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm font-bold mb-1.5">Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              required
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none border border-slate-600 focus:border-purple-500 transition placeholder-slate-500"
            />
          </div>

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
              placeholder="Min 6 characters"
              required
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none border border-slate-600 focus:border-purple-500 transition placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm font-bold mb-1.5">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              required
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none border border-slate-600 focus:border-purple-500 transition placeholder-slate-500"
            />
          </div>

          {/* Error */}
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
              transition hover:scale-[1.02] active:scale-[0.98] shadow-lg mt-1"
          >
            {loading ? '🔄 Creating account...' : '🎮 Start Adventure!'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-bold transition">
            Login here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
