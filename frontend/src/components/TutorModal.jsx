/**
 * TutorModal — AI-powered friendly tutor shown when a child answers wrong.
 *
 * Centering strategy:
 *  ┌─ Overlay ──────────────────────────────────────────────────────────┐
 *  │  fixed inset-0  flex items-center justify-center  p-6             │
 *  │  (p-6 = guaranteed gap from all screen edges on every device)     │
 *  │                                                                    │
 *  │   ┌─ Modal card ──────────────────────────────────────────────┐   │
 *  │   │  max-h-[80vh]  flex flex-col  overflow-hidden             │   │
 *  │   │                                                           │   │
 *  │   │   ── Pinned header (flex-shrink-0) ──────────────────     │   │
 *  │   │   ── Scrollable body (flex-1 min-h-0 overflow-y-auto) ─  │   │
 *  │   │   ── Pinned footer (flex-shrink-0) ──────────────────     │   │
 *  │   └───────────────────────────────────────────────────────────┘   │
 *  └────────────────────────────────────────────────────────────────────┘
 *
 * Why this works:
 *  - The overlay itself is the flexbox centering context, so the card is
 *    ALWAYS centred — no inner wrapper needed.
 *  - p-6 ensures the card is never flush against any screen edge.
 *  - max-h-[80vh] caps card height; overflow-hidden clips rounded corners.
 *  - flex-col + min-h-0 on the body lets CSS actually honour overflow-y-auto.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TutorModal({ tutorData, onClose, trackColor = 'from-purple-600 to-indigo-600' }) {
  const [practiceSelected, setPracticeSelected] = useState(null);

  if (!tutorData) return null;

  const { message, explanation, example, practiceQuestion } = tutorData;
  const pq               = practiceQuestion;
  const practiceAnswered = practiceSelected !== null;
  const practiceCorrect  = practiceSelected === pq?.answer;

  return (
    <AnimatePresence>
      {/*
        ── OVERLAY ──────────────────────────────────────────────────────────
        fixed inset-0            → covers full screen
        flex items-center        → vertical centre
        justify-center           → horizontal centre
        p-6                      → 24 px gap from ALL edges (top, bottom, sides)
                                   This is what stops the modal touching the top.
        backdrop-blur-sm         → frosted glass
        z-50                     → above everything
      */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6
                   bg-black/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/*
          ── MODAL CARD ───────────────────────────────────────────────────
          max-h-[80vh]     → hard cap: modal never exceeds 80% of screen height
          w-full max-w-md  → full width on mobile, capped at md on desktop
          flex flex-col    → enables pinned header/footer + scrollable middle
          overflow-hidden  → keeps border-radius clean on all children
        */}
        <motion.div
          initial={{ scale: 0.88, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.88, y: 24 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="bg-slate-900 rounded-3xl max-h-[80vh] w-full max-w-md
                     flex flex-col overflow-hidden
                     border border-purple-700/50 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── PINNED HEADER ──────────────────────────────────────────────
              flex-shrink-0 → never shrinks; always fully visible at top    */}
          <div className="flex-shrink-0 flex items-start gap-3
                          px-5 pt-5 pb-4 border-b border-slate-700/60">
            <span className="text-4xl leading-none mt-0.5 select-none">🤖</span>

            <div className="flex-1 min-w-0">
              <p className="font-game text-purple-300 text-xs uppercase tracking-wide mb-0.5">
                AI Tutor
              </p>
              <p className="text-white font-bold text-sm leading-snug">{message}</p>
            </div>

            {/* Always-visible close button */}
            <button
              onClick={onClose}
              aria-label="Close tutor"
              className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600
                         text-slate-400 hover:text-white flex items-center justify-center
                         text-xs font-bold transition-colors ml-1"
            >
              ✕
            </button>
          </div>

          {/* ── SCROLLABLE BODY ────────────────────────────────────────────
              flex-1          → takes all space between header and footer
              min-h-0         → CRITICAL: without this, flex children ignore
                                overflow-y-auto and the card grows unbounded
              overflow-y-auto → scrollbar appears only when content overflows
              scroll-smooth   → smooth trackpad / keyboard scrolling           */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth
                          px-5 py-4 flex flex-col gap-3">

            {/* Explanation */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <p className="text-xs text-purple-400 font-bold uppercase tracking-wide mb-1.5">
                💡 Explanation
              </p>
              <p className="text-slate-200 text-sm leading-relaxed">{explanation}</p>
            </div>

            {/* Memory trick / real-life example */}
            {example && (
              <div className="bg-amber-900/30 rounded-2xl p-4 border border-amber-700/40">
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wide mb-1.5">
                  🌟 Remember This
                </p>
                <p className="text-amber-100 text-sm leading-relaxed">{example}</p>
              </div>
            )}

            {/* Practice question */}
            {pq && (
              <div className="border border-slate-700 rounded-2xl p-4">
                <p className="text-xs text-green-400 font-bold uppercase tracking-wide mb-2">
                  🎯 Try This One!
                </p>
                <p className="text-white font-semibold text-sm mb-3">{pq.question}</p>

                <div className="flex flex-col gap-2">
                  {pq.options.map((opt) => {
                    let cls = 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600';
                    if (practiceAnswered) {
                      if (opt === pq.answer)             cls = 'bg-green-600 text-white border border-green-500';
                      else if (opt === practiceSelected)  cls = 'bg-red-700  text-white border border-red-500';
                      else                               cls = 'bg-slate-800 text-slate-500 border border-slate-700';
                    }
                    return (
                      <button
                        key={opt}
                        onClick={() => !practiceAnswered && setPracticeSelected(opt)}
                        disabled={practiceAnswered}
                        className={`text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-colors ${cls}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {practiceAnswered && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 text-sm font-bold text-center
                      ${practiceCorrect ? 'text-green-400' : 'text-orange-400'}`}
                  >
                    {practiceCorrect
                      ? '🎉 You got it! Great job!'
                      : `Almost! The answer is: ${pq.answer} — you've got this! 💪`}
                  </motion.p>
                )}
              </div>
            )}
          </div>

          {/* ── PINNED FOOTER ──────────────────────────────────────────────
              flex-shrink-0 → always visible at the bottom                    */}
          <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-slate-700/60">
            <button
              onClick={onClose}
              className={`w-full py-3 rounded-2xl font-game text-white text-base
                          bg-gradient-to-r ${trackColor}
                          hover:brightness-110 active:scale-95 transition`}
            >
              {practiceAnswered ? 'Keep Going! →' : 'Got it, continue →'}
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
