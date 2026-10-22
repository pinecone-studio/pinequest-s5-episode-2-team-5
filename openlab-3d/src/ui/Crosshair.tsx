import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { aim, centerAim, useAimTracking, useRoaming } from '../interaction/aim';

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

/** All three cursor shapes stay mounted and cross-fade, so a state change shows at once. */
const FADE = 'opacity 80ms ease-out, transform 80ms ease-out';

function Hand({ paths, grabbing, active }: { paths: string[]; grabbing: boolean; active: boolean }) {
  // Dark stroke underneath, white on top: readable on both bright and dark backgrounds.
  const rest = grabbing ? 0.92 : 1;
  return (
    <svg
      width={HAND_SIZE}
      height={HAND_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="absolute drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
      style={{
        ...(grabbing ? { left: -HAND_SIZE / 2, top: -HAND_SIZE / 2, transformOrigin: 'center' } : { left: -TIP_X, top: -TIP_Y, transformOrigin: `${TIP_X}px ${TIP_Y}px` }),
        opacity: active ? 1 : 0,
        transform: `scale(${active ? rest : 0.6})`,
        transition: FADE,
      }}
    >
      {paths.map((d) => (
        <path key={d} d={d} stroke="rgba(0,0,0,0.75)" strokeWidth={3.6} />
      ))}
      {paths.map((d) => (
        <path key={`${d}-fg`} d={d} stroke={grabbing ? '#F5B800' : '#ffffff'} strokeWidth={1.8} />
      ))}
    </svg>
  );
}

/** Classic mouse arrow. Its tip sits at (5, 3) in a 24-unit box. */
const ARROW = 'M5 3v16.5l4.2-4 2.9 6.5 2.6-1.2-2.8-6.3h5.9z';
const ARROW_SIZE = 26;
const ARROW_TIP_X = (5 / 24) * ARROW_SIZE;
const ARROW_TIP_Y = (3 / 24) * ARROW_SIZE;

function Arrow({ active }: { active: boolean }) {
  return (
    <svg
      width={ARROW_SIZE}
      height={ARROW_SIZE}
      viewBox="0 0 24 24"
      className="absolute drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
      style={{ left: -ARROW_TIP_X, top: -ARROW_TIP_Y, transformOrigin: `${ARROW_TIP_X}px ${ARROW_TIP_Y}px`, opacity: active ? 1 : 0, transform: `scale(${active ? 1 : 0.6})`, transition: FADE }}
    >
      <path d={ARROW} fill="#ffffff" stroke="rgba(0,0,0,0.85)" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

/** True while the primary mouse button is held down. */
function useMouseDown(): boolean {
  const [down, setDown] = useState(false);
  useEffect(() => {
    const press = (e: MouseEvent) => e.button === 0 && setDown(true);
    const release = () => setDown(false);
    window.addEventListener('mousedown', press);
    window.addEventListener('mouseup', release);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('mousedown', press);
      window.removeEventListener('mouseup', release);
      window.removeEventListener('blur', release);
    };
  }, []);
  return down;
}

/**
 * The mouse arrow in the 3D view: at the view center while the mouse is captured, following
 * the real mouse while it is free. It turns into a hand over lab equipment (closed hand while
 * pressing, dragging or carrying an item).
 */
export function Crosshair() {
  const focused = useGameStore((s) => !!s.focus);
  const dragging = useGameStore((s) => !!s.dragging);
  const holding = useInventoryStore((s) => !!s.held);
  const pressed = useMouseDown();
  const roaming = useRoaming();
  const root = useRef<HTMLDivElement>(null);
  const hand = focused || dragging || holding;
  // Closed hand while pressing on equipment, dragging, or carrying an item that was picked up
  // (picking up clears the focus, so the hand stays closed until the item is put down).
  const grabbing = dragging || (focused ? pressed : holding);

  const place = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const x = roaming ? aim.x : window.innerWidth / 2;
    const y = roaming ? aim.y : window.innerHeight / 2;
    el.style.transform = `translate(${x}px, ${y}px)`;
    // Over a HUD button the normal arrow cursor takes over.
    el.style.visibility = roaming && !aim.overView ? 'hidden' : 'visible';
  }, [roaming]);

  useAimTracking(place);
  useLayoutEffect(() => {
    centerAim();
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [place]);
  // The dot replaces the arrow over the 3D view, so hide the arrow there.
  useEffect(() => {
    document.body.dataset.freeAim = roaming ? 'true' : 'false';
    return () => {
      delete document.body.dataset.freeAim;
    };
  }, [roaming]);

  return (
    <div ref={root} className="pointer-events-none fixed left-0 top-0 z-20 h-0 w-0" aria-hidden>
      <Arrow active={!hand} />
      <Hand paths={HAND_POINT} grabbing={false} active={hand && !grabbing} />
      <Hand paths={HAND_GRAB} grabbing active={hand && grabbing} />
    </div>
  );
}
