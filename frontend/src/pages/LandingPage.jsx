import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

// Feature cards data
const FEATURES = [
  { icon: '🎮', key: 'games' },
  { icon: '🏅', key: 'badges' },
  { icon: '🗺️', key: 'paths' },
  { icon: '👨‍👧', key: 'parents' },
];

// Floating bubbles config
const BUBBLES = [
  { emoji: '🌟', delay: 0, x: '10%', y: '20%', size: 'text-4xl' },
  { emoji: '🎲', delay: 0.5, x: '80%', y: '15%', size: 'text-3xl' },
  { emoji: '🚀', delay: 1, x: '15%', y: '60%', size: 'text-5xl' },
  { emoji: '🧮', delay: 1.5, x: '75%', y: '55%', size: 'text-3xl' },
  { emoji: '🔬', delay: 0.8, x: '50%', y: '10%', size: 'text-2xl' },
  { emoji: '🎨', delay: 1.2, x: '90%', y: '40%', size: 'text-4xl' },
  { emoji: '📚', delay: 0.3, x: '5%', y: '80%', size: 'text-3xl' },
  { emoji: '🌈', delay: 0.7, x: '60%', y: '80%', size: 'text-4xl' },
];

export default function LandingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Floating decorative bubbles */}
      {BUBBLES.map((b, i) => (
        <motion.div
          key={i}
          className={`fixed pointer-events-none select-none ${b.size} opacity-10`}
          style={{ left: b.x, top: b.y }}
          animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: b.delay }}
        >
          {b.emoji}
        </motion.div>
      ))}

      {/* ─── HERO SECTION ─── */}
      <section className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center text-center px-4 py-16">
        {/* App icon + title */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <div className="text-8xl mb-2 animate-float inline-block">🎮</div>
          <h1 className="font-game text-6xl md:text-8xl bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
            {t('app.name')}
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-game text-2xl md:text-3xl text-slate-300 mb-2"
        >
          {t('landing.hero_title')}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-slate-400 max-w-lg text-lg mb-10"
        >
          {t('landing.hero_subtitle')}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          {user ? (
            <Link
              to="/dashboard"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-game text-xl px-8 py-4 rounded-2xl shadow-xl transition hover:scale-105"
            >
              {t('landing.cta_start')} 🚀
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-game text-xl px-8 py-4 rounded-2xl shadow-xl transition hover:scale-105"
              >
                {t('landing.cta_start')} 🚀
              </Link>
              <Link
                to="/login"
                className="bg-slate-700/80 hover:bg-slate-600/80 text-white font-game text-xl px-8 py-4 rounded-2xl shadow-xl transition hover:scale-105 border border-slate-600"
              >
                Sign In 🔑
              </Link>
            </>
          )}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute bottom-8 text-slate-500 text-2xl"
        >
          ↓
        </motion.div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section className="relative z-10 py-16 px-4 bg-slate-900/60 backdrop-blur">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-game text-4xl text-center text-white mb-12"
          >
            {t('landing.features_title')} 🌟
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-800/70 rounded-2xl p-6 text-center hover:bg-slate-700/70 transition hover:-translate-y-1"
              >
                <div className="text-5xl mb-4">{f.icon}</div>
                <h3 className="font-game text-lg text-white mb-2">{t(`landing.feature_${f.key}`)}</h3>
                <p className="text-slate-400 text-sm">{t(`landing.feature_${f.key}_desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-game text-4xl text-white mb-12"
          >
            {t('landing.cta_learn')} 🗺️
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', emoji: '🔑', title: 'Create Your Account', desc: 'Safe and easy sign-up for kids and parents' },
              { step: '2', emoji: '🎮', title: 'Pick a Game', desc: 'Choose from 10+ games across all subjects' },
              { step: '3', emoji: '🏆', title: 'Level Up!', desc: 'Earn XP, coins, and badges as you learn' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.2 }}
                className="relative"
              >
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-game text-xl flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <div className="text-4xl mb-3">{item.emoji}</div>
                <h3 className="font-game text-lg text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER CTA ─── */}
      <section className="relative z-10 py-16 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto bg-gradient-to-r from-purple-900/60 to-pink-900/60 rounded-3xl p-10 border border-purple-500/30"
        >
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="font-game text-4xl text-white mb-4">Ready to Level Up?</h2>
          <p className="text-slate-400 mb-8">Join thousands of kids learning through play!</p>
          {!user && (
            <Link
              to="/register"
              className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white font-game text-xl px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition"
            >
              Start Free Today 🎮
            </Link>
          )}
        </motion.div>
      </section>

    </div>
  );
}

