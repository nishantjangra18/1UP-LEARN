const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const badgeSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  icon: String,
  earnedAt: { type: Date, default: Date.now },
});

const trackProgressSchema = new mongoose.Schema({
  trackId: String,
  trackName: String,
  levelsCompleted: { type: Number, default: 0 },
  totalLevels: { type: Number, default: 10 },
  lastPlayedAt: Date,
});

const gameRecordSchema = new mongoose.Schema({
  gameId: String,
  gameName: String,
  score: Number,
  xpEarned: Number,
  coinsEarned: Number,
  completedAt: { type: Date, default: Date.now },
  feedbackRating: { type: Number, min: 1, max: 5 },
  feedbackText: String,
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['parent', 'child'], required: true },
    avatar: { type: String, default: '' },

    // Gamification
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    coins: { type: Number, default: 0 },
    badges: [badgeSchema],

    // Progress
    trackProgress: [trackProgressSchema],
    gameHistory: [gameRecordSchema],

    // Parent-child relationship
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    childCode: { type: String, unique: true, sparse: true },

    // Daily word
    wordleStreak: { type: Number, default: 0 },
    lastWordleDate: String,

    // Easter eggs
    easterEggsFound: [String],

    // Avatar customization
    avatarConfig: {
      color: { type: String, default: '#6366f1' },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Update level from XP
userSchema.methods.addXP = function (amount) {
  this.xp += amount;
  this.level = Math.floor(this.xp / 100) + 1;
};

userSchema.methods.addCoins = function (amount) {
  this.coins += amount;
};

module.exports = mongoose.model('User', userSchema);
