/**
 * Touch fallback: a virtual joystick on the left half, drag-to-look on the right half,
 * contextual object taps, plus inspect and sprint controls.
 */
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { touchInput } from '../interaction/heldApi';
import { lookBy } from '../controls/usePointerLock';
import { dropHeld, inspectFocusOrHeld, interactWithFocus, releaseThrow, startThrow } from '../controls/useGameKeys';
import { beginHeldUse, endHeldUse } from '../interaction/useHeld';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePortableStore } from '../interaction/portable';
import { interactables } from '../interaction/registry';
import { isMobileTap, mobileTapAction, MOBILE_THROW_HOLD_MS } from '../controls/mobileInteraction';
import { interactItem } from '../interaction/interactItem';

const R = 56;

export function TouchControls() {
  const mode = useGameStore((s) => s.mode);
  const [stick, setStick] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [sprint, setSprint] = useState(false);
  const stickId = useRef<number | null>(null);
  const stickOrigin = useRef<{ x: number; y: number } | null>(null);
  const lookId = useRef<{ id: number; x: number; y: number; startX: number; startY: number; throwTimer: number | null; throwing: boolean } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const onStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        // Товч дарсан хүрэлтийг joystick/харах хөдөлгөөн гэж үзэхгүй (E, F товчнууд зүүн хагаст байна).
        if (t.target instanceof Element && t.target.closest('button')) continue;
        if (t.clientX < window.innerWidth / 2 && stickId.current === null) {
          stickId.current = t.identifier;
          stickOrigin.current = { x: t.clientX, y: t.clientY };
          setStick({ x: t.clientX, y: t.clientY, ox: t.clientX, oy: t.clientY });
        } else if (!lookId.current && !(t.target instanceof Element && t.target.closest('button'))) {
          const gesture = { id: t.identifier, x: t.clientX, y: t.clientY, startX: t.clientX, startY: t.clientY, throwTimer: null as number | null, throwing: false };
          if (useInventoryStore.getState().held && !useGameStore.getState().focus) {
            gesture.throwTimer = window.setTimeout(() => {
              if (lookId.current === gesture) {
                gesture.throwing = true;
                startThrow();
              }
            }, MOBILE_THROW_HOLD_MS);
          }
          lookId.current = gesture;
        }
      }
    };
    const onMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === stickId.current && stickOrigin.current) {
          let dx = t.clientX - stickOrigin.current.x;
          let dy = t.clientY - stickOrigin.current.y;
          const len = Math.hypot(dx, dy);
          if (len > R) {
            dx = (dx / len) * R;
            dy = (dy / len) * R;
          }
          touchInput.moveX = dx / R;
          touchInput.moveY = -dy / R;
          if (knob.current) knob.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        } else if (lookId.current && t.identifier === lookId.current.id) {
          if (!isMobileTap(lookId.current.startX, lookId.current.startY, t.clientX, t.clientY) && lookId.current.throwTimer !== null) {
            window.clearTimeout(lookId.current.throwTimer);
            lookId.current.throwTimer = null;
          }
          lookBy((t.clientX - lookId.current.x) * 1.6, (t.clientY - lookId.current.y) * 1.6);
          lookId.current.x = t.clientX;
          lookId.current.y = t.clientY;
        }
      }
    };
    const onEnd = (e: TouchEvent, cancelled = false) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === stickId.current) {
          stickId.current = null;
          stickOrigin.current = null;
          touchInput.moveX = 0;
          touchInput.moveY = 0;
          setStick(null);
        }
        if (lookId.current && t.identifier === lookId.current.id) {
          const gesture = lookId.current;
          if (gesture.throwTimer !== null) window.clearTimeout(gesture.throwTimer);
          if (gesture.throwing) releaseThrow();
          else if (!cancelled && isMobileTap(gesture.startX, gesture.startY, t.clientX, t.clientY)) performContextualTap();
          lookId.current = null;
        }
      }
    };
    element.addEventListener('touchstart', onStart, { passive: true });
    element.addEventListener('touchmove', onMove, { passive: true });
    element.addEventListener('touchend', onEnd, { passive: true });
    const onCancel = (e: TouchEvent) => onEnd(e, true);
    element.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      element.removeEventListener('touchstart', onStart);
      element.removeEventListener('touchmove', onMove);
      element.removeEventListener('touchend', onEnd);
      element.removeEventListener('touchcancel', onCancel);
    };
  }, []);

  function performContextualTap() {
    const game = useGameStore.getState();
    const held = useInventoryStore.getState().held || usePortableStore.getState().held;
    const focus = game.focus;
    const entry = focus ? interactables.get(focus.id) : undefined;
    const action = mobileTapAction({
      hasHeld: !!held,
      hasFocus: !!focus,
      canStore: !!focus?.canStore,
      hasUseTarget: !!entry?.useTarget || !!focus?.id.startsWith('nacl-'),
    });
    if (action === 'store' || action === 'place') dropHeld();
    else if (action === 'use' && focus) {
      beginHeldUse(focus.id);
      window.setTimeout(endHeldUse, 300);
    } else if (action === 'interact') {
      if (focus && !focus.canUse && focus.canGrab) interactItem(focus.id, true);
      else interactWithFocus();
    }
  }

  // E: ойр байгаа зүйлийг авах/ашиглах. Дэлгэц товших үйлдэлтэй ижил дүрэмтэй.
  function pressE() {
    const focus = useGameStore.getState().focus;
    if (focus && !focus.canUse && focus.canGrab) interactItem(focus.id, true);
    else interactWithFocus();
  }

  // Q: барьж буй зүйлээ тавих.
  function pressQ() {
    if (useInventoryStore.getState().held || usePortableStore.getState().held) dropHeld();
  }

  if (mode !== 'walk') return null;

  const btn = 'pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-base font-bold text-white backdrop-blur active:scale-95 active:bg-black/60';
  return (
    <div ref={root} className="fixed inset-0 z-10 touch-none">
      {stick && (
        <div className="pointer-events-none fixed" style={{ left: stick.ox - R, top: stick.oy - R }}>
          <div className="h-28 w-28 rounded-full border-2 border-white/50 bg-white/10" />
          <div ref={knob} className="absolute left-8 top-8 h-12 w-12 rounded-full bg-white/70" style={{ transform: `translate3d(${stick.x - stick.ox}px, ${stick.y - stick.oy}px, 0)` }} />
        </div>
      )}
      {/* Дээд эгнээ: [E][F] — голд ChemQuest товчны зай — [Q][R]. Голын зайг ChemQuest-ийн native товч эзэлнэ. */}
      <div className="pointer-events-none fixed inset-x-0 top-3 flex items-center justify-center gap-2" onTouchStart={(e) => e.stopPropagation()}>
        <button className={btn} onClick={pressE} aria-label="Ашиглах">
          E
        </button>
        <button className={btn} onClick={inspectFocusOrHeld} aria-label="Ойроос харах">
          F
        </button>
        <div className="w-36 shrink-0" aria-hidden />
        <button className={btn} onClick={pressQ} aria-label="Тавих">
          Q
        </button>
        <button className={btn} onTouchStart={() => beginHeldUse()} onTouchEnd={endHeldUse} onTouchCancel={endHeldUse} aria-label="Ашиглах (асгах, хэмжих)">
          R
        </button>
      </div>
      {/* Гүйх горим (⇧) баруун талд хэвээр; газрын зурагтай давхцахгүйн тулд хамгийн багадаа 148px өндөрт. */}
      <div className="pointer-events-none fixed bottom-[max(36%,148px)] right-12" onTouchStart={(e) => e.stopPropagation()}>
        <button className={`${btn} ${sprint ? '!bg-lab-yellow' : ''}`} onClick={() => setSprint((s) => !s)} aria-label="Гүйх горим" aria-pressed={sprint}>
          ⇧
        </button>
      </div>
    </div>
  );
}
