/**
 * quizController.js — handles POST /api/quiz/generate
 *
 * Flow:
 *  1. Validate incoming request parameters
 *  2. Build a cache key and check MongoDB for a cached result
 *  3. If cache hit → return cached questions (free / instant)
 *  4. If cache miss → call AI service to generate fresh questions
 *  5. Store generated questions in cache for future requests
 *  6. Return questions to client
 *
 * Adaptive difficulty:
 *  - Client may pass `lastScore` (0–100 %) and `currentDifficulty`
 *  - Controller adjusts difficulty up/down based on performance thresholds
 *
 * Fallback:
 *  - If AI fails, return a 503 with a `fallback: true` flag so the
 *    frontend knows to use its built-in static questions
 */

const { generateQuestions, explainAnswer, generateRival, chatWithTutor } = require('../services/aiService');
const QuizCache = require('../models/QuizCache');

// ─── Constants ───────────────────────────────────────────────────────────────
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const DIFFICULTY_ORDER   = ['easy', 'medium', 'hard']; // used for adaptive step

// Score thresholds for adaptive difficulty
const INCREASE_THRESHOLD = 0.80; // if score >= 80 % → bump difficulty
const DECREASE_THRESHOLD = 0.50; // if score < 50 %  → lower difficulty

// ─── Helper: adapt difficulty based on last performance ──────────────────────
function adaptDifficulty(currentDifficulty, lastScore) {
  if (lastScore == null) return currentDifficulty; // no change if no score provided

  const idx = DIFFICULTY_ORDER.indexOf(currentDifficulty);
  if (lastScore >= INCREASE_THRESHOLD && idx < DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[idx + 1]; // increase
  }
  if (lastScore < DECREASE_THRESHOLD && idx > 0) {
    return DIFFICULTY_ORDER[idx - 1]; // decrease
  }
  return currentDifficulty; // stay same
}

// ─── Main controller ─────────────────────────────────────────────────────────
async function generateQuiz(req, res) {
  const {
    topic,
    difficulty: rawDifficulty = 'easy',
    age = 8,
    gameType = 'mcq',
    count = 5,
    avoidQuestions = [],   // array of question strings to avoid (repeat prevention)
    lastScore,             // fraction 0–1 for adaptive difficulty (optional)
    currentDifficulty,     // current difficulty before adaptation (optional)
  } = req.body;

  // ── 1. Validate ────────────────────────────────────────────────────────────
  if (!topic) {
    return res.status(400).json({ error: 'topic is required' });
  }

  const parsedAge   = Math.min(Math.max(Number(age) || 8, 5), 10);
  const parsedCount = Math.min(Math.max(Number(count) || 5, 1), 20);

  // Apply adaptive difficulty if performance data is provided
  let difficulty = VALID_DIFFICULTIES.includes(rawDifficulty) ? rawDifficulty : 'easy';
  if (currentDifficulty && lastScore != null) {
    difficulty = adaptDifficulty(
      VALID_DIFFICULTIES.includes(currentDifficulty) ? currentDifficulty : difficulty,
      Number(lastScore)
    );
  }

  // ── 2. Cache lookup ────────────────────────────────────────────────────────
  // avoidQuestions intentionally excluded from cache key — they personalise
  // the request but the underlying topic+difficulty set is cacheable
  const cacheKey = `${topic.toLowerCase()}_${difficulty}_${parsedAge}_${parsedCount}`;

  try {
    const cached = await QuizCache.findOne({ cacheKey });
    if (cached) {
      return res.json({
        questions:  cached.questions,
        difficulty, // may differ from requested if adapted
        cached: true,
      });
    }
  } catch (dbErr) {
    // Cache lookup failure is non-fatal — proceed to AI generation
    console.error('[QuizCache] lookup error:', dbErr.message);
  }

  // ── 3. Generate via AI ────────────────────────────────────────────────────
  try {
    const questions = await generateQuestions({
      topic,
      difficulty,
      age: parsedAge,
      gameType,
      count: parsedCount,
      avoidQuestions: Array.isArray(avoidQuestions) ? avoidQuestions : [],
    });

    // ── 4. Persist to cache (best-effort) ──────────────────────────────────
    QuizCache.create({ cacheKey, questions, topic, difficulty, age: parsedAge, gameType }).catch(
      (e) => console.error('[QuizCache] write error:', e.message)
    );

    return res.json({ questions, difficulty, cached: false });
  } catch (aiErr) {
    // ── 5. AI failed → tell client to use static fallback ──────────────────
    console.error('[AI] generation error:', aiErr.message);
    return res.status(503).json({
      error:    'AI generation unavailable — use fallback questions',
      fallback: true,
      detail:   aiErr.message,
    });
  }
}

// ─── AI Tutor — explain wrong answer ─────────────────────────────────────────
async function tutorExplain(req, res) {
  const { question, correctAnswer, userAnswer, topic, age = 8 } = req.body;

  if (!question || !correctAnswer || !userAnswer || !topic) {
    return res.status(400).json({ error: 'question, correctAnswer, userAnswer, and topic are required' });
  }

  try {
    const result = await explainAnswer({
      question,
      correctAnswer,
      userAnswer,
      topic,
      age: Math.min(Math.max(Number(age) || 8, 5), 10),
    });
    return res.json(result);
  } catch (err) {
    console.error('[AI Tutor] error:', err.message);
    return res.status(503).json({ error: 'Tutor unavailable', fallback: true });
  }
}

// ─── AI Rival ─────────────────────────────────────────────────────────────────
async function rivalChallenge(req, res) {
  const { score, accuracy, gameType, topic, maxScore = 10 } = req.body;

  if (score == null || !gameType || !topic) {
    return res.status(400).json({ error: 'score, gameType, and topic are required' });
  }

  try {
    const result = await generateRival({
      score:    Number(score),
      accuracy: Number(accuracy) || 0,
      gameType,
      topic,
      maxScore: Number(maxScore),
    });
    return res.json(result);
  } catch (err) {
    console.error('[AI Rival] error:', err.message);
    return res.status(503).json({ error: 'Rival unavailable', fallback: true });
  }
}

// ─── AI Chat Tutor — answer any freeform child question ───────────────────────
async function tutorChat(req, res) {
  const { question, age = 8 } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  try {
    const result = await chatWithTutor({
      question: question.trim(),
      age: Math.min(Math.max(Number(age) || 8, 5), 10),
    });
    return res.json(result);
  } catch (err) {
    console.error('[AI Chat] error:', err.message);
    return res.status(503).json({ error: 'Tutor unavailable', fallback: true, detail: err.message });
  }
}

module.exports = { generateQuiz, tutorExplain, rivalChallenge, tutorChat };
