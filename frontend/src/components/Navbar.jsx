import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);


  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="relative z-50 bg-slate-900/80 backdrop-blur border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to={user ? (user.role === 'parent' ? '/parent' : '/dashboard') : '/'} className="flex items-center gap-2">
          <span className="text-3xl">🎮</span>
          <span className="font-game text-2xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            1up Learn
          </span>
        </Link>

        {/* Desktop Nav Links */}
        {user && user.role !== 'parent' && (
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <NavLink to="/dashboard">{t('nav.home')}</NavLink>
            <NavLink to="/games">{t('nav.games')}</NavLink>
            <NavLink to="/learn">{t('nav.learn')}</NavLink>
            <NavLink to="/leaderboard">🏆 {t('gamification.leaderboard')}</NavLink>
          </div>
        )}
        {user && user.role === 'parent' && (
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <NavLink to="/parent">{t('nav.parent')}</NavLink>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* XP + Coins mini display */}
              <div className="hidden sm:flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1 text-xs font-bold">
                <span className="text-yellow-400">⭐ {user.xp} XP</span>
                <span className="text-amber-400">🪙 {user.coins}</span>
              </div>

              {/* Avatar */}
              <Link to="/profile">
                <div className="w-9 h-9 rounded-full border-2 border-purple-500 hover:border-pink-400 transition overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>

              {/* Hamburger (mobile) */}
              <button className="md:hidden text-white text-xl" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? '✕' : '☰'}
              </button>

              {/* Logout (desktop) */}
              <button
                onClick={handleLogout}
                className="hidden md:block text-xs text-slate-400 hover:text-red-400 transition font-semibold"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-slate-300 hover:text-white font-bold text-sm px-3 py-1.5 rounded-xl hover:bg-slate-700 transition"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-4 py-1.5 rounded-full text-sm transition"
              >
                Sign Up 🚀
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-900 border-t border-slate-700 px-4 py-3 flex flex-col gap-3 text-sm font-semibold"
          >
            {user.role !== 'parent' && <>
              <NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>{t('nav.home')}</NavLink>
              <NavLink to="/games" onClick={() => setMenuOpen(false)}>{t('nav.games')}</NavLink>
              <NavLink to="/learn" onClick={() => setMenuOpen(false)}>{t('nav.learn')}</NavLink>
              <NavLink to="/leaderboard" onClick={() => setMenuOpen(false)}>🏆 {t('gamification.leaderboard')}</NavLink>
            </>}
            {user.role === 'parent' && <NavLink to="/parent" onClick={() => setMenuOpen(false)}>{t('nav.parent')}</NavLink>}
            {/* Mobile XP */}
            <div className="text-xs text-slate-500 pt-1 border-t border-slate-700">
              ⭐ {user.xp} XP &nbsp;|&nbsp; 🪙 {user.coins} Coins
            </div>
            <button onClick={handleLogout} className="text-left text-red-400 font-bold">{t('nav.logout')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NavLink({ to, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="text-slate-300 hover:text-white transition relative group"
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-400 group-hover:w-full transition-all duration-200" />
    </Link>
  );
}
