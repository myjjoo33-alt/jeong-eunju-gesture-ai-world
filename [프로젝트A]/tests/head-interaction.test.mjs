import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadTurn, createRedBoxes } from '../head-interaction.js';
function points(turn = 0, x = .5, scale = .2) {
  const p = [];
  p[33] = {x: x - scale / 2, y: .3};
  p[263] = {x: x + scale / 2, y: .3};
  p[1] = {x: x + turn * scale, y: .4};
  return p;
}
test('turn requires neutral, sustained turn, and a return before another event', () => {
  const h = createHeadTurn();
  assert.equal(h.update(points(), 0), false);
  h.update(points(), 300);
  assert.equal(h.update(points(.25), 400), false);
  assert.equal(h.update(points(.25), 560), true);
  assert.equal(h.update(points(.25), 9000), false);
  h.update(points(), 9100);
  h.update(points(), 9400);
  h.update(points(-.25), 9500);
  assert.equal(h.update(points(-.25), 9660), true);
});
test('whole-face translation and distance changes do not count as a turn', () => {
  const h = createHeadTurn();
  h.update(points(), 0); h.update(points(), 300);
  assert.equal(h.update(points(0,.8,.1), 500), false);
  assert.equal(h.update(points(0,.3,.4), 800), false);
});
test('brief jitter does not trigger and missing face resets arming', () => {
  const h = createHeadTurn();
  h.update(points(),0); h.update(points(),300);
  h.update(points(.25),400);
  assert.equal(h.update(points(),450),false);
  assert.equal(h.update([],500),false);
  assert.equal(h.update(points(.25),1000),false);
});
test('each clone adds one box, shrinks all, stays inside frame, and uses distinct first four parts', () => {
  const r = createRedBoxes();
  let oldSize = r.get(0)[0].size;
  for (let count = 2; count <= 30; count++) {
    r.add(count * 100);
    const boxes = r.get(count * 100);
    assert.equal(boxes.length,count);
    assert.ok(boxes[0].size < oldSize);
    oldSize = boxes[0].size;
    for (const b of boxes) {
      assert.ok(b.x >= 0 && b.x + b.size <= 24 + 1e-9);
      assert.ok(b.y >= 0 && b.y + b.size <= 12 + 1e-9);
      assert.ok(b.part >= 0 && b.part <= 3);
    }
    assert.equal(new Set(boxes.slice(0,4).map(b => b.part)).size,Math.min(4,count));
  }
  r.reset(10000);
  assert.equal(r.get(10000).length,1);
});
test('parts persist until refresh and refresh keeps first four different', () => {
  const r = createRedBoxes();
  r.add(0); r.add(0); r.add(0);
  const before = r.get(1).map(b => b.part);
  assert.deepEqual(r.get(3999).map(b => b.part),before);
  assert.equal(new Set(r.get(4000).map(b => b.part)).size,4);
});