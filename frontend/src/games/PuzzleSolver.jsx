import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Image-based 3×3 Sliding Puzzle (8-puzzle)
 * ─────────────────────────────────────────
 * Tiles are indices 0–8; tile value 8 = blank.
 * Solved state: tiles[i] === i for all i.
 * Shuffle uses random valid moves from solved state → always solvable.
 */

const SIZE       = 3;
const TILE_COUNT = SIZE * SIZE;
const BLANK      = TILE_COUNT - 1;   // value 8 = the hole
const BOARD_PX   = 294;              // 3 × 98px tiles
const TILE_PX    = BOARD_PX / SIZE;  // 98px

// ── Public folder images (1.png – 8.png) ─────────────────────────────────
const PUBLIC_IMAGES = [
  { label: '🖼️ Image 1', url: '/1.png' },
  { label: '🖼️ Image 2', url: '/2.png' },
  { label: '🖼️ Image 3', url: '/3.png' },
  { label: '🖼️ Image 4', url: '/4.png' },
  { label: '🖼️ Image 5', url: '/5.png' },
  { label: '🖼️ Image 6', url: '/6.png' },
  { label: '🖼️ Image 7', url: '/7.png' },
  { label: '🖼️ Image 8', url: '/8.png' },
];

/** Pick a random image index */
function randomImageIdx() {
  return Math.floor(Math.random() * PUBLIC_IMAGES.length);
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Returns valid neighbour grid-indices of `idx` (up/down/left/right) */
function neighbours(idx) {
  const row = Math.floor(idx / SIZE);
  const col = idx % SIZE;
  const n   = [];
  if (row > 0)        n.push(idx - SIZE);
  if (row < SIZE - 1) n.push(idx + SIZE);
  if (col > 0)        n.push(idx - 1);
  if (col < SIZE - 1) n.push(idx + 1);
  return n;
}

/**
 * Generates a solvable shuffle by making `steps` random legal moves
 * from the solved state. Retries if result happens to be solved.
 */
function makeShuffle(steps = 180) {
  const tiles    = Array.from({ length: TILE_COUNT }, (_, i) => i);
  let   blankIdx = BLANK;
  let   prev     = -1;

  for (let i = 0; i < steps; i++) {
    const ns   = neighbours(blankIdx).filter(n => n !== prev);
    const next = ns[Math.floor(Math.random() * ns.length)];
    [tiles[blankIdx], tiles[next]] = [tiles[next], tiles[blankIdx]];
    prev     = blankIdx;
    blankIdx = next;
  }

  if (tiles.every((t, i) => t === i)) return makeShuffle(steps);
  return tiles;
}

function isSolved(tiles) {
  return tiles.every((t, i) => t === i);
}

// ── Component ─────────────────────────────────────────────────────────────
export default function PuzzleSolver({ onComplete }) {
  // Random image selected at game start
  const [imgIdx,    setImgIdx]    = useState(() => randomImageIdx());
  const [imageUrl,  setImageUrl]  = useState(() => PUBLIC_IMAGES[randomImageIdx()].url);
  const [imgReady,  setImgReady]  = useState(false);
  const [tiles,     setTiles]     = useState(() => makeShuffle());
  const [moves,     setMoves]     = useState(0);
  const [solved,    setSolved]    = useState(false);
  const [peeking,   setPeeking]   = useState(false);
  const [showNums,  setShowNums]  = useState(false);
  const [scoreSent, setScoreSent] = useState(false);

  // Drag state
  const dragOrigin = useRef(null); // { x, y, gridPos }
  const peekTimer  = useRef(null);

  // ── Preload / reload image ──────────────────────────────────────────────
  useEffect(() => {
    setImgReady(false);
    const img   = new Image();
    img.onload  = () => setImgReady(true);
    img.onerror = () => setImgReady(true);
    img.src     = imageUrl;
  }, [imageUrl]);

  // ── Move a tile (shared by click and drag) ──────────────────────────────
  const tryMove = useCallback((gridPos) => {
    if (solved) return;
    const blankPos = tiles.indexOf(BLANK);

    const row  = Math.floor(gridPos  / SIZE);
    const col  = gridPos  % SIZE;
    const bRow = Math.floor(blankPos / SIZE);
    const bCol = blankPos % SIZE;
    const adj  = (Math.abs(row - bRow) === 1 && col === bCol) ||
                 (Math.abs(col - bCol) === 1 && row === bRow);
    if (!adj) return;

    const next     = [...tiles];
    [next[blankPos], next[gridPos]] = [next[gridPos], next[blankPos]];
    const newMoves = moves + 1;
    setTiles(next);
    setMoves(newMoves);

    if (isSolved(next)) {
      setSolved(true);
      if (!scoreSent) {
        setScoreSent(true);
        const score = Math.max(50, 1000 - newMoves * 4);
        setTimeout(() => onComplete?.({ score, won: true }), 900);
      }
    }
  }, [tiles, moves, solved, scoreSent, onComplete]);

  // ── Drag handlers ────────────────────────────────────────────────────────
  const handlePointerDown = (e, gridPos) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = { x: e.clientX, y: e.clientY, gridPos };
  };

  const handlePointerUp = (e, gridPos) => {
    if (!dragOrigin.current || dragOrigin.current.gridPos !== gridPos) return;
    const dx = e.clientX - dragOrigin.current.x;
    const dy = e.clientY - dragOrigin.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 6) {
      // Short movement = click
      tryMove(gridPos);
    } else {
      // Drag: figure out intended direction
      const blankPos = tiles.indexOf(BLANK);
      const bRow = Math.floor(blankPos / SIZE);
      const bCol = blankPos % SIZE;
      const row  = Math.floor(gridPos  / SIZE);
      const col  = gridPos  % SIZE;

      // Only allow drag if this tile is adjacent to blank
      const sameRow = row === bRow;
      const sameCol = col === bCol;

      if (sameRow && !sameCol) {
        // Horizontal move — check if drag direction matches blank side
        const dragRight = dx > 0;
        if ((dragRight && bCol > col) || (!dragRight && bCol < col)) {
          tryMove(gridPos);
        }
      } else if (sameCol && !sameRow) {
        // Vertical move — check if drag direction matches blank side
        const dragDown = dy > 0;
        if ((dragDown && bRow > row) || (!dragDown && bRow < row)) {
          tryMove(gridPos);
        }
      }
    }
    dragOrigin.current = null;
  };

  // ── Game actions ────────────────────────────────────────────────────────
  const startFresh = useCallback((url, idx) => {
    setImageUrl(url);
    setImgIdx(idx);
    setTiles(makeShuffle());
    setMoves(0);
    setSolved(false);
    setScoreSent(false);
    setPeeking(false);
    clearTimeout(peekTimer.current);
  }, []);

  const pickRandomImage = () => {
    const idx = randomImageIdx();
    startFresh(PUBLIC_IMAGES[idx].url, idx);
  };

  const handlePeek = () => {
    if (peeking) return;
    setPeeking(true);
    clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeeking(false), 2000);
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const blankPos   = tiles.indexOf(BLANK);
  const adjToBlank = new Set(neighbours(blankPos));
  const score      = Math.max(50, 1000 - moves * 4);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 w-full select-none">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 text-sm font-bold">
        <span className="text-yellow-400">🎯 Moves: {moves}</span>
        {!solved && moves > 0 && (
          <span className="text-slate-400">Est. score: {score}</span>
        )}
        {solved && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-green-400 font-game"
          >
            🎉 Solved in {moves} moves!
          </motion.span>
        )}
      </div>


      {/* ── Puzzle board ───────────────────────────────────────────── */}
      <div className="relative" style={{ width: BOARD_PX + 4, height: BOARD_PX + 4 }}>
        {/* Border frame */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-slate-600 overflow-hidden bg-slate-900"
          style={{ zIndex: 0 }}
        />

        {/* Loading overlay */}
        <AnimatePresence>
          {!imgReady && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900 rounded-2xl"
            >
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-slate-400 text-xs">Loading image…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tiles */}
        <div
          className="absolute rounded-xl overflow-hidden"
          style={{
            top:  2,
            left: 2,
            width:  BOARD_PX,
            height: BOARD_PX,
            display: 'grid',
            gridTemplateColumns: `repeat(${SIZE}, ${TILE_PX}px)`,
            gridTemplateRows:    `repeat(${SIZE}, ${TILE_PX}px)`,
            gap: 0,
          }}
        >
          {tiles.map((piece, gridPos) => {
            const isEmpty   = piece === BLANK;
            const isMovable = !isEmpty && adjToBlank.has(gridPos) && !solved;
            const pieceRow  = Math.floor(piece / SIZE);
            const pieceCol  = piece % SIZE;

            if (isEmpty) {
              return (
                <div
                  key="blank"
                  className="bg-slate-950/80"
                  style={{ width: TILE_PX, height: TILE_PX }}
                />
              );
            }

            return (
              <motion.div
                key={piece}
                layout
                transition={{ type: 'spring', stiffness: 600, damping: 38, mass: 0.6 }}
                onPointerDown={isMovable ? (e) => handlePointerDown(e, gridPos) : undefined}
                onPointerUp={isMovable ? (e) => handlePointerUp(e, gridPos) : undefined}
                whileTap={isMovable ? { scale: 0.95 } : {}}
                className="relative overflow-hidden"
                style={{
                  width:  TILE_PX,
                  height: TILE_PX,
                  cursor: isMovable ? 'grab' : 'default',
                  backgroundImage:    `url(${imageUrl})`,
                  backgroundSize:     `${BOARD_PX}px ${BOARD_PX}px`,
                  backgroundPosition: `-${pieceCol * TILE_PX}px -${pieceRow * TILE_PX}px`,
                  backgroundRepeat:   'no-repeat',
                  outline: '1px solid rgba(0,0,0,0.35)',
                  outlineOffset: '-1px',
                  touchAction: 'none',
                }}
              >
                {/* Hover highlight for movable tiles */}
                {isMovable && (
                  <motion.div
                    className="absolute inset-0 bg-white/0 hover:bg-white/12 transition-colors duration-150 pointer-events-none"
                  />
                )}
                {/* Movable indicator glow */}
                {isMovable && (
                  <div className="absolute inset-0 ring-2 ring-purple-400/70 ring-inset pointer-events-none" />
                )}
                {/* Tile number hint */}
                {showNums && (
                  <span
                    className="absolute top-0.5 left-1 text-[9px] font-black text-white drop-shadow leading-none"
                    style={{ textShadow: '0 0 3px #000, 0 0 6px #000' }}
                  >
                    {piece + 1}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Solved overlay */}
        <AnimatePresence>
          {solved && (
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl"
              style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(2px)' }}
            >
              <div className="text-center drop-shadow-2xl">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="text-6xl mb-2"
                >
                  🏆
                </motion.div>
                <div className="font-game text-yellow-300 text-2xl drop-shadow">Solved!</div>
                <div className="text-white/80 text-sm mt-1">{moves} moves · {Math.max(50, 1000 - moves * 4)} pts</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Peek overlay — full image shown for 2s */}
        <AnimatePresence>
          {peeking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 rounded-2xl overflow-hidden pointer-events-none"
            >
              <img
                src={imageUrl}
                alt="Reference"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div className="absolute bottom-0 left-0 right-0 py-1.5 bg-black/65 text-center text-white text-xs font-bold tracking-wide">
                👁 Memorise this!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls ───────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={pickRandomImage}
          className="flex items-center gap-1.5 bg-violet-700 hover:bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition"
        >
          🎲 New Image
        </button>
        <button
          onClick={handlePeek}
          disabled={peeking}
          className={`flex items-center gap-1.5 font-bold px-4 py-2 rounded-xl text-sm transition
            ${peeking
              ? 'bg-indigo-500 text-white cursor-default'
              : 'bg-indigo-700 hover:bg-indigo-600 text-white'
            }`}
        >
          {peeking ? '👁 Peeking…' : '👁 Peek'}
        </button>
        <button
          onClick={() => setShowNums(s => !s)}
          className={`flex items-center gap-1.5 font-bold px-4 py-2 rounded-xl text-sm transition
            ${showNums
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
        >
          🔢 {showNums ? 'Hide Nums' : 'Show Nums'}
        </button>
      </div>

      {/* ── Hint text ──────────────────────────────────────────────── */}
      <p className="text-slate-500 text-xs text-center">
        Click or drag a highlighted tile to slide it · Purple border = movable
      </p>

    </div>
  );
}
