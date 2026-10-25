import test from 'node:test';
import assert from 'node:assert/strict';
import { isMobileTap, mobileTapAction, mobileizeControlHint, MOBILE_TAP_SLOP } from '../src/controls/mobileInteraction.ts';

test('stationary tap stays a tap while look drags exceed the tap threshold', () => {
  assert.equal(isMobileTap(10, 10, 10 + MOBILE_TAP_SLOP, 10), true);
  assert.equal(isMobileTap(10, 10, 10 + MOBILE_TAP_SLOP + 1, 10), false);
  assert.equal(isMobileTap(10, 10, 10, 10 + MOBILE_TAP_SLOP + 1), false);
});

test('mobile tap selects the shared contextual action for focused and held items', () => {
  assert.equal(mobileTapAction({ hasHeld: false, hasFocus: true, canStore: false, hasUseTarget: false }), 'interact');
  assert.equal(mobileTapAction({ hasHeld: true, hasFocus: true, canStore: true, hasUseTarget: true }), 'store');
  assert.equal(mobileTapAction({ hasHeld: true, hasFocus: true, canStore: false, hasUseTarget: true }), 'use');
  assert.equal(mobileTapAction({ hasHeld: true, hasFocus: false, canStore: false, hasUseTarget: false }), 'place');
  assert.equal(mobileTapAction({ hasHeld: false, hasFocus: false, canStore: false, hasUseTarget: false }), 'none');
});

test('mobile-only hint text replaces keyboard instructions without changing source copy', () => {
  const desktopCopy = 'Хүчилтэй сав руу хараад R дарж бага багаар цутга.';
  const mobileCopy = mobileizeControlHint(desktopCopy);
  assert.match(mobileCopy, /товшиж/);
  assert.doesNotMatch(mobileCopy, /R дар/);
  assert.equal(desktopCopy, 'Хүчилтэй сав руу хараад R дарж бага багаар цутга.');
});
