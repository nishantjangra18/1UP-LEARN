import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ROWS = 6;
const COLS = 7;
const EMPTY = null;

function createBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
}

function checkWinner(board) {
  // Check horizontal, vertical, diagonal
  const directions = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c]) continue;
      for (const [dr, dc] of directions) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
          if (board[nr][nc] !== board[r][c]) break;
          count++;
        }
        if (count === 4) return { winner: board[r][c], row: r, col: c, dr, dc };
      }
    }
  }
  return null;
}

// Simple AI: tries to win, then block, then random
function aiMove(board) {
  // Try winning or blocking
  for (const player of ['O', 'X']) {
    for (let c = 0; c < COLS; c++) {
      const row = getAvailableRow(board, c);
      if (row === -1) continue;
      const testBoard = board.map((r) => [...r]);
      testBoard[row][c] = player;
      if (checkWinner(testBoard)) return c;
    }
  }
  // Center preference
  const prefCols = [3, 2, 4, 1, 5, 0, 6];
  for (const c of prefCols) {
    if (getAvailableRow(board, c) !== -1) return c;
  }
  return 0;
}

function getAvailableRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) return r;
  }
  return -1;
}

export default function Connect4({ onComplete }) {
  const [board, setBoard] = useState(createBoard());
  const [currentPlayer, setCurrentPlayer] = useState('X'); // X = human, O = AI
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [hoveredCol, setHoveredCol] = useState(null);
  const [vsAI, setVsAI] = useState(true);

  const dropDisc = (col) => {
    if (winner || isDraw || (vsAI && currentPlayer === 'O')) return;

    const row = getAvailableRow(board, col);
    if (row === -1) return;

    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = currentPlayer;

    const win = checkWinner(newBoard);
    const full = newBoard.every((r) => r.every(Boolean));

    setBoard(newBoard);

    if (win) {
      setWinner(win);
      if (win.winner === 'X') onComplete?.({ score: 50, won: true });
    } else if (full) {
      setIsDraw(true);
    } else {
      const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
      setCurrentPlayer(nextPlayer);

      // AI move
      if (vsAI && nextPlayer === 'O') {
        setTimeout(() => {
          const aiCol = aiMove(newBoard);
          const aiRow = getAvailableRow(newBoard, aiCol);
          if (aiRow !== -1) {
            const aiBoard = newBoard.map((r) => [...r]);
            aiBoard[aiRow][aiCol] = 'O';
            const aiWin = checkWinner(aiBoard);
            setBoard(aiBoard);
            if (aiWin) { setWinner(aiWin); }
            else if (aiBoard.every((r) => r.every(Boolean))) { setIsDraw(true); }
            else { setCurrentPlayer('X'); }
          }
        }, 400);
      }
    }
  };

  const reset = () => {
    setBoard(createBoard());
    setCurrentPlayer('X');
    setWinner(null);
    setIsDraw(false);
  };

  // Highlight winning cells
  const winCells = winner
    ? Array.from({ length: 4 }, (_, i) => `${winner.row + winner.dr * i}-${winner.col + winner.dc * i}`)
    : [];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status */}
      <div className="font-game text-lg text-white">
        {winner
          ? winner.winner === 'X' ? '🎉 You Win!' : '🤖 AI Wins!'
          : isDraw ? "🤝 It's a Draw!"
          : currentPlayer === 'X' ? '🔴 Your Turn' : '🟡 AI Thinking...'}
      </div>

      {/* Board */}
      <div
        className="bg-blue-800 rounded-2xl p-3 shadow-2xl"
        onMouseLeave={() => setHoveredCol(null)}
      >
        {/* Column hover indicators */}
        <div className="flex mb-1">
          {Array(COLS).fill(0).map((_, c) => (
            <div key={c} className="w-11 sm:w-12 flex justify-center">
              <motion.div
                animate={{ opacity: hoveredCol === c && !winner && !isDraw ? 1 : 0 }}
                className={`text-lg ${currentPlayer === 'X' ? 'text-red-400' : 'text-yellow-400'}`}
              >
                ▼
              </motion.div>
            </div>
          ))}
        </div>

        {board.map((row, r) => (
          <div key={r} className="flex gap-1 mb-1">
            {row.map((cell, c) => {
              const cellKey = `${r}-${c}`;
              const isWinCell = winCells.includes(cellKey);
              return (
                <motion.button
                  key={c}
                  onClick={() => dropDisc(c)}
                  onMouseEnter={() => setHoveredCol(c)}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-900 flex items-center justify-center hover:bg-blue-700 transition cursor-pointer"
                  whileTap={{ scale: 0.9 }}
                >
                  {cell && (
                    <motion.div
                      initial={{ scale: 0, y: -20 }}
                      animate={{ scale: isWinCell ? [1, 1.2, 1] : 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 300, repeat: isWinCell ? Infinity : 0, duration: 0.4 }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-lg
                        ${cell === 'X' ? 'bg-red-500' : 'bg-yellow-400'}
                        ${isWinCell ? 'ring-4 ring-white' : ''}`}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition"
        >
          🔄 New Game
        </button>
        <button
          onClick={() => { setVsAI(!vsAI); reset(); }}
          className="bg-blue-700 hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition"
        >
          {vsAI ? '👥 2 Players' : '🤖 vs AI'}
        </button>
      </div>
    </div>
  );
}
