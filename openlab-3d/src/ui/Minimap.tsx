import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { playerState, useGameStore } from '../store/useGameStore';
import { LAB_BOUNDS, WALLS } from '../world/layout';
import { isTouchDevice } from '../utils/device';

const W = LAB_BOUNDS.maxX - LAB_BOUNDS.minX;
const H = LAB_BOUNDS.maxZ - LAB_BOUNDS.minZ;
// Утсан дээр газрын зургийг хагас хэмжээнд (6) гаргана, компьютер дээр хэвээр (12).
const TOUCH = isTouchDevice();
const SCALE = TOUCH ? 6 : 12;
const LINE = TOUCH ? 1.2 : 1.6;
const ARROW = TOUCH ? 0.7 : 1;

const toX = (x: number) => (x - LAB_BOUNDS.minX) * SCALE;
const toY = (z: number) => (z - LAB_BOUNDS.minZ) * SCALE;

/** Solid wall segments and window spans, in map coordinates. */
function useWallLines() {
  return useMemo(() => {
    const solid: string[] = [];
    const glass: string[] = [];
    for (const w of WALLS) {
      const spans: [number, number, 'solid' | 'glass'][] = [];
      let cursor = w.from;
      const openings = [...w.openings].sort((a, b) => a.center - b.center);
      for (const o of openings) {
        const a = o.center - o.width / 2;
        const b = o.center + o.width / 2;
        if (a > cursor) spans.push([cursor, a, 'solid']);
        spans.push([a, b, 'glass']);
        cursor = b;
      }
      if (cursor < w.to) spans.push([cursor, w.to, 'solid']);
      for (const [a, b, kind] of spans) {
        const d = w.axis === 'x' ? `M${toX(a)} ${toY(w.at)}H${toX(b)}` : `M${toX(w.at)} ${toY(a)}V${toY(b)}`;
        (kind === 'solid' ? solid : glass).push(d);
      }
    }
    return { solid: solid.join(''), glass: glass.join('') };
  }, []);
}

/** Bottom-right top-down map with a live player arrow (toggle with M). */
export function Minimap() {
  const visible = useGameStore((s) => s.minimapVisible);
  const arrow = useRef<SVGGElement>(null);
  const walls = useWallLines();

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const tick = () => {
      const deg = (-playerState.yaw * 180) / Math.PI;
      arrow.current?.setAttribute('transform', `translate(${toX(playerState.position.x)} ${toY(playerState.position.z)}) rotate(${deg}) scale(${ARROW})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`pointer-events-none fixed z-20 overflow-hidden border border-white/60 bg-white/80 shadow-hud backdrop-blur max-sm:hidden ${TOUCH ? 'bottom-2 right-2 rounded-xl' : 'bottom-4 right-4 rounded-2xl'}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          role="img"
          aria-label="Химийн лабораторийн газрын зураг."
        >
          <div className={`flex items-center justify-between font-semibold text-slate-600 ${TOUCH ? 'px-2 pt-1 text-[9px]' : 'px-3 pt-2 text-[11px]'}`}>
            <span>Химийн лаборатори</span>
            {!TOUCH && <span className="kbd !text-[10px]">M</span>}
          </div>
          <svg width={W * SCALE + 12} height={H * SCALE + 12} viewBox={`-6 -6 ${W * SCALE + 12} ${H * SCALE + 12}`}>
            <rect x={0} y={0} width={W * SCALE} height={H * SCALE} fill="#e2f3e4" />
            <path d={walls.solid} stroke="#475569" strokeWidth={LINE} strokeLinecap="square" fill="none" />
            <path d={walls.glass} stroke="#7cc4ff" strokeWidth={LINE} fill="none" />
            <g ref={arrow}>
              <circle r={6} fill="#2563eb" opacity={0.18} />
              <path d="M0 -6 L4.5 4.5 L0 2.2 L-4.5 4.5 Z" fill="#2563eb" stroke="#fff" strokeWidth={1} />
            </g>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
