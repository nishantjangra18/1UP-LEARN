import { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const GameContext = createContext(null);

export const GameProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [notification, setNotification] = useState(null); // { type: 'xp'|'coin'|'badge'|'egg', message }
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);

  // Plays a sound effect if audio is enabled
  const playSound = (type) => {
    // Map sound types to files (place in /public/sounds/)
    const sounds = {
      coin: '/sounds/coin.mp3',
      win: '/sounds/win.mp3',
      lose: '/sounds/lose.mp3',
      click: '/sounds/click.mp3',
      badge: '/sounds/badge.mp3',
      egg: '/sounds/egg.mp3',
    };
    if (sounds[type]) {
      const audio = new Audio(sounds[type]);
      audio.volume = 0.4;
      audio.play().catch(() => {}); // Suppress autoplay errors
    }
  };

  // Show a floating notification (auto-dismiss after 3s)
  const showNotification = (msg, type = 'xp') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Called when a game ends — posts to backend and updates local state
  const onGameComplete = async ({ gameId, gameName, score, xpEarned = 20, coinsEarned = 10, feedbackRating, feedbackText }) => {
    try {
      const res = await axios.post('/api/progress/game-complete', {
        gameId, gameName, score, xpEarned, coinsEarned, feedbackRating, feedbackText,
      });
      updateUser({ xp: res.data.xp, level: res.data.level, coins: res.data.coins, badges: res.data.badges });
      playSound('coin');
      showNotification(`+${xpEarned} XP  +${coinsEarned} Coins`, 'reward');

      // Announce new badges
      if (res.data.newBadges?.length > 0) {
        setTimeout(() => {
          playSound('badge');
          showNotification(`🏅 New Badge: ${res.data.newBadges[0].name}`, 'badge');
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to record game completion', err);
    }
  };

  // Collect an easter egg
  const collectEasterEgg = async (eggId) => {
    try {
      const res = await axios.post('/api/progress/easter-egg', { eggId });
      if (res.data.found) {
        playSound('egg');
        showNotification(res.data.message, 'egg');
        updateUser({ xp: res.data.xp, coins: res.data.coins });
      }
    } catch {}
  };

  return (
    <GameContext.Provider value={{
      notification,
      showFeedback, setShowFeedback,
      currentGame, setCurrentGame,
      playSound, showNotification,
      onGameComplete, collectEasterEgg,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
};
