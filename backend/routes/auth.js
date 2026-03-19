const express = require('express');
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');

const router = express.Router();

// Helper: generate a unique 6-char child linking code
async function generateChildCode() {
  let code, exists;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    exists = await User.findOne({ childCode: code });
  } while (exists);
  return code;
}

// ─── REGISTER ────────────────────────────────────────────────
// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (!['parent', 'child'].includes(role)) {
    return res.status(400).json({ message: 'Role must be parent or child' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const userData = { name, email, password, role };

    // Parents get a child linking code
    if (role === 'parent') {
      userData.childCode = await generateChildCode();
    }
    // Children also get a code so parents can link them
    if (role === 'child') {
      userData.childCode = await generateChildCode();
    }

    const user = await User.create(userData);
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        coins: user.coins,
        badges: user.badges,
        childCode: user.childCode,
        wordleStreak: user.wordleStreak,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email }).populate('children', 'name xp level badges');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        coins: user.coins,
        badges: user.badges,
        trackProgress: user.trackProgress,
        gameHistory: user.gameHistory,
        childCode: user.childCode,
        wordleStreak: user.wordleStreak,
        easterEggsFound: user.easterEggsFound,
        children: user.children,
        avatarConfig: user.avatarConfig,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ─── GET CURRENT USER ─────────────────────────────────────────
// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('children', 'name xp level badges');
  res.json(user);
});

// ─── LINK CHILD TO PARENT ─────────────────────────────────────
// POST /api/auth/link-child
router.post('/link-child', protect, async (req, res) => {
  const { childCode } = req.body;

  if (req.user.role !== 'parent') {
    return res.status(403).json({ message: 'Only parents can link children' });
  }

  try {
    const child = await User.findOne({ childCode: childCode.toUpperCase() });
    if (!child) return res.status(404).json({ message: 'No child found with that code' });
    if (child.role !== 'child') return res.status(400).json({ message: 'That code belongs to a parent account' });

    // Avoid duplicate linking
    const parent = await User.findById(req.user._id);
    if (parent.children.includes(child._id)) {
      return res.status(409).json({ message: 'Child already linked' });
    }

    child.parentId = parent._id;
    await child.save();

    parent.children.push(child._id);
    await parent.save();

    res.json({ message: 'Child linked successfully!', child: { name: child.name, _id: child._id } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── UPLOAD AVATAR ────────────────────────────────────────────
// PUT /api/auth/avatar
router.put('/avatar', protect, async (req, res) => {
  const { avatar } = req.body;

  if (!avatar) {
    return res.status(400).json({ message: 'No image data provided' });
  }
  if (!avatar.startsWith('data:image/')) {
    return res.status(400).json({ message: 'Invalid image format' });
  }
  // ~2MB base64 limit (≈1.5MB file)
  if (avatar.length > 2 * 1024 * 1024) {
    return res.status(400).json({ message: 'Image too large. Max 1.5 MB.' });
  }

  try {
    await User.findByIdAndUpdate(req.user._id, { avatar });
    res.json({ avatar });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
