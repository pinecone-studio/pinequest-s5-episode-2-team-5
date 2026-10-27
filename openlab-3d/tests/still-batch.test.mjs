import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { MERGED_LAYER, mergeStill, unmerge } from '../src/interaction/stillBatch.ts';

const glass = new MeshStandardMaterial({ transparent: true, opacity: 0.2 });
const metal = new MeshStandardMaterial();
const onTop = new MeshBasicMaterial({ depthTest: false });

/** A drawer at x = 10 holding two items (glass body + metal cap each) and a marker drawn on top. */
function drawer() {
  const holder = new Group();
  holder.position.x = 10;
  const items = [-0.2, 0.2].map((x) => {
    const item = new Group();
    item.position.x = x;
    const body = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), glass);
    const cap = new Mesh(new BoxGeometry(0.05, 0.02, 0.05), metal);
    cap.position.y = 0.06;
    body.renderOrder = 1;
    item.add(body, cap);
    holder.add(item);
    return { body, cap };
  });
  const marker = new Mesh(new BoxGeometry(0.01, 0.01, 0.01), onTop);
  const hidden = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), metal);
  hidden.visible = false;
  holder.add(marker, hidden);
  return { holder, items, marker, hidden };
}

const merged = (holder) => holder.children.filter((c) => c.userData.stillMerged);

test('parts sharing a material and draw order are drawn as one mesh in the holder space', () => {
  const { holder, items, marker } = drawer();
  const batch = { merged: [], originals: [] };
  mergeStill(holder, batch);
  const meshes = merged(holder);
  assert.equal(meshes.length, 2, 'one for the glass bodies, one for the caps');
  const bodies = meshes.find((m) => m.material === glass);
  assert.equal(bodies.renderOrder, 1, 'transparent sorting keeps the original draw order');
  const box = new Box3().setFromBufferAttribute(bodies.geometry.getAttribute('position'));
  assert.ok(Math.abs(box.min.x + 0.25) < 1e-6 && Math.abs(box.max.x - 0.25) < 1e-6, 'positions are local to the holder, not the world');
  assert.equal(bodies.raycast.length, 0);
  for (const { body, cap } of items) {
    assert.equal(body.layers.mask, 1 << MERGED_LAYER);
    assert.equal(cap.layers.mask, 1 << MERGED_LAYER);
  }
  assert.equal(marker.layers.mask, 1, 'a marker drawn on top of everything is left alone');
});

test('hidden and single parts are not merged, and unmerging restores the originals', () => {
  const { holder, items, hidden } = drawer();
  const batch = { merged: [], originals: [] };
  mergeStill(holder, batch);
  assert.equal(hidden.layers.mask, 1);
  assert.ok(!batch.originals.includes(hidden));
  mergeStill(holder, batch);
  assert.equal(merged(holder).length, 2, 'merging again replaces the copy instead of adding one');
  unmerge(holder, batch);
  assert.equal(merged(holder).length, 0);
  for (const { body, cap } of items) assert.equal(body.layers.mask | cap.layers.mask, 1);
  assert.deepEqual(batch, { merged: [], originals: [] });
});
