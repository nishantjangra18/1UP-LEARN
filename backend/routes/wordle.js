const express = require('express');
const DailyWord = require('../models/DailyWord');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Seed words by track
const WORD_BANK = [
  { word: 'PLANT', definition: 'A living thing that grows in the ground and has leaves.', hint: 'It needs water and sunlight.', relatedTrack: 'science' },
  { word: 'ORBIT', definition: 'The curved path of a planet around the sun.', hint: 'Planets do this around stars.', relatedTrack: 'science' },
  { word: 'EQUAL', definition: 'The same amount on both sides.', hint: 'Used in math equations.', relatedTrack: 'math' },
  { word: 'PRIME', definition: 'A number divisible only by 1 and itself.', hint: '2, 3, 5, 7 are examples.', relatedTrack: 'math' },
  { word: 'BRAVE', definition: 'Not afraid to do something difficult.', hint: 'Heroes are this.', relatedTrack: 'english' },
  { word: 'CLOUD', definition: 'Water droplets floating in the sky.', hint: 'It produces rain.', relatedTrack: 'science' },
  { word: 'ANGLE', definition: 'The space between two lines meeting at a point.', hint: 'Measured in degrees.', relatedTrack: 'math' },
  { word: 'RIVER', definition: 'A large natural stream of water.', hint: 'Flows to the sea.', relatedTrack: 'science' },
  { word: 'STORY', definition: 'A description of imaginary events.', hint: 'Books are full of these.', relatedTrack: 'english' },
  { word: 'LIGHT', definition: 'Energy that makes things visible.', hint: 'The sun produces it.', relatedTrack: 'science' },
];

// Get today's word (auto-create if missing)
router.get('/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  let word = await DailyWord.findOne({ date: today });

  if (!word) {
    // Pick a word based on day of year so all users get the same word
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const wordData = WORD_BANK[dayOfYear % WORD_BANK.length];
    word = await DailyWord.create({ date: today, ...wordData });
  }

  // Return word without revealing it (only length + track)
  res.json({
    date: word.date,
    wordLength: word.word.length,
    hint: word.hint,
    relatedTrack: word.relatedTrack,
    // don't reveal word.word here
  });
});

// Submit a guess
router.post('/guess', protect, async (req, res) => {
  const { guess } = req.body;
  const today = new Date().toISOString().split('T')[0];

  const wordDoc = await DailyWord.findOne({ date: today });
  if (!wordDoc) return res.status(404).json({ message: 'No word for today' });

  const target = wordDoc.word.toUpperCase();
  const guessUpper = guess.toUpperCase();

  if (guessUpper.length !== target.length) {
    return res.status(400).json({ message: `Guess must be ${target.length} letters` });
  }

  // Build letter result: 'correct', 'present', 'absent'
  const result = Array(target.length).fill('absent');
  const targetLetters = target.split('');
  const guessLetters = guessUpper.split('');

  // First pass: mark correct positions
  guessLetters.forEach((letter, i) => {
    if (letter === targetLetters[i]) {
      result[i] = 'correct';
      targetLetters[i] = null;
      guessLetters[i] = null;
    }
  });

  // Second pass: mark present letters
  guessLetters.forEach((letter, i) => {
    if (letter === null) return;
    const idx = targetLetters.indexOf(letter);
    if (idx !== -1) {
      result[i] = 'present';
      targetLetters[idx] = null;
    }
  });

  const isWin = guessUpper === target;

  // Update streak if won
  let xpAwarded = 0;
  if (isWin) {
    const user = req.user;
    if (user.lastWordleDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      user.wordleStreak = user.lastWordleDate === yStr ? user.wordleStreak + 1 : 1;
      user.lastWordleDate = today;
      xpAwarded = 15 + (user.wordleStreak > 2 ? 10 : 0); // Bonus for streak
      user.addXP(xpAwarded);
      user.addCoins(5);
      await user.save();
    }
  }

  res.json({
    result,
    isWin,
    ...(isWin && {
      word: target,
      definition: wordDoc.definition,
      relatedTrack: wordDoc.relatedTrack,
      xpAwarded,
    }),
  });
});

module.exports = router;
