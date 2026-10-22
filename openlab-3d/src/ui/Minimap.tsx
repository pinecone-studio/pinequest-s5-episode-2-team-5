import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { playerState, useGameStore } from '../store/useGameStore';
import { useExperimentStore } from '../store/useExperimentStore';
import { ROOMS, WALLS, type RoomId } from '../world/layout';

const W = 40;
const H = 30;
const SCALE = 5.6;
const SHORT: Record<RoomId, string> = { mainHall: 'Main Hall', corridor: 'Corridor', physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology', storage: 'Storage' };

const toX = (x: number) => (x + W / 2) * SCALE;
const toY = (z: number) => (z + H / 2) * SCALE;

/** Wall segments with door/opening gaps, and window spans, in map coordinates. */
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
        if (o.kind === 'window') spans.push([a, b, 'glass']);
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
  const current = useGameStore((s) => s.currentRoom);
  const visited = useGameStore((s) => s.visitedRooms);
  const stationDone = useExperimentStore((s) => s.steps.openedLaptop && s.steps.measuredField);
  const arrow = useRef<SVGGElement>(null);
  const walls = useWallLines();

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const tick = () => {
      const deg = (-playerState.yaw * 180) / Math.PI;
      arrow.current?.setAttribute('transform', `translate(${toX(playerState.position.x)} ${toY(playerState.position.z)}) rotate(${deg})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed bottom-4 right-4 z-20 overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-hud backdrop-blur max-sm:hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          role="img"
          aria-label={`Minimap. You are in the ${SHORT[current]}.`}
        >
          <div className="flex items-center justify-between px-3 pt-2 text-[11px] font-semibold text-slate-600">
            <span>{SHORT[current]}</span>
            <span className="kbd !text-[10px]">M</span>
          </div>
          <svg width={W * SCALE + 12} height={H * SCALE + 12} viewBox={`-6 -6 ${W * SCALE + 12} ${H * SCALE + 12}`}>
            {/* Courtyard (outdoors). */}
            <rect x={toX(6)} y={toY(1)} width={14 * SCALE} height={14 * SCALE} fill="#cfe6c4" rx={3} />
            {ROOMS.map((r) => (
              <rect
                key={r.id}
                x={toX(r.bounds.minX)}
                y={toY(r.bounds.minZ)}
                width={(r.bounds.maxX - r.bounds.minX) * SCALE}
                height={(r.bounds.maxZ - r.bounds.minZ) * SCALE}
                fill={r.id === current ? '#fde68a' : r.mapColor}
                opacity={visited.includes(r.id) ? 1 : 0.55}
              />
            ))}
            <path d={walls.solid} stroke="#475569" strokeWidth={1.6} strokeLinecap="square" fill="none" />
            <path d={walls.glass} stroke="#7cc4ff" strokeWidth={1.6} fill="none" />
            {ROOMS.map((r) => (
              <text key={r.id} x={toX((r.bounds.minX + r.bounds.maxX) / 2)} y={toY((r.bounds.minZ + r.bounds.maxZ) / 2) + 3} textAnchor="middle" fontSize={8.5} fontWeight={600} fill="#334155" fontFamily="Inter, sans-serif">
                {SHORT[r.id]}
              </text>
            ))}
            {!stationDone && (
              <g transform={`translate(${toX(-12)} ${toY(-9)})`}>
                <circle r={5} fill="#F5B800" opacity={0.35}>
                  <animate attributeName="r" values="4;8;4" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <circle r={2.6} fill="#F5B800" />
              </g>
            )}
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
