import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestLine, LINE_PICK_RADIUS } from '../src/line-picking.js';

const line = (id, y, z = 0) => ({
  id, points: [{ x: 0, y, z, t: 0 }, { x: 100, y, z, t: 1 }],
});

test('line selection accepts clicks up to twelve CSS pixels away, but not beyond', () => {
  assert.equal(LINE_PICK_RADIUS, 12);
  for (const distance of [0, 8, 12]) {
    const hit = nearestLine({ x: 40, y: distance }, [line('rope', 0)]);
    assert.equal(hit.id, 'rope');
    assert.equal(hit.distance, distance);
    assert.equal(hit.t, 0.4);
  }
  assert.equal(nearestLine({ x: 40, y: 12.01 }, [line('rope', 0)]), null);
});

test('nearest line wins and overlapping lines prefer the nearer camera depth', () => {
  assert.equal(nearestLine({ x: 50, y: 8 }, [line('far', 0), line('near', 10)]).id, 'near');
  assert.equal(nearestLine({ x: 50, y: 0 }, [line('back', 0, 0.8), line('front', 0, 0.2)]).id, 'front');
});

test('picking checks endpoints and ignores segments outside the camera clipping range', () => {
  assert.equal(nearestLine({ x: -8, y: 0 }, [line('rope', 0)]).t, 0);
  assert.equal(nearestLine({ x: -13, y: 0 }, [line('rope', 0)]), null);
  assert.equal(nearestLine({ x: 50, y: 0 }, [line('behind', 0, -2), line('beyond', 0, 2)]), null);
  assert.equal(nearestLine({ x: 50, y: 0 }, []), null);
});

test('collapsed projected segments remain pickable without invalid distances', () => {
  const candidate = { id: 'rope', points: [{ x: 20, y: 20, z: 0, t: 0 }, { x: 20, y: 20, z: 0, t: 1 }] };
  assert.equal(nearestLine({ x: 25, y: 20 }, [candidate]).distance, 5);
});
