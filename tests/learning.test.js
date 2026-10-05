import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assess, assessNextStep, exercises, freshSession, initialRig, snapshots,
  completePlayback, completeStepPlayback, applyStep,
  sailForLine, lineChoices, pickerLines, lineById, pickerIdForLine,
} from '../src/learning.js';

const copy = value => structuredClone(value);

test('sail choices separate course and top lines without duplicate sides', () => {
  for (const sail of ['course', 'top']) {
    const choices = lineChoices(sail);
    assert.ok(choices.length);
    assert.ok(choices.every(line => sailForLine(line) === sail));
    assert.equal(new Set(choices.map(pickerIdForLine)).size, choices.length);
  }
  assert.equal(sailForLine(lineById.get('top-halyard')), 'top');
});

test('side selection expands pairs and leaves unpaired items unsided', () => {
  assert.deepEqual(pickerLines('lift-port', ['port', 'starboard']).map(line => line.id), ['lift-port', 'lift-starboard']);
  assert.deepEqual(pickerLines('top-sheet-port', ['starboard']).map(line => line.id), ['top-sheet-starboard']);
  assert.deepEqual(pickerLines('brace-port', []), []);
  for (const id of ['halyard', 'top-halyard', 'gasket']) {
    assert.deepEqual(pickerLines(id, []).map(line => line.id), [id]);
    assert.deepEqual(pickerLines(id, ['port', 'starboard']).map(line => line.id), [id]);
  }
  assert.throws(() => pickerLines('missing', []), /Unknown line/);
});

test('both supplied demonstrations match their draft rules', () => {
  for (const exercise of exercises) assert.equal(assess(exercise, exercise.example).ok, true);
});

test('one combined gasket control releases and stows all course gaskets', () => {
  const gaskets = lineChoices('course').filter(line => line.kind === 'gasket');
  assert.deepEqual(gaskets.map(line => line.id), ['gasket']);
  assert.equal(lineById.has('gasket-a'), false);
  assert.equal(lineById.has('gasket-b'), false);
  const example = exercises[0].example;
  assert.equal(example.length, 4);
  assert.deepEqual(example.slice(2), [
    [{ line: 'gasket', action: 'release' }],
    [{ line: 'gasket', action: 'stow' }],
  ]);
  const states = snapshots(initialRig(), example, 'release');
  assert.equal(states[2].sail, 0);
  assert.equal(states[3].sail, 1);
  assert.equal(states[3].sheets, 0);
  assert.deepEqual(states[4].stowed, ['gasket']);
  const simultaneous = [...example.slice(0, 2), [...example[2], ...example[3]]];
  assert.equal(assess(exercises[0], simultaneous).ok, false);
});

test('uncoordinated lift easing and lowering fail at the first incorrect step', () => {
  const example = copy(exercises[0].example);
  example.splice(0, 1, [example[0][0]], [example[0][1]]);
  assert.equal(assess(exercises[0], example).index, 0);
  assert.match(assess(exercises[0], example).message, /together/);
  const lower = copy(exercises[0].example);
  lower[1] = [lower[1][0]];
  assert.equal(assess(exercises[0], lower).index, 1);
});

test('lowering before setting lifts is rejected', () => {
  const example = copy(exercises[0].example);
  [example[0], example[1]] = [example[1], example[0]];
  assert.equal(assess(exercises[0], example).ok, false);
});

test('release cannot happen simultaneously with its prerequisite lowering', () => {
  const example = copy(exercises[0].example);
  example[1].push(...example.splice(2, 1)[0]);
  assert.equal(assess(exercises[0], example).ok, false);
});

test('stow before release and missing combined gasket stowage are rejected', () => {
  const example = copy(exercises[0].example);
  [example[2], example[3]] = [example[3], example[2]];
  assert.equal(assess(exercises[0], example).ok, false);
  assert.equal(assess(exercises[0], exercises[0].example.slice(0, -1)).ok, false);
});

test('wrong topsail actions do not match either draft', () => {
  for (const exercise of exercises) {
    const answer = [[{ line: 'top-halyard', action: 'haul' }], ...exercise.example];
    assert.equal(assess(exercise, answer).index, 0);
  }
});

test('duplicate actions, empty steps and invalid actions are rejected', () => {
  const answer = copy(exercises[0].example);
  answer[0].push(answer[0][0]);
  assert.equal(assess(exercises[0], answer).ok, false);
  assert.equal(assess(exercises[0], [[]]).ok, false);
  assert.equal(assess(exercises[0], [[null]]).ok, false);
  assert.equal(assess(exercises[0], []).ok, false);
});

test('clewline easing is required in both distinct coordinated setting stages', () => {
  const example = copy(exercises[1].example);
  example[1] = example[1].filter(item => !item.line.startsWith('clew-'));
  assert.equal(assess(exercises[1], example).ok, false);
});

