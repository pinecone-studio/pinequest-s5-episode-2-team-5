import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTO_LADDER, FrameGovernor, ladderFor, manualLadder } from '../src/world/qualityGovernor.ts';

const SLOW = 30;
const FAST = 60;
const OK = 54;
const feed = (g, fps, n) => {
  let last = null;
  for (let i = 0; i < n; i++) last = g.onWindow(fps) ?? last;
  return last;
};

test('ladder has no duplicate levels on a 1x screen and keeps all on a 2x screen', () => {
  const oneX = ladderFor(AUTO_LADDER, 1);
  assert.deepEqual(oneX.map((l) => `${l.quality}@${l.dpr}`), ['medium@1', 'low@1', 'low@0.75', 'low@0.6', 'low@0.5']);
  assert.equal(ladderFor(AUTO_LADDER, 2).length, AUTO_LADDER.length);
});

test('manual ladder stays inside the preset resolution range', () => {
  assert.deepEqual(ladderFor(manualLadder('medium', [0.75, 1.5]), 2).map((l) => l.dpr), [1.5, 1, 0.75]);
  assert.ok(manualLadder('low', [0.5, 1]).every((l) => l.quality === 'low' && l.dpr <= 1 && l.dpr >= 0.5));
});

test('one slow window is tolerated, two step down one level', () => {
  const g = new FrameGovernor(ladderFor(AUTO_LADDER, 2));
  assert.equal(g.onWindow(SLOW), null);
  assert.equal(g.onWindow(SLOW), 1);
  assert.equal(g.level, 1);
});

test('a slow device walks down to the bottom and stays there', () => {
  const g = new FrameGovernor(ladderFor(AUTO_LADDER, 2));
  feed(g, SLOW, 40);
  assert.equal(g.level, AUTO_LADDER.length - 1);
  assert.equal(g.onWindow(SLOW), null);
});

test('steady frame rate between the thresholds changes nothing', () => {
  const g = new FrameGovernor(ladderFor(AUTO_LADDER, 2), 2);
  assert.equal(feed(g, OK, 20), null);
  assert.equal(g.level, 2);
});

test('five fast windows try one level up; a slow window right after reverts at once', () => {
  const g = new FrameGovernor(ladderFor(AUTO_LADDER, 2), 3);
  assert.equal(feed(g, FAST, 4), null);
  assert.equal(g.onWindow(FAST), 2);
  assert.equal(g.onWindow(SLOW), 3);
});

test('a failed tier change is never retried; a failed resolution step is retried once', () => {
  // Level 2 (low@1) → level 1 (medium@1) changes the tier.
  const g = new FrameGovernor(ladderFor(AUTO_LADDER, 2), 2);
  feed(g, FAST, 5);
  assert.equal(g.level, 1);
  g.onWindow(SLOW);
  assert.equal(g.level, 2);
  assert.equal(feed(g, FAST, 30), null);
  assert.equal(g.level, 2);
  // Level 4 (low@0.6) → level 3 (low@0.75) only changes resolution.
  const r = new FrameGovernor(ladderFor(AUTO_LADDER, 2), 4);
  feed(r, FAST, 5);
  r.onWindow(SLOW);
  assert.equal(r.level, 4);
  feed(r, FAST, 5);
  assert.equal(r.level, 3);
  r.onWindow(SLOW);
  assert.equal(r.level, 4);
  assert.equal(feed(r, FAST, 30), null);
  assert.equal(r.level, 4);
});

test('a successful probe that stays fast keeps climbing', () => {
  const g = new FrameGovernor(ladderFor(AUTO_LADDER, 2), 4);
  feed(g, FAST, 40);
  assert.equal(g.level, 0);
});
