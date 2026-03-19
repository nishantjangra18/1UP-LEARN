/**
 * AI Service — wraps DeepSeek (via OpenAI SDK) to generate quiz questions.
 *
 * Responsibilities:
 *  1. Build age-appropriate, topic-specific prompts
 *  2. Call DeepSeek API
 *  3. Strictly parse and validate the JSON response
 *  4. Surface a clean error so the controller can serve a fallback
 */

const OpenAI = require('openai');

// Singleton instance setup
let _client = null;
function getClient() {
  if (!_client) {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error('DEEPSEEK_API_KEY is not configured in .env');
    }
    _client = new OpenAI({
      apiKey: key,
      baseURL: 'https://api.deepseek.com' // DeepSeek API endpoint
    });
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
function buildSystemPrompt() {
  return `You are a fun, friendly quiz writer for a kids' educational game called "1up Learn".
Your goal is to generate age-appropriate, educational, and engaging multiple-choice questions for children.`;
}

function buildUserPrompt({ topic, difficulty, age, gameType, count, avoidQuestions = [] }) {
  const diffDesc = DIFFICULTY_GUIDE[difficulty] || DIFFICULTY_GUIDE.easy;
  const avoidSection =
    avoidQuestions.length > 0
      ? `\nDo NOT repeat any of these questions that were already asked:\n${avoidQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

  return `Generate exactly ${count} unique multiple-choice questions about "${topic}" for children who are ${age} years old.

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

Return ONLY a valid JSON object in this exact format:
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
// Main export — generate questions via DeepSeek
// ─────────────────────────────────────────────────────────────────────────────
async function generateQuestions({ topic, difficulty, age, gameType, count = 5, avoidQuestions = [] }) {
  const client = getClient();
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt({ topic, difficulty, age, gameType, count, avoidQuestions }) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 2048
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    if (!parsed.questions || !validateQuestions(parsed.questions)) {
      throw new Error('DeepSeek response failed validation format');
    }

    return parsed.questions.slice(0, count);
  } catch (err) {
    console.error('[AI Service] DeepSeek Error:', err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Tutor — explain a wrong answer to a child
// ─────────────────────────────────────────────────────────────────────────────
async function explainAnswer({ question, correctAnswer, userAnswer, topic, age }) {
  const client = getClient();
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const userPrompt = `A child aged ${age} answered a quiz question incorrectly. Help them understand!

Question: ${question}
Correct Answer: ${correctAnswer}
Child's Answer: ${userAnswer}
Topic: ${topic}

Instructions:
- Be friendly, encouraging, and positive
- Explain the concept in very simple language for a ${age}-year-old
- Use a real-life example or memory trick
- Create 1 similar practice question with 4 options.

Return ONLY valid JSON:
{
  "message": "Enthusiastic opener",
  "explanation": "Simple explanation",
  "example": "Real-life application",
  "practiceQuestion": {
    "question": "New question?",
    "options": ["A", "B", "C", "D"],
    "answer": "A"
  }
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a warm, helpful AI tutor for young children.' },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('[AI Tutor] DeepSeek Error:', err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Rival
// ─────────────────────────────────────────────────────────────────────────────
async function generateRival({ score, accuracy, gameType, topic, maxScore }) {
  const client = getClient();
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const userPrompt = `Create a fun rival character for a kids' quiz.
User Score: ${score}/${maxScore} (${accuracy}%).
Topic: ${topic}.

Rules:
- Rival score should be close to user (±15%).
- Rival name should be something fun like "Pixel Rex" or "Star Wizard".
- Message should be playful and SHORT (1-2 sentences).

Return ONLY valid JSON:
{
  "rival": {
    "name": "...",
    "score": 0,
    "message": "...",
    "personality": "...",
    "emoji": "..."
  }
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are an AI rival character generator for a children\'s game.' },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    // Clamp score
    if (parsed.rival) {
      parsed.rival.score = Math.min(Math.max(Math.round(Number(parsed.rival.score)), 0), maxScore);
    }
    return parsed;
  } catch (err) {
    console.error('[AI Rival] DeepSeek Error:', err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Chat Tutor
// ─────────────────────────────────────────────────────────────────────────────
async function chatWithTutor({ question, age }) {
  const client = getClient();
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const userPrompt = `Child (${age}): "${question}"

Instructions:
- Simple, fun 2-3 sentence answer.
- Short real-life example.
- One surprising fun fact.

Return ONLY valid JSON:
{
  "answer": "...",
  "example": "...",
  "funFact": "...",
  "followUpQuestion": "..."
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a friendly AI tutor called Buddy.' },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('[AI Chat] DeepSeek Error:', err.message);
    throw err;
  }
}

module.exports = { generateQuestions, explainAnswer, generateRival, chatWithTutor };
