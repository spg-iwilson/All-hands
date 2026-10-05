# Duyfken Sail-Handling Learning App

## Status

User confirmed the shared design and authorised implementation of a clearly
labelled draft app. Both exercise procedures remain unverified drafts, not
approved operating instructions. The app is a learning aid for supervised
training, not an operational authority.

## Audience and release scope

- Beginners preparing for supervised training on Duyfken, with no assumed
  square-rig experience.
- Hosted static browser app, without a backend or sign-in.
- Desktop and tablet, with mouse and touch controls.
- Mainmast, main course, main topsail, and the lines needed for two exercises.
- Line orientation and one worked example before the exercises.
- No progress persistence. Reloading starts the sequence again.

## Source material

- [Duyfken volunteer guide notes](./Duyfken%20Notes%20vs2.pdf):
  historical and rig context.
- [Duyfken deck training](./Deck%20crew%20training%20V2.1%20highlighted.pdf):
  line identification, line relationships, and training context.

The inspected material does not establish complete procedures and starting
conditions for these exercises. User-supplied drafts require review by a
person qualified to teach sail handling on Duyfken. Document currency and
applicable approval must also be confirmed.

## Visual model

Aim for a visually realistic Duyfken rig, provisionally based on the supplied
PDFs. Flag missing visual evidence for review rather than presenting inferred
details as verified. Do not simulate rope tension or cloth physics.

The bottom of the mast is a proposed visual reference for course-lift marks,
not a confirmed onboard reference. The raised course yard target in exercise
2 is also provisional.

Represent manual gasket handling with highlighting, state changes, and
captions, without demonstrating an unverified hand technique.

The current implementation uses one combined gasket control and illustrative
visual placeholder to represent all course gaskets, not a verified count.
One cast-off action releases all; one subsequent stow action stows all.
Individual gasket handling is not assessed. Actual gasket identification and
count remain review items.

## Answer building and assessment

Learners select named actions and lines to build one current step at a time.
Coordinated actions belong to the same step; each step must be submitted and
its animation finished before entering the next. There is no step-grouping control.

The command section has three tabs: Action (action picker, pending step, and
Submit), Accepted steps (read-only history for the current command), and
Conditions (starting and target conditions). Tabs support keyboard navigation.

Line selection works through either the 3D rig or labelled controls. Selection
and highlighting stay in sync between the two. Offer all modelled lines with
applicable actions, not just the correct choices for the current exercise.
Only handling lines for the sail selected in the action picker are visible
and pickable in the illustration, including during playback. Coils and lift
marks follow that visibility; standing rigging remains visible.
Line picking uses a 12 CSS-pixel tolerance, independent of zoom and display
pixel density. The closest visible handling line is selected; overlapping
lines prefer the nearer camera depth. A label beside the picked line follows
the rig and camera. Clicking the same line dismisses it, selecting another
replaces it, and using an Action-tab control dismisses it. Empty rig clicks
also dismiss the label.

The picker separates sail (Course or Top), line, and action. Port and Starboard
checkboxes allow either or both sides of paired lines; both creates two actions
in the current coordinated step. Unpaired halyards and the combined gasket control
disable side selection. Model picking synchronises these fields.

Allow adding, removing, and clearing actions in the current step. Accepted
steps become read-only history after their animation finishes; there is no
whole-sequence reordering or drag-and-drop in this incremental flow.

Keep the worked example available on request while answering. It is a learning
aid rather than a certification test, and retains the draft warning.

Accept alternative orderings and coordinated actions according to each
exercise's rules. Reviewed rules must ultimately come from the qualified
reviewer; current draft rules are not evidence of operational validity.

Check each submitted step against the already accepted history. For an
incorrect submission, explain the first error and retain the step for revision.
The rig remains unchanged. A matching step animates immediately; the learner
cannot enter or submit the next step until that animation finishes.
Explanations must distinguish draft assumptions from reviewed source material.

Draft exercises remain learner-accessible with a prominent unverified-content
warning. Successful draft submissions say "Matches the draft," not "Correct."
Keep the warning visible during playback.

## Linked exercises

### 1. Lower course to loose sail

Intent: lower the main course yard and release the furled main course sail.

Starting state:

- Main course yard raised; main course sail furled.
- Main topsail yard raised; main topsail sail furled.

User-supplied draft:

1. Ease both course lifts together to their marks.
2. Ease the course halyard while continuously tending both course braces.
   Stop when the course yard rests on its lifts.
3. Cast off every gasket securing the main course sail.
4. Coil every released course gasket around the halyard tye.

The app groups every gasket into one control: cast off all, then stow all in
a later step. Real individual-gasket release and stowage may be interleaved,
but that ordering is not represented by this combined control.

Intended end state: main course yard supported by its lifts, main course
unfurled, and course gaskets stowed. The main topsail yard remains raised and
its sail remains furled.

Releasing the gaskets does not spread the course sail: its clews remain raised
and martnets hauled in, leaving gathered cloth below the yard. That gathered
shape follows the yard during the hoist. The sail spreads downward and outward
only during the coordinated sheet/tack hauling and clewline/martnet easing
step of exercise 2. Cloth shape and rope attachment points are illustrative,
not a verified physical simulation.

Gasket stowage is the last specified draft action. Whether and when the
handled lines must be secured remains unresolved, not intentionally excluded.

### 2. Set the main course

Starts from exercise 1's intended end state.

User-supplied draft:

1. Haul the course halyard while easing the course braces, sheets, and
   clewlines. Stop at the provisional normal working position.
2. Haul both course sheets and both course tacks while easing the clewlines
   and martnets. The draft sheet stopping condition is that slack is taken
   up and the sail's leeches reach their full extent; tack hauling takes
   up slack.
3. Belay the course sheets, tacks, braces, halyard, clewlines, and martnets.
   Their belaying order is unrestricted in the draft, pending review.
4. Coil the handled lines after they are belayed.

Intended end state: course yard at its normal working position, main course
sheeted home, and the specified lines belayed and coiled. The main topsail
yard remains raised and its sail remains furled.

## Playback and lifecycle

- Animate each accepted step immediately, not a single canonical sequence.
- Grouped actions animate together.
- Provide pause, replay, and step-forward controls, with active-line highlights.
- Unlock exercise 2 only after exercise 1's final accepted step finishes animating.
- "Start again" resets the rig and both answers to the initial state.
- Reloading also resets the sequence.
- Replay accepted steps does not alter exercise progress or the pending step,
  and restores the rig to the last accepted state before resuming input.

## Outstanding review and design decisions

Qualified review must resolve or approve:

- Complete procedures, dependencies, coordinated actions, and alternative orders.
- Exercise 1 line securing and its suitability as exercise 2's starting state.
- Actual stopping references for lift easing and yard hoisting.
- Sheet stopping conditions and both-tack handling, including any wind/tack
  conditions omitted from the draft.
- Gasket identification, number, stowage, and visual representation.
- Rig geometry, line routing, and gaps in PDF-based visual evidence.
- Safety context and the limits of learner-facing unverified content.

The exact orientation/worked-example content and unresolved vessel details must
be labelled provisional where necessary. Implementation approval is not approval
of the operating procedures.
