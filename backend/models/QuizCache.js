/**
 * QuizCache — MongoDB model for caching AI-generated questions.
 *
 * Cache key format: "<topic>_<difficulty>_<age>_<count>"
 * Documents auto-expire after 24 hours via MongoDB TTL index.
 *
 * This reduces OpenAI API costs by reusing questions when the same
 * topic + difficulty + age combination is requested multiple times.
 */

const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    question:    { type: String, required: true },
    options:     { type: [String], required: true },
    answer:      { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const QuizCacheSchema = new mongoose.Schema({
  // Unique lookup key — combination of all generation parameters
  cacheKey: { type: String, required: true, unique: true, index: true },

  // Stored questions from AI
  questions: { type: [QuestionSchema], required: true },

  // Metadata (useful for debugging / analytics)
  topic:      { type: String },
  difficulty: { type: String },
  age:        { type: Number },
  gameType:   { type: String },

  // TTL field — MongoDB will delete this document 24 h after creation
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 h from now
    index: { expires: 0 }, // TTL index: delete when current time >= expiresAt
  },
});

module.exports = mongoose.model('QuizCache', QuizCacheSchema);
