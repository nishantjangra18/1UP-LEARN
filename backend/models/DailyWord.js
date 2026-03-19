const mongoose = require('mongoose');

// Daily Wordle-style word for all players
const dailyWordSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  word: { type: String, required: true },
  definition: String,
  hint: String,
  relatedTrack: String,  // 'math', 'science', 'english', etc.
  relatedTrackUrl: String,
});

module.exports = mongoose.model('DailyWord', dailyWordSchema);
