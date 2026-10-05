# Duyfken Sail-Handling Studio

A static browser learning prototype for beginners preparing for supervised
training on the Duyfken replica.

**Unverified training draft: not approved for use aboard Duyfken.** Success
means "Matches the draft," not qualified approval. The app does not replace
supervision or operational training.

## Run

Use Node.js 22.12+ or a supported newer release.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Desktop and tablet layouts are supported.
The 3D rig requires WebGL and browser hardware acceleration; graphics failures
are surfaced explicitly and block assessment playback/unlocking.

```powershell
npm test
npm run build
npm run preview
```

The VS Code **Build Duyfken app** task also runs the production build.
Deploy the contents of `dist` to a static HTTPS host. The source training PDF
is bundled into the build; confirm permission for your intended distribution.
No backend, sign-in, runtime CDN, or progress storage is required.

## Learning flow

1. Read the line orientation. The worked example remains available on request.
2. Choose the sail (Course or Top), line, and action. For paired lines, check
   Port, Starboard, or both; both adds the two sides to the same coordinated
   step. Halyards and the combined gasket control are unpaired and disable side
   selection. Picking a model line also updates the sail, line, and side controls.
   Add all simultaneous actions to the current step.
   The Action tab contains these controls and Submit; Accepted steps shows
   read-only history for the current command; Conditions shows its starting
   and target conditions. Only the selected sail's handling lines are shown
   in the illustration; standing rigging remains visible.
   Click within 12 screen pixels of a handling line to select it. Its label
   follows the line until clicked again, replaced by another line selection,
   or dismissed by using an Action-tab control.
3. Submit one step at a time. Incorrect submissions explain the first error,
   retain the editable step, and do not move the rig.
4. A matching step animates immediately. Pause, resume, or step forward; finish
   playback before entering the next step. Finished steps become read-only
   history. Replay accepted steps without changing progress or a pending step.
   The second exercise unlocks only after the first exercise's final accepted
   step finishes animating.
5. Complete the linked course-setting exercise. Completed exercises can be
   revisited and replayed without changing progress.
6. "Start again" or a page reload resets the sequence and both answers.

## Scope and limitations

Two linked draft commands:

- Lower course to loose sail.
- Set the main course.

The main topsail remains raised and furled throughout both exercises.
Releasing course gaskets reveals gathered cloth with raised clews and hauled-in
martnets, not a fully spread sail. It stays gathered through the yard hoist,
then spreads when sheets are hauled while clewlines and martnets are eased.
The model is a visually provisional instructional rig, not a measured
reconstruction: dimensions, routing, and stop references require review. It
does not simulate rope tension or cloth physics. One combined gasket control
represents all course gaskets: cast off once to release all, then stow once to
stow all. Its single visual placeholder is not Duyfken's verified gasket count.

Unresolved items include line securing after the first exercise, both-tack
handling and wind conditions, stopping marks, gasket stowage, and complete
procedure review. The app exposes these limitations rather than silently
claiming authoritative answers.

See the [confirmed design and draft exercise specification](./docs/learning-app-spec.md)
and [domain glossary](./GLOSSARY.md).

## Structure

- [Exercise data and assessment](./src/learning.js): draft rules, ordering
  dependencies, coordination, and rig-state transitions.
- [Learning interface](./src/main.js): answer building, exercise lifecycle,
  feedback, and accepted-answer playback.
- [3D view](./src/scene.js): procedural Three.js model, OrbitControls, and line
  picking.
- [Assessment tests](./tests/learning.test.js): draft examples, accepted
  alternative orders, missing/incorrect actions, coordination, rig snapshots,
  unlocking, and reset.

The rule data deliberately distinguishes repeated clewline easing in the
hoisting and sail-spreading stages. Changes to content must update rules,
examples, tests, and the specification together, with qualified review before
being represented as approved training material.