test('tacks, martnets and all coordinated sheet actions are required', () => {
  for (const prefix of ['tack-', 'martnet-', 'sheet-']) {
    const example = copy(exercises[1].example);
    example[1] = example[1].filter(item => !item.line.startsWith(prefix));
    assert.equal(assess(exercises[1], example).ok, false);
  }
});

test('belaying order may vary, but coiling before all belaying fails', () => {
  const exercise = exercises[1];
  const example = copy(exercise.example);
  assert.equal(assess(exercise, [
    example[0], example[1], ...example.slice(2, 13).reverse(), ...example.slice(13).reverse(),
  ]).ok, true);
  [example[2], example[13]] = [example[13], example[2]];
  assert.equal(assess(exercise, example).ok, false);
});

test('snapshots preserve initial state and yield both intended rig states', () => {
  const start = initialRig();
  const release = snapshots(start, exercises[0].example, 'release').at(-1);
  assert.equal(start.yard, 1);
  assert.deepEqual(start.released, []);
  assert.equal(release.yard, 0);
  assert.equal(release.sail, 1);
  assert.deepEqual(release.stowed, ['gasket']);
  const set = snapshots(release, exercises[1].example, 'set').at(-1);
  assert.equal(set.yard, 1);
  assert.equal(set.sheets, 1);
  assert.equal(set.belayed.length, 11);
  assert.equal(set.coiled.length, 11);
});

test('accepting an answer alone does not unlock exercise two; playback completion does', () => {
  const session = freshSession();
  assert.equal(assess(exercises[0], exercises[0].example).ok, true);
  assert.equal(session.completed[0], false);
  const final = snapshots(session.rig, exercises[0].example, 'release').at(-1);
  const completed = completePlayback(session, 0, final);
  assert.equal(completed.completed[0], true);
  assert.equal(completed.completed[1], false);
  assert.equal(session.completed[0], false);
});

test('out-of-order completion fails and reset clears answers and progress', () => {
  assert.throws(() => completePlayback(freshSession(), 1, initialRig()), /sequence/);
  const reset = freshSession();
  assert.deepEqual(reset.completed, [false, false]);
  assert.deepEqual(reset.answers, [[], []]);
  assert.equal(reset.rig.yard, 1);
});

test('each example step is accepted incrementally and completion is only reported on the last', () => {
  for (const exercise of exercises) {
    const accepted = [];
    for (const [index, step] of exercise.example.entries()) {
      const result = assessNextStep(exercise, accepted, step);
      assert.equal(result.ok, true);
      assert.equal(result.complete, index === exercise.example.length - 1);
      accepted.push(copy(step));
    }
  }
});

test('invalid current steps do not mutate accepted history or the rig', () => {
  const session = freshSession();
  const before = copy(session);
  for (const step of [[], [exercises[0].example[0][0]], exercises[0].example[1]]) {
    assert.equal(assessNextStep(exercises[0], session.answers[0], step).ok, false);
    assert.throws(() => completeStepPlayback(session, step, session.rig));
    assert.deepEqual(session, before);
  }
});

test('step completion updates the rig and history, but only the final animation unlocks the next exercise', () => {
  let session = freshSession();
  for (const [index, step] of exercises[0].example.entries()) {
    const before = copy(session);
    const assessment = assessNextStep(exercises[0], session.answers[0], step);
    assert.equal(assessment.ok, true);
    assert.deepEqual(session, before);
    const rig = applyStep(session.rig, step, 'release');
    const next = completeStepPlayback(session, step, rig);
    assert.deepEqual(session, before);
    assert.equal(next.answers[0].length, index + 1);
    assert.equal(next.completed[0], index === exercises[0].example.length - 1);
    session = next;
  }
  assert.throws(() => completeStepPlayback(session, exercises[0].example[0], session.rig));
  session = { ...session, exercise: 1 };
  for (const step of exercises[1].example) {
    session = completeStepPlayback(session, step, applyStep(session.rig, step, 'set'));
  }
  assert.deepEqual(session.completed, [true, true]);
  assert.equal(session.rig.sheets, 1);
});

test('incremental assessment accepts alternative belaying orders', () => {
  const setting = exercises[1].example;
  const alternatives = [
    [exercises[1], [setting[0], setting[1], ...setting.slice(2, 13).reverse(), ...setting.slice(13).reverse()]],
  ];
  for (const [exercise, steps] of alternatives) {
    const accepted = [];
    for (const step of steps) {
      assert.equal(assessNextStep(exercise, accepted, step).ok, true);
      accepted.push(step);
    }
    assert.equal(assess(exercise, accepted).ok, true);
  }
});

test('repeated accepted actions are rejected but stage-specific clewline easing remains valid', () => {
  const accepted = [copy(exercises[0].example[0])];
  assert.equal(assessNextStep(exercises[0], accepted, accepted[0]).ok, false);
  assert.equal(assessNextStep(exercises[1], [exercises[1].example[0]], exercises[1].example[1]).ok, true);
});
