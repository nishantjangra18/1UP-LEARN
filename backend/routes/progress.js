const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All BADGE definitions
const BADGES = {
  first_game: { id: 'first_game', name: 'First Steps', description: 'Completed your first game!', icon: '🎮' },
  streak_3: { id: 'streak_3', name: 'On Fire!', description: '3-day Wordle streak', icon: '🔥' },
  level_5: { id: 'level_5', name: 'Rising Star', description: 'Reached Level 5', icon: '⭐' },
  level_10: { id: 'level_10', name: 'Champion', description: 'Reached Level 10', icon: '🏆' },
  coins_100: { id: 'coins_100', name: 'Rich Kid', description: 'Collected 100 coins', icon: '💰' },
  science_master: { id: 'science_master', name: 'Science Whiz', description: 'Completed Science track', icon: '🔬' },
  math_master: { id: 'math_master', name: 'Math Wizard', description: 'Completed Math track', icon: '🧮' },
  easter_hunter: { id: 'easter_hunter', name: 'Easter Egg Hunter', description: 'Found 5 easter eggs', icon: '🥚' },
};

// Award XP and coins after game completion
router.post('/game-complete', protect, async (req, res) => {
  const { gameId, gameName, score, xpEarned, coinsEarned, feedbackRating, feedbackText } = req.body;
  const user = req.user;

  // Add game record
  user.gameHistory.push({ gameId, gameName, score, xpEarned, coinsEarned, feedbackRating, feedbackText });

  // Add XP and coins
  user.addXP(xpEarned || 20);
  user.addCoins(coinsEarned || 10);

  // Check badge: first game
  if (user.gameHistory.length === 1) {
    const badge = BADGES.first_game;
    if (!user.badges.find((b) => b.id === badge.id)) {
      user.badges.push(badge);
    }
  }

  // Check level badges
  if (user.level >= 5 && !user.badges.find((b) => b.id === 'level_5')) {
    user.badges.push(BADGES.level_5);
  }
  if (user.level >= 10 && !user.badges.find((b) => b.id === 'level_10')) {
    user.badges.push(BADGES.level_10);
  }

  // Check coins badge
  if (user.coins >= 100 && !user.badges.find((b) => b.id === 'coins_100')) {
    user.badges.push(BADGES.coins_100);
  }

  await user.save();

  res.json({
    xp: user.xp,
    level: user.level,
    coins: user.coins,
    badges: user.badges,
    newBadges: user.badges.slice(-2), // return recently added badges
  });
});

// Update track progress
router.post('/track-progress', protect, async (req, res) => {
  const { trackId, trackName, levelsCompleted, totalLevels } = req.body;
  const user = req.user;

  const existing = user.trackProgress.find((t) => t.trackId === trackId);
  if (existing) {
    existing.levelsCompleted = levelsCompleted;
    existing.lastPlayedAt = new Date();
  } else {
    user.trackProgress.push({ trackId, trackName, levelsCompleted, totalLevels, lastPlayedAt: new Date() });
  }

  // Award track completion badges
  if (levelsCompleted >= totalLevels) {
    const badgeKey = `${trackId}_master`;
    if (BADGES[badgeKey] && !user.badges.find((b) => b.id === badgeKey)) {
      user.badges.push(BADGES[badgeKey]);
    }
  }

  await user.save();
  res.json({ trackProgress: user.trackProgress });
});

// Record easter egg found
router.post('/easter-egg', protect, async (req, res) => {
  const { eggId } = req.body;
  const user = req.user;

  if (!user.easterEggsFound.includes(eggId)) {
    user.easterEggsFound.push(eggId);
    user.addXP(5);
    user.addCoins(10);

    // Badge for finding 5 eggs
    if (user.easterEggsFound.length >= 5 && !user.badges.find((b) => b.id === 'easter_hunter')) {
      user.badges.push(BADGES.easter_hunter);
    }

    await user.save();
    return res.json({ found: true, xp: user.xp, coins: user.coins, message: '+10 coins and +5 XP!' });
  }

  res.json({ found: false, message: 'Already collected this egg!' });
});

// Get leaderboard (top 10 by XP)
router.get('/leaderboard', async (req, res) => {
  const leaders = await User.find({ role: 'child' })
    .sort({ xp: -1 })
    .limit(10)
    .select('name avatar xp level badges');

  res.json(leaders);
});

// Get parent's children progress
router.get('/children', protect, async (req, res) => {
  const parent = await User.findById(req.user._id).populate({
    path: 'children',
    select: 'name avatar xp level coins badges trackProgress gameHistory wordleStreak',
  });

  res.json(parent.children || []);
});

module.exports = router;
