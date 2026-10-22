import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

/** Lucide "pointer" (open hand, index finger up). The fingertip sits at (8, 2). */
const HAND_POINT = [
  'M22 14a8 8 0 0 1-8 8',
  'M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2',
  'M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1',
  'M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10',
  'M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
];

/** Lucide "grab" (closed hand), shown while an object is being dragged. */
const HAND_GRAB = [
  'M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4',
  'M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2',
  'M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5',
  'M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2',
  'M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
];

const HAND_SIZE = 30;
/** Fingertip of the pointing hand in px, so it lands exactly on the screen center. */
const TIP_X = (8 / 24) * HAND_SIZE;
const TIP_Y = (2 / 24) * HAND_SIZE;

function Hand({ paths, grabbing }: { paths: string[]; grabbing: boolean }) {
  // Dark stroke underneath, white on top: readable on both bright and dark backgrounds.
  return (
    <motion.svg
      width={HAND_SIZE}
      height={HAND_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="absolute drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
      style={grabbing ? { left: -HAND_SIZE / 2, top: -HAND_SIZE / 2 } : { left: -TIP_X, top: -TIP_Y, transformOrigin: `${TIP_X}px ${TIP_Y}px` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: grabbing ? 0.92 : 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.12 }}
    >
      {paths.map((d) => (
        <path key={d} d={d} stroke="rgba(0,0,0,0.75)" strokeWidth={3.6} />
      ))}
      {paths.map((d) => (
        <path key={`${d}-fg`} d={d} stroke={grabbing ? '#F5B800' : '#ffffff'} strokeWidth={1.8} />
      ))}
    </motion.svg>
  );
}

/** Small center dot; it turns into a hand while lab equipment is in focus (closed hand while dragging). */
export function Crosshair() {
  const focused = useGameStore((s) => !!s.focus);
  const dragging = useGameStore((s) => !!s.dragging);
  const hand = focused || dragging;
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-20 h-0 w-0" aria-hidden>
      <div
        className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border-white bg-white transition-opacity duration-100 h-[7px] w-[7px] border shadow-[0_0_0_1.5px_rgba(0,0,0,0.45)] ${hand ? 'opacity-0' : 'opacity-100'}`}
      />
      <AnimatePresence mode="wait">
        {hand && <Hand key={dragging ? 'grab' : 'point'} paths={dragging ? HAND_GRAB : HAND_POINT} grabbing={!!dragging} />}
      </AnimatePresence>
    </div>
  );
}
