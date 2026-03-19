import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';

// A few hidden easter eggs scattered on specific pages
const EGGS = [
  { id: 'egg_star', emoji: '⭐', style: { bottom: '15%', right: '3%' } },
  { id: 'egg_rainbow', emoji: '🌈', style: { top: '30%', left: '1%' } },
  { id: 'egg_rocket', emoji: '🚀', style: { bottom: '40%', right: '2%' } },
];

export default function EasterEggLayer() {
  const { collectEasterEgg } = useGame();
  const { user } = useAuth();
  const [collected, setCollected] = useState([]);
  const [burst, setBurst] = useState(null);

  if (!user) return null;

  const handleClick = async (egg) => {
    if (collected.includes(egg.id)) return;
    setCollected((p) => [...p, egg.id]);
    setBurst(egg.id);
    await collectEasterEgg(egg.id);
    setTimeout(() => setBurst(null), 800);
  };

  return (
    <>
      {EGGS.map((egg) => (
        <div key={egg.id} style={{ position: 'fixed', zIndex: 40, ...egg.style }}>
          <AnimatePresence>
            {!collected.includes(egg.id) && (
              <motion.button
                className="easter-egg text-2xl select-none"
                onClick={() => handleClick(egg)}
                whileHover={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
              >
                {egg.emoji}
              </motion.button>
            )}
          </AnimatePresence>
          {burst === egg.id && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              className="absolute inset-0 text-3xl flex items-center justify-center pointer-events-none"
            >
              ✨
            </motion.div>
          )}
        </div>
      ))}
    </>
  );
}
