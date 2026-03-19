import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { getGame } from '../utils/games';
import FeedbackForm from '../components/FeedbackForm';
import ReviveModal from '../components/ReviveModal';

// Game components
import MemoryMatch    from '../games/MemoryMatch';
import WhackAMole     from '../games/WhackAMole';
import Connect4       from '../games/Connect4';
import Quiz           from '../games/Quiz';
import SnakeLadders   from '../games/SnakeLadders';
import FlappyBird     from '../games/FlappyBird';
import MathBlast      from '../games/MathBlast';
import WordBuilder    from '../games/WordBuilder';
import SnakeGame      from '../games/SnakeGame';
import PuzzleSolver   from '../games/PuzzleSolver';

const GAME_MAP = {
  'memory-match': MemoryMatch,
  'whack-a-mole': WhackAMole,
  'connect4':     Connect4,
  'quiz':         Quiz,
  'snake-ladders': SnakeLadders,
  'flappy-bird':  FlappyBird,
  'math-blast':   MathBlast,
  'word-builder': WordBuilder,
  'snake':        SnakeGame,
  'puzzle':       PuzzleSolver,
};

export default function GamePage() {
  const { gameId }   = useParams();
  const navigate     = useNavigate();
  const { t }        = useTranslation();
  const { onGameComplete } = useGame();

  const gameInfo    = getGame(gameId);
  const GameComponent = GAME_MAP[gameId];

  const [showRevive,  setShowRevive]  = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [gameWon,     setGameWon]     = useState(false);
  const [finalScore,  setFinalScore]  = useState(0);
  const [mountKey,    setMountKey]    = useState(0); // remount game on revive

  if (!GameComponent || !gameInfo) {
    return (
      <div className="text-center py-20 text-white">
        <div className="text-5xl mb-4">🎮</div>
        <h2 className="font-game text-3xl mb-4">Game Coming Soon!</h2>
        <button onClick={() => navigate('/games')}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold">
          Back to Games
        </button>
      </div>
    );
  }

  /* Called by game when it ends */
  const handleGameComplete = async ({ score = 0, won }) => {
    setFinalScore(score);
    if (won) {
      setGameWon(true);
      await onGameComplete({
        gameId, gameName: gameInfo.title, score,
        xpEarned: gameInfo.xpReward, coinsEarned: gameInfo.coinReward,
      });
      // Show feedback after 1.2s win animation
      setTimeout(() => setShowFeedback(true), 1200);
    } else {
      setShowRevive(true);
    }
  };

  /* Called when player answers the revival question */
  const handleReviveAnswer = (correct) => {
    setShowRevive(false);
    if (correct) {
      setMountKey((k) => k + 1);
    }
    // Wrong → nothing, game stays in game-over state
  };

  const handleFeedbackSubmit = async (fb) => {
    await onGameComplete({
      gameId, gameName: gameInfo.title, score: finalScore,
      xpEarned: 0, coinsEarned: 0,
      feedbackRating: fb.rating, feedbackText: fb.comment,
    });
    setShowFeedback(false);
    navigate('/games');
  };

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-5">
        <button onClick={() => navigate('/games')}
          className="text-slate-400 hover:text-white transition text-xl font-bold">
          ← {t('common.back')}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{gameInfo.emoji}</span>
          <div>
            <h1 className="font-game text-2xl text-white leading-tight">{gameInfo.title}</h1>
            <p className="text-slate-400 text-xs hidden sm:block">{gameInfo.description}</p>
          </div>
        </div>

        {/* Rewards */}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full font-bold hidden sm:block">
            +{gameInfo.xpReward} XP
          </span>
          <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-bold hidden sm:block">
            +{gameInfo.coinReward} 🪙
          </span>
        </div>
      </div>

      {/* ── Game container ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 rounded-3xl p-5 border border-slate-700 relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center"
      >
        <GameComponent key={mountKey} onComplete={handleGameComplete} />
      </motion.div>

      {/* ── Win overlay ── */}
      <AnimatePresence>
        {gameWon && !showFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-center"
            >
              <div className="text-8xl mb-3">🏆</div>
              <div className="font-game text-5xl text-yellow-400">{t('games.you_win')}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Revive modal ── */}
      <AnimatePresence>
        {showRevive && (
          <ReviveModal onRevive={handleReviveAnswer} />
        )}
      </AnimatePresence>

      {/* ── Feedback modal ── */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <FeedbackForm
              onSubmit={handleFeedbackSubmit}
              onSkip={() => { setShowFeedback(false); navigate('/games'); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
