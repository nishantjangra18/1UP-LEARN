# 🎮 1up Learn — Gamified Education Platform

A full-stack gamified education platform for children aged 5–10 with parent monitoring.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Google OAuth credentials

### 1. Clone & Install

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Fill in your .env values

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

Edit `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/1up-learn
JWT_SECRET=your_super_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=http://localhost:5173
SESSION_SECRET=your_session_secret
```

### 3. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
5. Copy Client ID and Secret to `.env`

### 4. Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Visit: `http://localhost:5173`

---

## 🏗️ Project Structure

```
1up-learn/
├── backend/
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/auth.js     # JWT auth middleware
│   ├── models/
│   │   ├── User.js            # User schema (XP, badges, progress)
│   │   └── DailyWord.js       # Wordle daily word
│   ├── routes/
│   │   ├── auth.js            # Google OAuth + JWT
│   │   ├── progress.js        # XP, coins, badges, leaderboard
│   │   └── wordle.js          # Daily word game
│   └── server.js
│
└── frontend/
    └── src/
        ├── contexts/
        │   ├── AuthContext.jsx  # User auth state
        │   └── GameContext.jsx  # Game events, notifications
        ├── games/
        │   ├── MemoryMatch.jsx
        │   ├── WhackAMole.jsx
        │   ├── Connect4.jsx     # With AI opponent
        │   ├── Quiz.jsx         # Jeopardy-style
        │   ├── SnakeLadders.jsx
        │   ├── FlappyBird.jsx   # Canvas-based
        │   ├── MathBlast.jsx    # Timed math quiz
        │   └── WordBuilder.jsx  # Unscramble words
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── Dashboard.jsx
        │   ├── GamesShowcase.jsx
        │   ├── GamePage.jsx     # Game wrapper + restore life
        │   ├── LearningPath.jsx # Visual path UI
        │   ├── ParentDashboard.jsx
        │   ├── Profile.jsx
        │   ├── Leaderboard.jsx
        │   └── AuthCallback.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── GameCard.jsx
        │   ├── XPBar.jsx
        │   ├── BadgeDisplay.jsx
        │   ├── FeedbackForm.jsx
        │   ├── WordleModal.jsx
        │   ├── FloatingNotification.jsx
        │   └── EasterEggLayer.jsx
        └── locales/
            ├── en.json          # English
            └── hi.json          # Hindi
```

---

## ✨ Features

| Feature | Status |
|---------|--------|
| Google OAuth Login | ✅ |
| Parent / Child Roles | ✅ |
| XP, Levels, Coins, Badges | ✅ |
| 8 Playable Games | ✅ |
| Wordle Daily Word | ✅ |
| Learning Paths (6 tracks) | ✅ |
| Parent Dashboard + Charts | ✅ |
| Restore Life via MCQ | ✅ |
| Easter Eggs | ✅ |
| Feedback System | ✅ |
| Leaderboard | ✅ |
| Multi-language (EN/HI) | ✅ |
| Responsive Design | ✅ |
| Framer Motion Animations | ✅ |

---

## 🎮 Games

| Game | Type | Subject |
|------|------|---------|
| Memory Match | Card flipping | Brain |
| Whack-a-Mole | Reflex | Reflex |
| Connect 4 | Strategy (vs AI) | Strategy |
| Jeopardy Quiz | Trivia | All subjects |
| Snake & Ladders | Dice / Board | Math |
| Flappy Bird | Endless runner | Reflex |
| Math Blast | Timed arithmetic | Math |
| Word Builder | Unscramble | English |

---

## 📊 MongoDB Schema

**User:**
- `googleId`, `name`, `email`, `role` (parent/child)
- `xp`, `level`, `coins`
- `badges[]` — earned achievements
- `trackProgress[]` — per-subject progress
- `gameHistory[]` — completed games
- `parentId`, `children[]`, `childCode`
- `wordleStreak`, `easterEggsFound[]`

**DailyWord:**
- `date`, `word`, `definition`, `hint`, `relatedTrack`

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/set-role` | Set parent/child role |
| POST | `/api/auth/link-child` | Link child to parent |
| POST | `/api/progress/game-complete` | Record game completion |
| POST | `/api/progress/track-progress` | Update track progress |
| POST | `/api/progress/easter-egg` | Collect easter egg |
| GET | `/api/progress/leaderboard` | Top 10 by XP |
| GET | `/api/progress/children` | Parent's children |
| GET | `/api/wordle/today` | Get today's word info |
| POST | `/api/wordle/guess` | Submit a Wordle guess |
