/**
 * AI Service — wraps Google Gemini to generate quiz questions.
 *
 * Responsibilities:
 *  1. Build age-appropriate, topic-specific prompts
 *  2. Call Gemini generateContent API
 *  3. Strictly parse and validate the JSON response
 *  4. Surface a clean error so the controller can serve a fallback
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Lazy singleton — instantiated on first use so a missing env var
// doesn't crash the server; it surfaces as a clean 503 instead.
let _client = null;
function getClient() {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.startsWith('your_')) {
      throw new Error('GEMINI_API_KEY is not configured in .env');
    }
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Difficulty descriptions used inside the prompt
// ─────────────────────────────────────────────────────────────────────────────
const DIFFICULTY_GUIDE = {
  easy:   'very simple concepts, short sentences, straightforward answers',
  medium: 'slightly more detailed concepts, some reasoning required',
  hard:   'deeper understanding, multi-step thinking, less obvious answers',
};

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────────────────────
function buildPrompt({ topic, difficulty, age, gameType, count, avoidQuestions = [] }) {
  const diffDesc = DIFFICULTY_GUIDE[difficulty] || DIFFICULTY_GUIDE.easy;
  const avoidSection =
    avoidQuestions.length > 0
      ? `\nDo NOT repeat any of these questions that were already asked:\n${avoidQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

  return `You are a fun, friendly quiz writer for a kids' educational game called "1up Learn".
Generate exactly ${count} unique multiple-choice questions about "${topic}" for children who are ${age} years old.

Difficulty level: ${difficulty} — ${diffDesc}
Game type: ${gameType}
${avoidSection}

Rules:
- Use simple, cheerful, age-appropriate language (no jargon)
- Each question must have exactly 4 answer options
- Exactly ONE option must be correct
- The "answer" field must exactly match one of the strings in "options"
- Include a short, encouraging explanation (1–2 sentences) of the correct answer
- Keep questions educational, accurate, and engaging
- Vary the question style (who/what/where/why/how)

Return ONLY a valid JSON object — no markdown, no code fences, no extra text — in this exact format:
{
  "questions": [
    {
      "question": "Question text ending with a question mark?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Short explanation why this is correct."
    }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validate a parsed questions array
// ─────────────────────────────────────────────────────────────────────────────
function validateQuestions(questions) {
  if (!Array.isArray(questions)) return false;
  return questions.every(
    (q) =>
      typeof q.question === 'string' &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.answer === 'string' &&
      q.options.includes(q.answer) &&
      typeof q.explanation === 'string'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — generate questions via Gemini
// ─────────────────────────────────────────────────────────────────────────────
async function generateQuestions({ topic, difficulty, age, gameType, count = 5, avoidQuestions = [] }) {
  const prompt = buildPrompt({ topic, difficulty, age, gameType, count, avoidQuestions });

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      // Disable thinking mode — quiz generation doesn't need deep reasoning,
      // and this cuts latency from ~10s down to ~2-3s
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text()?.trim();
  if (!raw) throw new Error('Empty response from Gemini');

  // Strip accidental markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  const questions = parsed.questions;
  if (!validateQuestions(questions)) {
    throw new Error('Gemini response failed validation — missing fields or wrong structure');
  }

  return questions.slice(0, count);
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Tutor — explain a wrong answer to a child in a friendly way
// ─────────────────────────────────────────────────────────────────────────────
async function explainAnswer({ question, correctAnswer, userAnswer, topic, age }) {
  const prompt = `You are a child-friendly AI tutor for kids aged 5–10.
A child answered a quiz question incorrectly. Help them understand the concept.

Question: ${question}
Correct Answer: ${correctAnswer}
Child's Answer: ${userAnswer}
Topic: ${topic}
Child's Age: ${age}

Instructions:
- Be friendly, encouraging, and positive
- Do NOT use the word "wrong" in a harsh way
- Explain the concept in very simple, fun language a ${age}-year-old can understand
- Use a real-life example, visual, or small trick to help them remember
- Keep explanation short (2–4 lines max)
- After explanation, create 1 similar practice question to reinforce learning
- Keep tone fun and motivating — use emojis sparingly

Return ONLY valid JSON — no markdown, no extra text:
{
  "message": "A short encouraging opener (e.g. 'Great try! Let me explain…')",
  "explanation": "Simple 2-4 line explanation of the concept",
  "example": "A real-life example or memory trick",
  "practiceQuestion": {
    "question": "A similar practice question?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A"
  }
}`;

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text()?.trim();
  if (!raw) throw new Error('Empty tutor response from Gemini');

  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Tutor response is not valid JSON');
  }

  // Basic validation
  if (!parsed.message || !parsed.explanation || !parsed.practiceQuestion?.question) {
    throw new Error('Tutor response missing required fields');
  }

  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Rival — generate a competitive character based on user performance
// ─────────────────────────────────────────────────────────────────────────────
async function generateRival({ score, accuracy, gameType, topic, maxScore }) {
  const prompt = `You are an AI game rival generator for a kids' gamified learning app called "1up Learn" for children aged 5–10.

Create a fun rival character who just competed in the same quiz as the child.

User's performance:
- Score: ${score} out of ${maxScore}
- Accuracy: ${accuracy}%
- Game type: ${gameType}
- Topic: ${topic}

Rules for the rival:
- Generate a creative, fun character name (can be a robot, wizard, alien, animal — keep it kid-friendly)
- Generate a rival score that is CLOSE to the user's score — sometimes slightly higher, sometimes slightly lower (within 10–20% of maxScore)
- If user scored very high (>80%) → rival can win or tie, to keep it challenging
- If user scored low (<40%) → rival scores a bit higher, to motivate improvement
- Otherwise → rival scores within ±15% of user score, randomly above or below
- The message must be SHORT (1–2 sentences), playful, competitive but NEVER mean
- Use fun emojis in the message
- Personality: one of [cocky, nerdy, sporty, mysterious, bubbly, wise, cheeky]

Return ONLY valid JSON — no markdown, no extra text:
{
  "rival": {
    "name": "Fun character name",
    "score": <number>,
    "message": "Short fun competitive message with emojis",
    "personality": "one of the personality types",
    "emoji": "one emoji that represents the character"
  }
}`;

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.9,   // higher creativity for character names
      maxOutputTokens: 300,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text()?.trim();
  if (!raw) throw new Error('Empty rival response from Gemini');

  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Rival response is not valid JSON');
  }

  const rival = parsed.rival;
  if (!rival?.name || rival?.score == null || !rival?.message) {
    throw new Error('Rival response missing required fields');
  }

  // Clamp score to valid range
  rival.score = Math.min(Math.max(Math.round(Number(rival.score)), 0), maxScore);
  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Chat Tutor — answer any freeform question from a child
// ─────────────────────────────────────────────────────────────────────────────
async function chatWithTutor({ question, age }) {
  const prompt = `You are a friendly AI tutor for children aged 5–10 called "Buddy".
Answer the child's question in very simple, fun, and encouraging language.
Avoid complex words. Use short sentences. Add a touch of excitement!

Child's age: ${age}
Child's question: "${question}"

Return ONLY valid JSON — no markdown, no extra text:
{
  "answer": "A clear, simple 2-3 sentence answer a ${age}-year-old will understand",
  "example": "A short real-life or fun example to make it concrete (1-2 sentences)",
  "funFact": "One surprising fun fact related to the topic (start with 'Did you know...')",
  "followUpQuestion": "A curiosity-sparking follow-up question to keep the child exploring"
}`;

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 600,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text()?.trim();
  if (!raw) throw new Error('Empty chat response from Gemini');

  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Chat response is not valid JSON: ${cleaned.slice(0, 200)}`);
  }

  console.log('[AI Chat] raw parsed keys:', Object.keys(parsed));

  // Normalize: Gemini may return snake_case even when prompted for camelCase
  const normalized = {
    answer:           parsed.answer            || parsed.Answer            || '',
    example:          parsed.example           || parsed.Example           || '',
    funFact:          parsed.funFact           || parsed.fun_fact          || parsed.FunFact    || '',
    followUpQuestion: parsed.followUpQuestion  || parsed.follow_up_question || parsed.followUp  || '',
  };

  if (!normalized.answer) {
    throw new Error(`Chat response missing "answer" field. Keys received: ${Object.keys(parsed).join(', ')}`);
  }

  return normalized;
}

module.exports = { generateQuestions, explainAnswer, generateRival, chatWithTutor };
