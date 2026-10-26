import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackUser, rootDestination } from '../src/lib/auth-profile-fallback.ts';

test('missing profiles preserve the authenticated identity and fail open', () => {
  const user = fallbackUser('u1', 'learner@example.org', { nickname: 'Atom' }, '2026-01-01');
  assert.equal(user.id, 'u1');
  assert.equal(user.nickname, 'Atom');
  assert.equal(user.locationStatus, 'unavailable');
  assert.deepEqual(user.completed, {});
});

test('root route sends only confirmed incomplete profiles to onboarding', () => {
  assert.equal(rootDestination(false, null), '/welcome');
  assert.equal(rootDestination(true, 'incomplete'), '/onboarding');
  assert.equal(rootDestination(true, 'unavailable'), '/home');
  assert.equal(rootDestination(true, 'complete'), '/home');
});
