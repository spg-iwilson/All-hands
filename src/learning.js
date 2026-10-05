export const REVIEW_NOTICE = 'UNVERIFIED TRAINING DRAFT — Not approved for use aboard Duyfken. Learn only under qualified supervision.';

const pairs = [
  ['lift', 'Course lift', ['ease', 'haul', 'belay', 'coil']],
  ['brace', 'Course brace', ['tend', 'ease', 'haul', 'belay', 'coil']],
  ['sheet', 'Course sheet', ['haul', 'ease', 'belay', 'coil']],
  ['clew', 'Course clewline', ['haul', 'ease', 'belay', 'coil']],
  ['martnet', 'Course martnet', ['haul', 'ease', 'belay', 'coil']],
  ['tack', 'Course tack', ['haul', 'ease', 'belay', 'coil']],
  ['top-sheet', 'Topsail sheet', ['haul', 'ease', 'belay', 'coil']],
  ['top-brace', 'Topsail brace', ['tend', 'haul', 'ease', 'belay', 'coil']],
];

export const lines = [
  ...pairs.flatMap(([kind, label, actions]) => ['port', 'starboard'].map(side => ({
    id: `${kind}-${side}`,
    kind,
    side,
    label: `${label} · ${side}`,
    actions,
  }))),
  { id: 'halyard', kind: 'halyard', label: 'Course halyard', actions: ['haul', 'ease', 'belay', 'coil'] },
  { id: 'top-halyard', kind: 'top-halyard', label: 'Topsail halyard', actions: ['haul', 'ease', 'belay', 'coil'] },
  {
    id: 'gasket',
    kind: 'gasket',
    label: 'Course gasket · all gaskets',
    actions: ['release', 'stow'],
  },
];

export const actionLabels = {
  ease: 'Ease', haul: 'Haul', tend: 'Tend continuously',
  belay: 'Belay', coil: 'Coil', release: 'Cast off', stow: 'Stow around halyard tye',
};

export const lineById = new Map(lines.map(line => [line.id, line]));
export const sailForLine = line => line.kind.startsWith('top-') ? 'top' : 'course';
export const pickerIdForLine = line => line.side ? line.kind : line.id;

export function lineChoices(sail) {
  return lines.filter(line => sailForLine(line) === sail)
    .filter((line, index, available) =>
      available.findIndex(candidate => pickerIdForLine(candidate) === pickerIdForLine(line)) === index);
}

export function pickerLines(lineId, sides) {
  const line = lineById.get(lineId);
  if (!line) throw new Error(`Unknown line ${lineId}.`);
  return line.side
    ? lines.filter(candidate => candidate.kind === line.kind && sides.includes(candidate.side))
    : [line];
}

export const key = action => `${action.line}:${action.action}`;
const action = (line, verb) => ({ line, action: verb });
const pair = (kind, verb) => ['port', 'starboard'].map(side => action(`${kind}-${side}`, verb));

const lifts = pair('lift', 'ease');
const lower = [action('halyard', 'ease'), ...pair('brace', 'tend')];
const hoist = [
  action('halyard', 'haul'), ...pair('brace', 'ease'),
  ...pair('sheet', 'ease'), ...pair('clew', 'ease'),
];
const spread = [
  ...pair('sheet', 'haul'), ...pair('tack', 'haul'),
  ...pair('clew', 'ease'), ...pair('martnet', 'ease'),
];
const securingLines = ['sheet', 'tack', 'brace', 'clew', 'martnet']
  .flatMap(kind => ['port', 'starboard'].map(side => `${kind}-${side}`))
  .concat('halyard');
const belay = securingLines.map(line => action(line, 'belay'));
const coil = securingLines.map(line => action(line, 'coil'));

// Clewlines are eased in two separate evolutions; occurrences are stage-specific.
function rulesFor(groups, dependencies) {
  const rules = groups.flatMap((group, stage) => group.map(item => ({
    ...item, stage, requires: dependencies[stage] ?? [],
    together: group.length > 1 ? group.map(key) : [],
  })));
  return rules;
}

const gasketRelease = [action('gasket', 'release')];
const gasketStow = [action('gasket', 'stow')];
const lowerRules = [
  ...rulesFor([lifts, lower], [[], lifts.map(key)]),
  ...gasketRelease.map(item => ({ ...item, stage: 2, requires: lower.map(key), together: [] })),
  ...gasketStow.map(item => ({
    ...item, stage: 3, requires: [`${item.line}:release`], together: [],
  })),
];
const setRules = [
  ...rulesFor([hoist, spread], [[], hoist.map(key)]),
  ...belay.map(item => ({ ...item, stage: 2, requires: spread.map(key), together: [] })),
  ...coil.map(item => ({ ...item, stage: 3, requires: belay.map(key), together: [] })),
];

