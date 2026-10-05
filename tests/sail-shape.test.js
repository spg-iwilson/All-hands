import test from 'node:test';
import assert from 'node:assert/strict';
import { courseSailPoint } from '../src/sail-shape.js';
import { initialRig, exercises, snapshots, applyStep } from '../src/learning.js';

test('released sail stays gathered, with raised clews and a deeper centre', () => {
  const rig = snapshots(initialRig(), exercises[0].example, 'release').at(-1);
  const clew = courseSailPoint(1, 1, rig);
  const centre = courseSailPoint(0, 1, rig);
  assert.equal(rig.sail, 1);
  assert.equal(rig.sheets, 0);
  assert.ok(clew.y > -0.7);
  assert.ok(centre.y < clew.y - 1);
  assert.ok(clew.x < 3.2);
});

test('yard hoist preserves gathered shape despite coordinated clewline easing', () => {
  const release = snapshots(initialRig(), exercises[0].example, 'release').at(-1);
  const hoisted = applyStep(release, exercises[1].example[0], 'set');
  assert.equal(hoisted.yard, 1);
  for (const horizontal of [-1, -0.6, 0, 0.6, 1]) {
    assert.deepEqual(courseSailPoint(horizontal, 1, hoisted), courseSailPoint(horizontal, 1, release));
  }
});

test('sheet hauling with clewline and martnet easing spreads clews down and out', () => {
  const release = snapshots(initialRig(), exercises[0].example, 'release').at(-1);
  const states = snapshots(release, exercises[1].example, 'set');
  const gathered = courseSailPoint(1, 1, states[1]);
  const spread = courseSailPoint(1, 1, states[2]);
  assert.equal(states[2].sheets, 1);
  assert.ok(spread.y < gathered.y - 4);
  assert.ok(spread.x > gathered.x + 2);
  assert.ok(Math.abs(spread.y - courseSailPoint(0, 1, states[2]).y) < 0.001);
});

test('interpolated shape moves continuously and keeps its head attached to the yard', () => {
  let last;
  for (let sheets = 0; sheets <= 1.001; sheets += 0.1) {
    const rig = { ...initialRig(), sail: 1, sheets };
    const clew = courseSailPoint(1, 1, rig);
    const head = courseSailPoint(1, 0, rig);
    assert.equal(head.x, 5);
    assert.equal(head.y, -0.23);
    if (last) {
      assert.ok(clew.y < last.y);
      assert.ok(clew.x > last.x);
    }
    last = clew;
  }
});
