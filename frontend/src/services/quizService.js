/**
 * quizService.js — frontend API client for dynamic quiz generation.
 *
 * All functions return an object: { questions, difficulty, cached, error }
 *
 * Questions shape (AI format):
 *   { question, options: [4 strings], answer, explanation }
 *
 * Consumers (Quiz.jsx, LearningPath.jsx) convert to their own format
 * if needed, or use the helper `toTrackFormat()` below.
 */

import axios from 'axios';

// ─── Difficulty mapping for Learning Path levels (1-5) ───────────────────────
const LEVEL_TO_DIFFICULTY = {
  1: 'easy',
  2: 'easy',
  3: 'medium',
  4: 'hard',
  5: 'hard',
};

// ─── Core fetch function ─────────────────────────────────────────────────────
/**
 * Fetches AI-generated questions from the backend.
 *
 * @param {object} params
 * @param {string}   params.topic            - Subject (e.g. "science", "math")
 * @param {string}   params.difficulty       - "easy" | "medium" | "hard"
 * @param {number}   params.age              - Child's age (5–10)
 * @param {string}   params.gameType         - "jeopardy" | "mcq" | "memory"
 * @param {number}   params.count            - Number of questions (default 5)
 * @param {string[]} params.avoidQuestions   - Previously shown question strings
 * @param {number}   params.lastScore        - 0–1 fraction for adaptive difficulty
 * @param {string}   params.currentDifficulty - Current difficulty before adaptation
 * @returns {Promise<{questions: object[], difficulty: string, cached: boolean}>}
 */
export async function fetchQuizQuestions({
  topic,
  difficulty = 'easy',
  age = 8,
  gameType = 'mcq',
  count = 5,
  avoidQuestions = [],
  lastScore,
  currentDifficulty,
} = {}) {
  const { data } = await axios.post('/api/quiz/generate', {
    topic,
    difficulty,
    age,
    gameType,
    count,
    avoidQuestions,
    ...(lastScore != null ? { lastScore, currentDifficulty } : {}),
  });
  return data; // { questions, difficulty, cached }
}

// ─── Convenience: fetch questions for a Jeopardy category ───────────────────
/**
 * Fetches 5 questions for a Jeopardy category.
 * Difficulty covers the full easy→hard spectrum for the 5 values.
 *
 * @param {string} category  - e.g. "Science"
 * @param {number} age
 * @param {string[]} avoidQuestions
 */
export async function fetchJeopardyCategory(category, age = 8, avoidQuestions = []) {
  return fetchQuizQuestions({
    topic: category,
    difficulty: 'medium', // board spans easy-hard; prompt handles graduation
    age,
    gameType: 'jeopardy',
    count: 5,
    avoidQuestions,
  });
}

// ─── Convenience: fetch questions for a Learning Path level ─────────────────
/**
 * Fetches 20 MCQ questions for a learning-track level with level-mapped difficulty.
 *
 * @param {string} trackId    - e.g. "science", "math"
 * @param {string} topicName  - e.g. "Plants & Animals"
 * @param {number} level      - 1–5
 * @param {number} age
 * @param {string[]} avoidQuestions
 * @param {number} lastScore  - 0–1 fraction (optional, for adaptive difficulty)
 */
export async function fetchLevelQuestions(
  trackId,
  topicName,
  level,
  age = 8,
  avoidQuestions = [],
  lastScore = null
) {
  const difficulty = LEVEL_TO_DIFFICULTY[level] || 'easy';
  return fetchQuizQuestions({
    topic: `${trackId} — ${topicName}`,
    difficulty,
    age,
    gameType: 'mcq',
    count: 10,          // 10 questions → ~2× faster than 20, same 70% pass ratio
    avoidQuestions,
    ...(lastScore != null ? { lastScore, currentDifficulty: difficulty } : {}),
  });
}

// ─── AI Tutor: explain a wrong answer ────────────────────────────────────────
/**
 * Fetches a child-friendly explanation for a wrong answer.
 *
 * @param {object} params
 * @param {string} params.question
 * @param {string} params.correctAnswer
 * @param {string} params.userAnswer
 * @param {string} params.topic
 * @param {number} params.age
 * @returns {Promise<{message, explanation, example, practiceQuestion}>}
 */
export async function fetchTutorExplanation({ question, correctAnswer, userAnswer, topic, age = 8 }) {
  const { data } = await axios.post('/api/quiz/explain', {
    question, correctAnswer, userAnswer, topic, age,
  });
  return data;
}

// ─── AI Rival: generate a competitor for the user ────────────────────────────
/**
 * Generates an AI rival character based on the user's quiz performance.
 *
 * @param {object} params
 * @param {number} params.score       - User's raw score
 * @param {number} params.accuracy    - Percentage 0–100
 * @param {string} params.gameType    - "jeopardy" | "mcq"
 * @param {string} params.topic       - e.g. "Science — Plants & Animals"
 * @param {number} params.maxScore    - Maximum possible score for this game
 * @returns {Promise<{rival: {name, score, message, personality, emoji}}>}
 */
export async function fetchRival({ score, accuracy, gameType, topic, maxScore }) {
  const { data } = await axios.post('/api/quiz/rival', {
    score, accuracy, gameType, topic, maxScore,
  });
  return data;
}

// ─── AI Chat Tutor: answer any freeform question ─────────────────────────────
/**
 * Sends a child's question to the AI tutor and returns a structured answer.
 *
 * @param {object} params
 * @param {string} params.question - The child's question
 * @param {number} params.age
 * @returns {Promise<{answer, example, funFact, followUpQuestion}>}
 */
export async function fetchTutorChat({ question, age = 8 }) {
  const { data } = await axios.post('/api/quiz/chat', { question, age });
  return data;
}

// ─── Format converters ───────────────────────────────────────────────────────

/**
 * Convert AI question format → LearningPath/LevelQuiz format.
 * LevelQuiz expects: { q, a, o }
 */
export function toTrackFormat(aiQuestion) {
  return {
    q: aiQuestion.question,
    a: aiQuestion.answer,
    o: aiQuestion.options,
    explanation: aiQuestion.explanation, // bonus field for post-answer display
  };
}

/**
 * Convert AI question format → Jeopardy CATEGORIES cell format.
 * Jeopardy expects: { q, a, options }
 */
export function toJeopardyFormat(aiQuestion) {
  return {
    q:       aiQuestion.question,
    a:       aiQuestion.answer,
    options: aiQuestion.options,
    explanation: aiQuestion.explanation,
  };
}