export const exercises = [
  {
    id: 'release', title: 'Lower course to loose sail',
    description: 'Lower the main course yard, release its furled sail, and stow the gaskets.',
    start: 'Both yards raised. Both sails furled.',
    finish: 'Course yard on its lifts; course unfurled but clewed up, martnets hauled in, and gaskets stowed. Topsail unchanged.',
    rules: lowerRules,
    example: [
      lifts, lower,
      gasketRelease, gasketStow,
    ],
    notes: [
      'Ease both course lifts to their marks together.',
      'Ease the course halyard while continuously tending both course braces; stop when the yard rests on its lifts.',
      'The single gasket control represents all course gaskets. Cast off all, then stow all around the halyard tye.',
      'Line securing at the end of this evolution is unresolved. This draft omits it; this is not approval to leave lines unsecured.',
    ],
  },
  {
    id: 'set', title: 'Set the main course',
    description: 'Raise the course yard, spread the sail, then belay and coil the handled lines.',
    start: 'Course yard on its lifts; course unfurled but gathered, clews raised, martnets hauled in, and gaskets stowed. Topsail raised and furled.',
    finish: 'Course yard raised; course sheeted home; handled lines belayed and coiled. Topsail unchanged.',
    rules: setRules,
    example: [hoist, spread, ...belay.map(item => [item]), ...coil.map(item => [item])],
    notes: [
      'Haul the course halyard while easing both braces, sheets, and clewlines.',
      'Haul both sheets and tacks while easing both clewlines and martnets.',
      'Draft sheet target: slack taken up and leeches extended. Tack target: slack taken up.',
      'Belay sheets, tacks, braces, halyard, clewlines, and martnets in any order. Coil after all are belayed.',
      'Both-tack handling and stopping conditions need qualified review.',
    ],
  },
];

export function describeAction(item) {
  const line = lineById.get(item.line);
  return `${actionLabels[item.action] ?? item.action}: ${line?.label ?? item.line}`;
}

export function assess(exercise, steps, { allowPartial = false } = {}) {
  const remaining = [...exercise.rules];
  const completed = new Set();
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    if (!Array.isArray(step) || step.length === 0) {
      return { ok: false, index, message: 'An empty step cannot be assessed. Add an action or remove it.' };
    }
    const selected = [];
    const stepKeys = new Set();
    for (const item of step) {
      if (!item || typeof item.line !== 'string' || typeof item.action !== 'string') {
        return { ok: false, index, message: 'This step contains an invalid action.' };
      }
      const id = key(item);
      if (stepKeys.has(id)) {
        return { ok: false, index, message: `Remove the repeated action: ${describeAction(item)}.` };
      }
      stepKeys.add(id);
      const rule = remaining.find(candidate => key(candidate) === id);
      if (!rule) {
        return { ok: false, index, message: `${describeAction(item)} is not a remaining action in this draft. Keep the topsail unchanged.` };
      }
      const missing = rule.requires.filter(required => !completed.has(required));
      if (missing.length) {
        const prerequisite = exercise.rules.find(candidate => key(candidate) === missing[0]);
        return {
          ok: false, index,
          message: `Before ${describeAction(item)}, complete ${describeAction(prerequisite)} in an earlier step.`,
        };
      }
      selected.push(rule);
    }
    for (const rule of selected) {
      const missing = rule.together.filter(required => !stepKeys.has(required));
      if (missing.length) {
        const partner = remaining.find(candidate => key(candidate) === missing[0]);
        return {
          ok: false, index,
          message: `${describeAction(rule)} must happen together with ${describeAction(partner)}. Group the coordinated actions in one step.`,
        };
      }
    }
    for (const rule of selected) {
      remaining.splice(remaining.indexOf(rule), 1);
      completed.add(key(rule));
    }
  }
  if (remaining.length && !allowPartial) {
    return { ok: false, index: steps.length, message: `Missing action: ${describeAction(remaining[0])}.` };
  }
  return {
    ok: true, complete: remaining.length === 0,
    message: 'Matches the draft. This is not qualified approval of the procedure.',
  };
}

export function assessNextStep(exercise, acceptedSteps, step) {
  return assess(exercise, [...acceptedSteps, step], { allowPartial: true });
}

export const initialRig = () => ({
  yard: 1, lifts: 0, sail: 0, sheets: 0,
  released: [], stowed: [], belayed: [], coiled: [],
});

export function applyStep(rig, step, exerciseId) {
  const next = {
    ...rig, released: [...rig.released], stowed: [...rig.stowed],
    belayed: [...rig.belayed], coiled: [...rig.coiled],
  };
  for (const item of step) {
    if (item.line.startsWith('lift-') && item.action === 'ease') next.lifts = 1;
    if (item.line === 'halyard') {
      if (item.action === 'ease') next.yard = 0;
      if (item.action === 'haul') next.yard = 1;
    }
    if (item.action === 'release') next.released.push(item.line);
    if (item.action === 'stow') next.stowed.push(item.line);
    if (item.action === 'belay') next.belayed.push(item.line);
    if (item.action === 'coil') next.coiled.push(item.line);
    if (exerciseId === 'set' && item.line.startsWith('sheet-') && item.action === 'haul') next.sheets = 1;
  }
  next.sail = next.released.includes('gasket') ? 1 : 0;
  return next;
}

export function snapshots(start, steps, exerciseId) {
  const states = [start];
  for (const step of steps) states.push(applyStep(states.at(-1), step, exerciseId));
  return states;
}

export function freshSession() {
  return { exercise: 0, completed: [false, false], rig: initialRig(), answers: [[], []] };
}

export function completePlayback(session, exerciseIndex, finalRig) {
  if (exerciseIndex !== session.exercise || (exerciseIndex === 1 && !session.completed[0])) {
    throw new Error('Cannot complete an exercise out of sequence.');
  }
  return {
    ...session, rig: finalRig,
    completed: session.completed.map((done, index) => index === exerciseIndex || done),
  };
}

export function completeStepPlayback(session, step, finalRig) {
  const index = session.exercise;
  if (session.completed[index] || (index === 1 && !session.completed[0])) {
    throw new Error('Cannot complete a step outside the active exercise.');
  }
  const result = assessNextStep(exercises[index], session.answers[index], step);
  if (!result.ok) throw new Error(result.message);
  const next = {
    ...session, rig: finalRig,
    answers: session.answers.map((answer, position) =>
      position === index ? [...answer, structuredClone(step)] : answer),
  };
  return result.complete ? completePlayback(next, index, finalRig) : next;
}
