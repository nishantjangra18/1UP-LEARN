/**
 * Quiz routes
 *
 * POST /api/quiz/generate
 *   → Requires authentication (JWT) so only registered child users can generate
 *   → Body: { topic, difficulty, age, gameType, count, avoidQuestions, lastScore, currentDifficulty }
 *   → Returns: { questions, difficulty, cached }
 */

const express = require('express');
const router  = express.Router();

const { protect }                                              = require('../middleware/auth');
const { generateQuiz, tutorExplain, rivalChallenge, tutorChat } = require('../controllers/quizController');

// All quiz endpoints require a valid JWT
router.post('/generate', protect, generateQuiz);
router.post('/explain',  protect, tutorExplain);
router.post('/rival',    protect, rivalChallenge);
router.post('/chat',     protect, tutorChat);

module.exports = router;
