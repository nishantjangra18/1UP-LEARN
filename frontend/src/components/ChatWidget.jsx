/**
 * ChatWidget — "Ask Me Anything" AI Tutor for 1up Learn.
 *
 * Default mode: TUTOR
 *   Child can ask any question ("Why is the sky blue?", "What is gravity?")
 *   → calls POST /api/quiz/chat → renders a rich TutorAnswer card
 *
 * Smart mode: QUIZ (activated when child says "quiz me on X")
 *   → calls POST /api/quiz/generate → renders an MCQ card
 *   → reverts to tutor mode after the question is answered
 *
 * Layout:
 *  ┌─ Floating button (fixed bottom-right) ──────────────┐
 *  │  Opens chat window above it on click                │
 *  │  ┌─ Chat window w-80 h-[500px] ─────────────────┐  │
 *  │  │  Header | Body (scrollable) | Footer (input)  │  │
 *  │  └───────────────────────────────────────────────┘  │
 *  └─────────────────────────────────────────────────────┘
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { fetchTutorChat, fetchQuizQuestions } from '../services/quizService';

// ─── Quiz mode detection ─────────────────────────────────────────────────────
// Words that signal the child wants quiz mode
const QUIZ_TRIGGERS = [
  'quiz me', 'test me', 'ask me questions', 'give me a question',
  'questions about', 'challenge me', 'practice questions',
];

// Topic keywords for quiz mode
const TOPIC_KEYWORDS = {
  math:      ['math', 'maths', 'addition', 'subtract', 'multiply', 'divide', 'number', 'calculate', 'algebra'],
  science:   ['science', 'biology', 'chemistry', 'physics', 'animals', 'plants', 'space', 'earth', 'nature'],
  history:   ['history', 'historical', 'war', 'president', 'king', 'queen', 'century', 'empire'],
  english:   ['english', 'grammar', 'vocabulary', 'spelling', 'reading', 'writing', 'poem', 'story'],
  geography: ['geography', 'country', 'countries', 'capital', 'continent', 'ocean', 'river', 'mountain'],
};

function detectTopic(text) {
  const lower = text.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return topic;
  }
  return null;
}

function isQuizRequest(text) {
  const lower = text.toLowerCase();
  return QUIZ_TRIGGERS.some((t) => lower.includes(t));
}

// ─── Greeting ────────────────────────────────────────────────────────────────
const GREETING = {
  id:   0,
  role: 'bot',
  type: 'bubble',
  text: "Hi! I'm Buddy, your AI tutor! 👋\n\nAsk me ANYTHING — \"Why is the sky blue?\", \"What is gravity?\", \"How do volcanoes work?\" 🌋\n\nI'll explain it in a fun way just for you! 🚀",
};

// ─── ID generator ────────────────────────────────────────────────────────────
let _id = 1;
const nextId = () => _id++;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Plain chat bubble */
function Bubble({ msg }) {
  const isBot = msg.role === 'bot';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}
    >
      {isBot && <span className="text-xl mr-2 mt-0.5 flex-shrink-0 select-none">🤖</span>}
      <div
        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isBot
            ? 'bg-slate-700 text-slate-100 rounded-tl-sm'
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm'
          }`}
      >
        {msg.text}
      </div>
    </motion.div>
  );
}

/**
 * Rich tutor answer card — shows answer, example, fun fact, and a
 * clickable follow-up question.
 */
function TutorAnswerCard({ msg, onFollowUp }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <span className="text-xl mr-2 mt-0.5 flex-shrink-0 select-none">🤖</span>

      <div className="max-w-[90%] bg-slate-700 rounded-2xl rounded-tl-sm p-3 space-y-2.5">
        {/* Answer */}
        <div>
          <p className="text-xs text-purple-400 font-bold uppercase tracking-wide mb-1">💡 Answer</p>
          <p className="text-sm text-white leading-snug">{msg.answer}</p>
        </div>

        {/* Example */}
        {msg.example && (
          <div className="bg-amber-900/30 rounded-xl px-3 py-2 border border-amber-700/30">
            <p className="text-xs text-amber-400 font-bold uppercase tracking-wide mb-0.5">🌟 Example</p>
            <p className="text-xs text-amber-100 leading-snug">{msg.example}</p>
          </div>
        )}

        {/* Fun fact */}
        {msg.funFact && (
          <div className="bg-cyan-900/30 rounded-xl px-3 py-2 border border-cyan-700/30">
            <p className="text-xs text-cyan-400 font-bold uppercase tracking-wide mb-0.5">🎉 Fun Fact</p>
            <p className="text-xs text-cyan-100 leading-snug">{msg.funFact}</p>
          </div>
        )}

        {/* Follow-up question — clickable suggestion */}
        {msg.followUpQuestion && !msg.followUpUsed && (
          <button
            onClick={() => onFollowUp(msg.id, msg.followUpQuestion)}
            className="w-full text-left text-xs text-slate-300 bg-slate-600 hover:bg-slate-500
                       rounded-xl px-3 py-2 border border-slate-500 transition-colors"
          >
            <span className="text-green-400 font-bold">🔍 </span>
            {msg.followUpQuestion}
          </button>
        )}
        {msg.followUpUsed && (
          <p className="text-xs text-slate-500 italic">{msg.followUpQuestion}</p>
        )}
      </div>
    </motion.div>
  );
}

/** MCQ quiz question card */
function QuestionCard({ msg, onAnswer }) {
  const { question, options, answered, selected, correctAnswer, explanation } = msg;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <span className="text-xl mr-2 mt-0.5 flex-shrink-0 select-none">🤖</span>
      <div className="max-w-[90%] bg-slate-700 rounded-2xl rounded-tl-sm p-3 space-y-2.5">
        <p className="text-xs text-purple-400 font-bold uppercase tracking-wide">🎯 Quiz Time!</p>
        <p className="text-sm text-white font-semibold leading-snug">{question}</p>

        <div className="flex flex-col gap-1.5">
          {options.map((opt) => {
            let cls = 'bg-slate-600 hover:bg-slate-500 text-white border border-slate-500';
            if (answered) {
              if (opt === correctAnswer)      cls = 'bg-green-600 text-white border border-green-500';
              else if (opt === selected)      cls = 'bg-red-700 text-white border border-red-500';
              else                           cls = 'bg-slate-800 text-slate-500 border border-slate-700';
            }
            return (
              <button
                key={opt}
                onClick={() => !answered && onAnswer(msg.id, opt)}
                disabled={answered}
                className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-1 border-t border-slate-600 space-y-1"
          >
            <p className={`text-xs font-bold ${selected === correctAnswer ? 'text-green-400' : 'text-orange-400'}`}>
              {selected === correctAnswer ? '🎉 Correct! Amazing!' : `❌ Answer: ${correctAnswer}`}
            </p>
            {explanation && (
              <p className="text-xs text-slate-300 leading-relaxed">💡 {explanation}</p>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/** Animated typing indicator */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex justify-start items-end gap-2"
    >
      <span className="text-xl select-none">🤖</span>
      <div className="bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5">
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.span
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full block"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main widget
// ─────────────────────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const { user } = useAuth();
  const age = user?.age || 8;

  const [isOpen,   setIsOpen]   = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Quiz mode: remembers topic so "next" keeps quizzing
  const quizTopic = useRef(null);

  const bodyRef  = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new messages / loading change
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  // ── Message helpers ────────────────────────────────────────────────────────
  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: nextId(), ...msg }]);
  }, []);

  const updateMessage = useCallback((id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // ── Fetch tutor answer ─────────────────────────────────────────────────────
  const askTutor = useCallback(async (question) => {
    setLoading(true);
    try {
      const data = await fetchTutorChat({ question, age });
      addMessage({
        role:             'bot',
        type:             'tutor',
        answer:           data.answer,
        example:          data.example,
        funFact:          data.funFact,
        followUpQuestion: data.followUpQuestion,
        followUpUsed:     false,
      });
    } catch (err) {
      console.error('[ChatWidget] askTutor failed:', err?.response?.data || err?.message || err);
      addMessage({
        role: 'bot',
        type: 'bubble',
        text: "Hmm, I couldn't think of an answer right now! 😅 Try asking again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  }, [age, addMessage]);

  // ── Fetch quiz question ────────────────────────────────────────────────────
  const askQuizQuestion = useCallback(async (topic) => {
    setLoading(true);
    try {
      const data = await fetchQuizQuestions({ topic, difficulty: 'easy', age, gameType: 'mcq', count: 1 });
      const q = data?.questions?.[0];
      if (!q) throw new Error('No question');
      addMessage({
        role:          'bot',
        type:          'question',
        question:      q.question,
        options:       q.options,
        correctAnswer: q.answer,
        explanation:   q.explanation,
        answered:      false,
        selected:      null,
      });
    } catch {
      addMessage({ role: 'bot', type: 'bubble', text: "Couldn't fetch a question right now! 😅 Try again." });
    } finally {
      setLoading(false);
    }
  }, [age, addMessage]);

  // ── Handle clicking the follow-up question suggestion ─────────────────────
  const handleFollowUp = useCallback((msgId, question) => {
    updateMessage(msgId, { followUpUsed: true });
    addMessage({ role: 'user', type: 'bubble', text: question });
    askTutor(question);
  }, [updateMessage, addMessage, askTutor]);

  // ── Handle selecting an MCQ answer ────────────────────────────────────────
  const handleAnswer = useCallback((msgId, selected) => {
    updateMessage(msgId, { answered: true, selected });
    quizTopic.current = null; // exit quiz mode after one question

    setTimeout(() => {
      addMessage({
        role: 'bot',
        type: 'bubble',
        text: "Great effort! 🌟 Want to ask me anything? Or say \"quiz me on math\" for another question!",
      });
    }, 900);
  }, [updateMessage, addMessage]);

  // ── Handle sending a message ───────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    addMessage({ role: 'user', type: 'bubble', text });

    const lower = text.toLowerCase();

    // "next" shortcut in quiz mode
    if (['next', 'next one', 'another', 'more', 'again'].includes(lower) && quizTopic.current) {
      await askQuizQuestion(quizTopic.current);
      return;
    }

    // Quiz mode trigger
    const isQuiz = isQuizRequest(text);
    const topic  = detectTopic(text);

    if (isQuiz && topic) {
      quizTopic.current = topic;
      addMessage({ role: 'bot', type: 'bubble', text: `Let me think of a ${topic} question for you! 🤔` });
      await askQuizQuestion(topic);
      return;
    }

    if (isQuiz && !topic) {
      quizTopic.current = null;
      addMessage({
        role: 'bot',
        type: 'bubble',
        text: "Sure! Which subject?\n• Math\n• Science\n• History\n• English\n• Geography\n\nTell me and I'll quiz you! 🎯",
      });
      return;
    }

    // Topic-only (e.g. "math") without quiz trigger → treat as tutor question
    // Default: answer as a tutor
    await askTutor(text);
  }, [input, loading, addMessage, askTutor, askQuizQuestion]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Only show widget for logged-in users
  if (!user) return null;

  return (
    <>
      {/* ── CHAT WINDOW ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.85, y: 20  }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50
                       w-80 h-[500px] flex flex-col
                       bg-slate-900 rounded-3xl shadow-2xl
                       border border-purple-700/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-2.5
                            px-4 py-3 border-b border-slate-700/60
                            bg-gradient-to-r from-purple-700/60 to-indigo-700/60">
              <motion.span
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                className="text-2xl select-none"
              >
                🤖
              </motion.span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-game text-sm leading-none">Ask Me Anything 🤖</p>
                <p className="text-purple-300 text-xs mt-0.5">AI Tutor Buddy</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600
                           text-slate-400 hover:text-white flex items-center justify-center
                           text-xs font-bold transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Scrollable message body */}
            <div
              ref={bodyRef}
              className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-3.5 py-3 flex flex-col gap-3"
            >
              {messages.map((msg) => {
                if (msg.type === 'tutor')    return <TutorAnswerCard key={msg.id} msg={msg} onFollowUp={handleFollowUp} />;
                if (msg.type === 'question') return <QuestionCard    key={msg.id} msg={msg} onAnswer={handleAnswer} />;
                return <Bubble key={msg.id} msg={msg} />;
              })}

              <AnimatePresence>
                {loading && <TypingIndicator key="typing" />}
              </AnimatePresence>
            </div>

            {/* Input footer */}
            <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-slate-700/60">
              <div className="flex gap-2 items-center
                              bg-slate-800 rounded-2xl px-3 py-2
                              border border-slate-700 focus-within:border-purple-500
                              transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything…"
                  disabled={loading}
                  className="flex-1 bg-transparent text-white text-sm placeholder-slate-500
                             outline-none min-w-0 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  aria-label="Send"
                  className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center
                             bg-gradient-to-r from-purple-600 to-indigo-600
                             hover:brightness-110 active:scale-95 transition
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-slate-600 text-[10px] mt-1.5">Powered by Gemini AI ✨</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLOATING BUTTON ──────────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close chat' : 'Open AI Tutor'}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-5 right-4 sm:right-6 z-50
                   w-14 h-14 rounded-full shadow-2xl
                   bg-gradient-to-br from-purple-600 to-indigo-600
                   flex items-center justify-center
                   border-2 border-purple-400/40"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate:   0, opacity: 1 }}
              exit={{   rotate:  90, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="text-white text-xl font-bold select-none"
            >
              ✕
            </motion.span>
          ) : (
            <motion.span
              key="robot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate:  0, opacity: 1 }}
              exit={{   rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="text-2xl select-none"
            >
              🤖
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring — only when closed */}
        {!isOpen && (
          <motion.span
            className="absolute inset-0 rounded-full bg-purple-500"
            animate={{ scale: [1, 1.55], opacity: [0.45, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </motion.button>
    </>
  );
}
