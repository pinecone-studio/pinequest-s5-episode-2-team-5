/**
 * Touch fallback: a virtual joystick on the left half, drag-to-look on the right half,
 * and round action buttons (interact, inspect, place, use/pour (hold), throw, sprint).
 */
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { touchInput } from '../interaction/heldApi';
import { lookBy } from '../controls/usePointerLock';
import { dropHeld, inspectFocusOrHeld, interactWithFocus, releaseThrow, startThrow } from '../controls/useGameKeys';
import { beginHeldUse, endHeldUse } from '../interaction/useHeld';
import { heldObjectId } from '../experiments/nacl/sandbox';

const R = 56;

export function TouchControls() {
  const mode = useGameStore((s) => s.mode);
  const [stick, setStick] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [sprint, setSprint] = useState(false);
  const stickId = useRef<number | null>(null);
  const lookId = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    touchInput.sprint = sprint;
  }, [sprint]);
  useEffect(() => {
    if (mode !== 'walk') {
      touchInput.moveX = 0;
      touchInput.moveY = 0;
      setStick(null);
    }
  }, [mode]);

  if (mode !== 'walk') return null;

  const onStart = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < window.innerWidth / 2 && stickId.current === null) {
        stickId.current = t.identifier;
        setStick({ x: t.clientX, y: t.clientY, ox: t.clientX, oy: t.clientY });
      } else if (!lookId.current) {
        lookId.current = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
    }
  };
  const onMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === stickId.current && stick) {
        let dx = t.clientX - stick.ox;
        let dy = t.clientY - stick.oy;
        const len = Math.hypot(dx, dy);
        if (len > R) {
          dx = (dx / len) * R;
          dy = (dy / len) * R;
        }
        touchInput.moveX = dx / R;
        touchInput.moveY = -dy / R;
        setStick({ ...stick, x: stick.ox + dx, y: stick.oy + dy });
      } else if (lookId.current && t.identifier === lookId.current.id) {
        lookBy((t.clientX - lookId.current.x) * 1.6, (t.clientY - lookId.current.y) * 1.6);
        lookId.current = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
    }
  };
  const onEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === stickId.current) {
        stickId.current = null;
        touchInput.moveX = 0;
        touchInput.moveY = 0;
        setStick(null);
      }
      if (lookId.current && t.identifier === lookId.current.id) lookId.current = null;
    }
  };
  const btn = 'pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-base font-bold text-white backdrop-blur active:scale-95 active:bg-black/60';
  return (
    <div className="fixed inset-0 z-10 touch-none" onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onTouchCancel={onEnd}>
      {stick && (
        <div className="pointer-events-none fixed" style={{ left: stick.ox - R, top: stick.oy - R }}>
          <div className="h-28 w-28 rounded-full border-2 border-white/50 bg-white/10" />
          <div className="absolute h-12 w-12 rounded-full bg-white/70" style={{ left: R - 24 + (stick.x - stick.ox), top: R - 24 + (stick.y - stick.oy) }} />
        </div>
      )}
      <div className="pointer-events-none fixed bottom-[36%] right-12 grid grid-cols-2 gap-3" onTouchStart={(e) => e.stopPropagation()}>
        <button className={btn} onClick={() => interactWithFocus()} aria-label="Ашиглах">
          E
        </button>
        <button className={btn} onClick={inspectFocusOrHeld} aria-label="Ойроос харах">
          F
        </button>
        <button className={btn} onClick={() => heldObjectId() && dropHeld()} aria-label="Тавих">
          Q
        </button>
        <button className={btn} onTouchStart={() => beginHeldUse()} onTouchEnd={() => endHeldUse()} onTouchCancel={() => endHeldUse()} aria-label="Ашиглах (асгах, хэмжих)">
          R
        </button>
        <button className={btn} onTouchStart={() => startThrow()} onTouchEnd={() => releaseThrow()} aria-label="Шидэх">
          T
        </button>
        <button className={`${btn} ${sprint ? '!bg-lab-yellow' : ''}`} onClick={() => setSprint((s) => !s)} aria-label="Гүйх горим" aria-pressed={sprint}>
          ⇧
        </button>
      </div>
    </div>
  );
}
