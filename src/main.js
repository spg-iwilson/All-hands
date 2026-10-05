import './style.css';
import {
  REVIEW_NOTICE, lineById, actionLabels, exercises, describeAction,
  sailForLine, pickerIdForLine, lineChoices, pickerLines,
  assessNextStep, initialRig, snapshots, freshSession, completeStepPlayback,
} from './learning.js';
import { createRigView } from './scene.js';

const escape = text => String(text).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const pdf = new URL('../docs/Deck crew training V2.1 highlighted.pdf', import.meta.url).href;
let session = freshSession();
let selectedLine = 'lift-port';
let selectedAction = 'ease';
let selectedSides = ['port'];
let pendingSteps = [[], []];
let playback = null;
let graphicsReady = false;
let view;
const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 1500;

document.querySelector('#app').innerHTML = `
  <header class="masthead">
    <a class="brand" href="./" aria-label="Duyfken sail-handling studio">
      <span class="brand-mark" aria-hidden="true">D</span>
      <span>DUYFKEN<small>SAIL-HANDLING STUDIO</small></span>
    </a>
    <div class="header-actions">
      <span class="draft-pill">REVIEW PENDING</span>
      <button id="orientation-open" class="quiet">Line orientation</button>
      <button id="reset" class="quiet">Start again</button>
    </div>
  </header>
  <div class="warning" role="note"><strong>UNVERIFIED TRAINING DRAFT</strong>
    <span>Not approved for use aboard Duyfken. Learn only under qualified supervision.</span>
    <button id="review-open">View limitations</button>
  </div>
  <main>
    <section class="rig-panel" aria-label="Interactive rig">
      <div class="rig-heading"><div><span class="eyebrow">EXPLORE THE RIG</span><h1>The mainmast</h1></div>
        <button id="camera-reset" class="quiet">Reset view</button></div>
      <div id="rig"></div>
      <div class="rig-label"><span class="status-dot"></span> PROVISIONAL GEOMETRY · NO PHYSICAL SIMULATION</div>
      <div class="rig-toolbar">
        <span>Drag to orbit · scroll / pinch to zoom · select a line</span>
        <strong id="rig-state">Both yards raised · both sails furled</strong>
      </div>
      <div class="selection-readout"><span class="eyebrow">SELECTED LINE</span>
        <strong id="selected-label"></strong><span>Teal highlight links the model and controls.</span></div>
      <div id="playback-panel"></div>
      <p class="geometry-note">Illustrative rig, routing, and stopping marks. One combined gasket control represents
        all course gaskets, <strong>not a verified gasket count</strong>. The mast-base reference is app-only.</p>
    </section>
    <section class="lesson-panel" aria-label="Learning exercises">
      <nav id="exercise-nav" aria-label="Linked exercises"></nav>
      <div id="mission"></div>
      <div class="command-tabs" role="tablist" aria-label="Command details">
        <button id="tab-action" role="tab" aria-controls="panel-action" aria-selected="true" data-tab="action">Action</button>
        <button id="tab-accepted" role="tab" aria-controls="panel-accepted" aria-selected="false" tabindex="-1" data-tab="accepted">Accepted steps</button>
        <button id="tab-conditions" role="tab" aria-controls="panel-conditions" aria-selected="false" tabindex="-1" data-tab="conditions">Conditions</button>
      </div>
      <div id="panel-action" role="tabpanel" aria-labelledby="tab-action">
        <div id="builder"></div>
        <div class="submit-row">
          <button id="assess" class="primary">Submit this step <span aria-hidden="true">→</span></button>
          <button id="example-open" class="quiet">View worked example</button>
        </div>
      </div>
      <div id="panel-accepted" role="tabpanel" aria-labelledby="tab-accepted" hidden></div>
      <div id="panel-conditions" role="tabpanel" aria-labelledby="tab-conditions" hidden></div>
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
      <button id="continue" class="primary continue" hidden>Continue to set the main course →</button>
    </section>
  </main>
  <footer>Built for learning, not certification. <a href="${escape(pdf)}" target="_blank" rel="noopener">Source: Duyfken deck training PDF</a>
    <span>No accounts · no saved progress</span></footer>
  <dialog id="orientation">
    <button class="dialog-close quiet" data-close="orientation" aria-label="Close orientation">Close</button>
    <span class="eyebrow">BEFORE YOU BEGIN</span><h2>One mast. Two linked evolutions.</h2>
    <p>Practise identifying the lines, assembling a procedure, and recognising which actions must happen together.</p>
    <div class="dialog-warning">${escape(REVIEW_NOTICE)}</div>
    <dl class="orientation-list">
      <dt>Course / topsail</dt><dd>The lower square sail and the sail above it. A sail and the yard that carries it have separate states.</dd>
      <dt>Halyard / lifts</dt><dd>The halyard raises or lowers the yard in this draft. The lifts support its ends.</dd>
      <dt>Braces</dt><dd>Control a yard's horizontal orientation. In the lowering draft they are tended continuously.</dd>
      <dt>Sheets / tacks</dt><dd>Handle the sail's lower corners. This draft's both-tack handling requires review.</dd>
      <dt>Clewlines / martnets</dt><dd>Lines involved in gathering the sail. Their easing is coordinated with spreading it in this draft.</dd>
      <dt>Gaskets</dt><dd>Secure the furled sail. One combined control represents all course gaskets; the real arrangement needs review.</dd>
      <dt>Leech</dt><dd>A side edge of the sail, not its bottom edge.</dd>
    </dl>
    <p>Port/starboard labels refer to the vessel, not the screen. Geometry and deck placement are provisional.
      Pick lines in the model or use the labelled selector. Add all actions that must happen together
      to the current step, then submit it. A matching step animates before you enter the next.
      Each line can be selected again for later actions.</p>
    <button class="primary" data-close="orientation">Begin draft practice</button>
  </dialog>
  <dialog id="review">
    <button class="dialog-close quiet" data-close="review">Close</button>
    <span class="eyebrow">REVIEW REGISTER</span><h2>What is still unverified</h2>
    <div class="dialog-warning">${escape(REVIEW_NOTICE)}</div>
    <ul class="review-list">
      <li>Both complete procedures, their coordinated actions, and alternative orders.</li>
      <li>Line securing after lowering/releasing; its suitability as the next exercise's starting state.</li>
      <li>Course-lift marks and the mast-bottom reference, which is an app-only simplification.</li>
      <li>The raised-yard target and sheet stopping conditions.</li>
      <li>Both-tack handling, including missing wind/tack conditions.</li>
      <li>Gasket count, identification, stowage, line routing, and rig dimensions.</li>
      <li>Currency of the supplied training material and safety context.</li>
    </ul>
    <p>No qualified reviewer approval has been recorded. A successful answer matches only the user-supplied draft.</p>
  </dialog>
  <dialog id="example">
    <button class="dialog-close quiet" data-close="example">Close</button>
    <span class="eyebrow">ON-DEMAND LEARNING AID</span><h2 id="example-title"></h2>
    <div class="dialog-warning">${escape(REVIEW_NOTICE)}</div>
    <div id="example-content"></div>
    <p>This is one matching ordering, not the only ordering the draft accepts. Viewing it does not unlock the next exercise.</p>
  </dialog>
`;

const $ = selector => document.querySelector(selector);
const isRunning = () => playback !== null && !playback.finished;
const isLocked = () => isRunning() || session.completed[session.exercise];

function message(text, type = 'info') {
  $('#feedback').textContent = text;
  $('#feedback').className = `feedback ${type}`;
}

function selectTab(name) {
  for (const tab of document.querySelectorAll('[data-tab]')) {
    const active = tab.dataset.tab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    $(`#panel-${tab.dataset.tab}`).hidden = !active;
  }
}

function selectLine(id) {
  if (!lineById.has(id)) throw new Error(`Unknown line ${id}.`);
  view?.dismissLineLabel();
  const retainSelectorFocus = document.activeElement?.id === 'line-select';
  selectedLine = id;
  const line = lineById.get(id);
  if (line.side) selectedSides = [line.side];
  if (!line.actions.includes(selectedAction)) selectedAction = line.actions[0];
  updatePickerHighlight();
  renderBuilder();
  if (retainSelectorFocus) $('#line-select').focus();
}

function updatePickerHighlight() {
  const selected = pickerLines(selectedLine, selectedSides);
  view?.showSailLines(sailForLine(lineById.get(selectedLine)));
  $('#selected-label').textContent = selected.length
    ? selected.map(line => line.label).join(' / ')
    : 'No side selected';
  view?.highlight(selected.map(line => line.id));
}

function renderMission() {
  const exercise = exercises[session.exercise];
  $('#exercise-nav').innerHTML = exercises.map((item, index) => `
    <button data-exercise="${index}" ${index === 1 && !session.completed[0] ? 'disabled' : ''}
      ${isRunning() ? 'disabled' : ''} aria-current="${index === session.exercise ? 'step' : 'false'}">
      <span class="step-badge">${session.completed[index] ? '✓' : `0${index + 1}`}</span>
      <span>${index === 0 ? 'Lower & release' : 'Set the course'}<small>${index === 1 && !session.completed[0] ? 'Finish all first-exercise steps to unlock' : 'Unverified exercise'}</small></span>
    </button>`).join('');
  $('#mission').innerHTML = `
    <span class="eyebrow">COMMAND ${session.exercise + 1} OF 2 <span class="draft-tag">DRAFT</span></span>
    <h2>${exercise.title}</h2><p>${exercise.description}</p>`;
  $('#panel-conditions').innerHTML = `
    <div class="state-box"><span class="eyebrow">STARTING CONDITION</span><p>${exercise.start}</p>
      <span class="eyebrow">TARGET CONDITION</span><p>${exercise.finish}</p></div>
    ${session.exercise === 0 ? '<p class="inline-caution">Line securing after this evolution remains unresolved. This is a draft-content gap, not permission to leave lines unsecured.</p>' : ''}`;
  $('#continue').hidden = !(session.exercise === 0 && session.completed[0] && !isRunning());
  $('#continue').disabled = !graphicsReady;
  $('#assess').disabled = !graphicsReady || isLocked();
}

function renderBuilder() {
  const answer = session.answers[session.exercise];
  const pending = pendingSteps[session.exercise];
  const disabled = isLocked() ? 'disabled' : '';
  const currentLine = lineById.get(selectedLine);
  const sail = sailForLine(currentLine);
  const choices = lineChoices(sail);
  $('#builder').innerHTML = `
    <div class="builder-heading"><h3>${session.completed[session.exercise] ? 'Exercise complete' : `Current step ${answer.length + 1}`}</h3><span>${answer.length} accepted</span></div>
    <p class="muted">Submit this step and finish its animation before entering the next.</p>
    <fieldset class="action-picker" ${disabled}><legend>Add an action</legend>
      <div class="picker-row">
        <label>Sail<select id="sail-select"><option value="course" ${sail === 'course' ? 'selected' : ''}>Course</option><option value="top" ${sail === 'top' ? 'selected' : ''}>Top (topsail)</option></select></label>
        <label>Line<select id="line-select">${choices.map(line => `<option value="${pickerIdForLine(line)}" ${pickerIdForLine(line) === pickerIdForLine(currentLine) ? 'selected' : ''}>${escape(line.label.replace(/^(Course|Topsail) /, '').replace(/ · (port|starboard)$/, ''))}</option>`).join('')}</select></label>
      </div>
      <fieldset class="side-picker" ${currentLine.side ? '' : 'disabled'}><legend>Sides</legend>
        <label><input id="side-port" type="checkbox" ${currentLine.side && selectedSides.includes('port') ? 'checked' : ''}> Port</label>
        <label><input id="side-starboard" type="checkbox" ${currentLine.side && selectedSides.includes('starboard') ? 'checked' : ''}> Starboard</label>
      </fieldset>
      ${currentLine.side ? '<p class="muted">Select one or both sides. Both adds two coordinated actions.</p>' : '<p class="muted">This line is unpaired; side selection does not apply.</p>'}
      <div class="picker-row"><label>Action<select id="action-select">${lineById.get(selectedLine).actions.map(verb => `<option value="${verb}" ${verb === selectedAction ? 'selected' : ''}>${actionLabels[verb]}</option>`).join('')}</select></label></div>
      <button id="add-action" class="secondary">+ Add to current step</button>
    </fieldset>
    ${!session.completed[session.exercise] ? `
      <div class="step-card" data-current-step>
        <div class="card-heading"><strong>STEP ${answer.length + 1}</strong></div>
        <ul>${pending.map((item, index) => `<li><button class="action-label" data-highlight="${item.line}">${escape(describeAction(item))}</button>
          <button class="icon-button" data-remove-action="${index}" aria-label="Remove ${escape(describeAction(item))}" ${disabled}>×</button></li>`).join('')}</ul>
        ${pending.length === 0 ? '<p class="muted">Select a line and action to begin this step.</p>' : ''}
      </div>
      <button id="clear-answer" class="quiet" ${pending.length === 0 || disabled ? 'disabled' : ''}>Clear current step</button>` : ''}`;
  $('#panel-accepted').innerHTML = `
    <div class="builder-heading"><h3>Accepted steps</h3><span>${answer.length} accepted · read-only</span></div>
    ${answer.length === 0 ? '<p class="muted">No steps accepted for this command yet.</p>' : ''}
    <ol class="sequence" aria-label="Accepted steps">${answer.map((step, index) => `
      <li class="step-card"><div class="card-heading"><strong>STEP ${index + 1} · MATCHES THE DRAFT</strong></div>
        <ul>${step.map(item => `<li><button class="action-label" data-highlight="${item.line}">${escape(describeAction(item))}</button></li>`).join('')}</ul></li>`).join('')}</ol>`;
}

function updateRigText(rig) {
  $('#rig-state').textContent = `Course yard ${rig.yard > 0.95 ? 'raised' : rig.yard < 0.05 ? 'on its lifts' : 'moving'} · course ${rig.sail > 0.95 ? (rig.sheets > 0.95 ? 'sheeted home' : rig.sheets > 0.05 ? 'spreading' : 'unfurled but gathered · clews raised / martnets hauled in') : rig.sail < 0.05 ? 'furled' : 'partly released · still gathered'} · topsail raised & furled`;
}

function renderPlayback() {
  const panel = $('#playback-panel');
  if (!playback) { panel.innerHTML = ''; return; }
  const caption = playback.finished ? (session.completed[session.exercise] ? 'Draft exercise complete' : 'Draft step complete')
    : playback.replay ? `Replay step ${playback.index + 1} of ${playback.steps.length}`
    : `Animating step ${session.answers[session.exercise].length + 1}`;
  const current = playback.steps[Math.min(playback.index, playback.steps.length - 1)];
  panel.innerHTML = `
    <div class="playback-caption"><span class="eyebrow">${caption}</span>
      <p>${current.map(describeAction).map(escape).join('<br>')}</p></div>
    <progress max="${playback.steps.length}" value="${playback.index}" aria-label="Animation progress"></progress>
    <div class="playback-controls">
      <button id="pause-playback" class="secondary" ${playback.finished ? 'disabled' : ''}>${playback.paused ? 'Resume' : 'Pause'}</button>
      <button id="step-playback" class="quiet" ${playback.finished ? 'disabled' : ''}>Step forward</button>
      <button id="replay" class="quiet" ${!playback.finished ? 'disabled' : ''}>Replay accepted steps</button>
    </div><p class="playback-warning">UNVERIFIED · Matching this draft is not operational approval.</p>`;
}

function finishPlayback() {
  if (!playback || playback.finished) return;
  playback.finished = true;
  const final = playback.states.at(-1);
  view.update(final);
  updateRigText(final);
  if (!playback.replay) {
    session = completeStepPlayback(session, playback.steps[0], final);
    pendingSteps[playback.exercise] = [];
  }
  updatePickerHighlight();
  renderMission();
  renderBuilder();
  renderPlayback();
  message(playback.replay ? 'Replay finished. Your accepted steps and progress are unchanged.'
    : session.completed.every(Boolean) ? 'Both exercises match the draft. No qualified approval is implied.'
    : session.completed[session.exercise] ? 'Matches the draft. Final step finished; the second exercise is now available.'
    : 'Step matches the draft. Animation finished; enter the next step.', 'success');
  if (!isLocked() && !$('#panel-action').hidden) $('#line-select').focus();
}

function exerciseStart(index) {
  return index === 0
    ? initialRig()
    : snapshots(initialRig(), session.answers[0], 'release').at(-1);
}

function startPlayback(steps, replay = false) {
  if (!graphicsReady) { message('The rig is unavailable. Reload after resolving the graphics error.', 'error'); return; }
  const start = replay ? exerciseStart(session.exercise)
    : snapshots(exerciseStart(session.exercise), session.answers[session.exercise], exercises[session.exercise].id).at(-1);
  playback = {
    steps: structuredClone(steps), states: snapshots(start, steps, exercises[session.exercise].id),
    index: 0, elapsed: 0, last: performance.now(), paused: false, finished: false,
    replay, exercise: session.exercise,
  };
  view.update(start);
  updateRigText(start);
  view.highlight(steps[0].map(item => item.line));
  renderMission();
  renderBuilder();
  renderPlayback();
}

function frame(now) {
  if (playback && !playback.finished && !playback.paused && graphicsReady) {
    playback.elapsed += Math.min(now - playback.last, 100);
    const from = playback.states[playback.index];
    const to = playback.states[playback.index + 1];
    const t = Math.min(playback.elapsed / duration, 1);
    const eased = t * t * (3 - 2 * t);
    const rig = { ...(t === 1 ? to : from) };
    for (const property of ['yard', 'lifts', 'sail', 'sheets']) rig[property] = from[property] + (to[property] - from[property]) * eased;
    view.update(rig);
    updateRigText(rig);
    if (t === 1) {
      playback.index++;
      playback.elapsed = 0;
      if (playback.index === playback.steps.length) finishPlayback();
      else {
        view.highlight(playback.steps[playback.index].map(item => item.line));
        renderPlayback();
      }
    }
  }
  if (playback) playback.last = now;
  requestAnimationFrame(frame);
}

function changeExercise(index) {
  if (isRunning() || (index === 1 && !session.completed[0])) return;
  if (index === session.exercise) return;
  session.exercise = index;
  selectTab('action');
  playback = null;
  let displayedRig = exerciseStart(index);
  if (session.answers[index].length) {
    const steps = session.answers[index];
    const states = snapshots(displayedRig, steps, exercises[index].id);
    playback = {
      steps: structuredClone(steps), states, index: steps.length, elapsed: 0,
      last: performance.now(), paused: false, finished: true, replay: true,
      exercise: index,
    };
    displayedRig = states.at(-1);
  }
  view?.update(displayedRig);
  updateRigText(displayedRig);
  renderMission();
  renderBuilder();
  renderPlayback();
  message(session.completed[index]
    ? 'Review or replay this accepted draft answer. Replay does not change your progress.'
    : 'Use the first evolution’s final state to build the second draft sequence.');
}

function editAnswer(mutator, focusSelector = '#add-action') {
  if (isLocked()) return;
  mutator(pendingSteps[session.exercise]);
  message('Current step changed. Submit it when all coordinated actions are included.');
  renderBuilder();
  $(focusSelector)?.focus();
}

document.addEventListener('change', event => {
  if (event.target.closest('#panel-action')) view?.dismissLineLabel();
  if (event.target.id === 'sail-select' || event.target.id === 'line-select') {
    const focusId = event.target.id;
    const sail = focusId === 'sail-select' ? event.target.value : sailForLine(lineById.get(selectedLine));
    const choices = lineChoices(sail);
    const choice = choices.find(line => pickerIdForLine(line) === (
      focusId === 'line-select' ? event.target.value : pickerIdForLine(lineById.get(selectedLine))
    )) ?? choices[0];
    selectedLine = choice.id;
    if (!choice.actions.includes(selectedAction)) selectedAction = choice.actions[0];
    updatePickerHighlight();
    renderBuilder();
    $(`#${focusId}`).focus();
  }
  if (event.target.id === 'side-port' || event.target.id === 'side-starboard') {
    selectedSides = ['port', 'starboard'].filter(side => $(`#side-${side}`).checked);
    updatePickerHighlight();
  }
  if (event.target.id === 'action-select') selectedAction = event.target.value;
});

document.addEventListener('keydown', event => {
  const tab = event.target.closest('[role="tab"]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const index = tabs.indexOf(tab);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
    : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  selectTab(tabs[next].dataset.tab);
  tabs[next].focus();
});

document.addEventListener('click', event => {
  if (event.target.closest('#panel-action')) view?.dismissLineLabel();
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  view?.dismissLineLabel();
  if (button.dataset.tab) { selectTab(button.dataset.tab); return; }
  if (button.dataset.close) {
    $(`#${button.dataset.close}`).close();
    return;
  }
  if (button.dataset.highlight) { selectLine(button.dataset.highlight); return; }
  if (button.dataset.exercise !== undefined) { changeExercise(Number(button.dataset.exercise)); return; }
  const dataset = button.dataset;
  if (dataset.removeAction !== undefined) editAnswer(pending => {
    pending.splice(Number(dataset.removeAction), 1);
  });
  switch (button.id) {
    case 'add-action': {
      const selected = pickerLines(selectedLine, selectedSides);
      if (!selected.length) {
        message('Choose Port, Starboard, or both before adding this action.', 'error');
        break;
      }
      const additions = selected.map(line => ({ line: line.id, action: selectedAction }));
      const fresh = additions.filter(item => !pendingSteps[session.exercise]
        .some(existing => existing.line === item.line && existing.action === item.action));
      if (!fresh.length) {
        message('The selected actions are already in the current step.', 'error');
        break;
      }
      editAnswer(pending => { pending.push(...fresh); });
      if (fresh.length < additions.length) message('Added the missing side; already-present actions were not duplicated.');
      break;
    }
    case 'clear-answer': editAnswer(answer => { answer.length = 0; }); break;
    case 'assess': {
      const answer = session.answers[session.exercise];
      const result = assessNextStep(exercises[session.exercise], answer, pendingSteps[session.exercise]);
      message(`${result.ok ? '' : `Step ${result.index + 1}: `}${result.message}`, result.ok ? 'success' : 'error');
      if (result.ok) startPlayback([pendingSteps[session.exercise]]);
      else {
        const card = $('[data-current-step]');
        card?.classList.add('incorrect');
        card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      break;
    }
    case 'pause-playback':
      playback.paused = !playback.paused;
      renderPlayback();
      break;
    case 'step-playback':
      playback.paused = true;
      playback.index++;
      playback.elapsed = 0;
      view.update(playback.states[playback.index]);
      updateRigText(playback.states[playback.index]);
      if (playback.index === playback.steps.length) finishPlayback();
      else {
        view.highlight(playback.steps[playback.index].map(item => item.line));
        renderPlayback();
      }
      break;
    case 'replay': startPlayback(session.answers[session.exercise], true); break;
    case 'continue': changeExercise(1); break;
    case 'camera-reset': view?.resetCamera(); break;
    case 'orientation-open': $('#orientation').showModal(); break;
    case 'review-open': $('#review').showModal(); break;
    case 'example-open': {
      const exercise = exercises[session.exercise];
      $('#example-title').textContent = exercise.title;
      $('#example-content').innerHTML = `
        <ul class="example-notes">${exercise.notes.map(note => `<li>${escape(note)}</li>`).join('')}</ul>
        <ol class="example-steps">${exercise.example.map(step => `<li><ul>${step.map(item => `<li>${escape(describeAction(item))}</li>`).join('')}</ul></li>`).join('')}</ol>`;
      $('#example').showModal();
      break;
    }
    case 'reset':
      session = freshSession();
      playback = null;
      pendingSteps = [[], []];
      selectTab('action');
      view?.update(session.rig);
      updateRigText(session.rig);
      renderMission();
      renderBuilder();
      renderPlayback();
      message('Sequence restarted. Both yards raised and both sails furled.');
      break;
  }
});

document.addEventListener('pointerdown', event => {
  if (event.target.closest('#panel-action')) view?.dismissLineLabel();
});

document.addEventListener('focusin', event => {
  if (event.target.closest('#panel-action')) view?.dismissLineLabel();
});

function graphicsError(text) {
  graphicsReady = false;
  if (playback) playback.paused = true;
  message(text, 'error');
  $('#rig').classList.add('graphics-error');
  renderMission();
  if (playback) {
    $('#pause-playback').disabled = true;
    $('#step-playback').disabled = true;
    $('#replay').disabled = true;
  }
}
$('#rig').addEventListener('rigerror', event => graphicsError(event.detail));
renderMission();
renderBuilder();
$('#selected-label').textContent = lineById.get(selectedLine).label;
try {
  view = createRigView($('#rig'), selectLine);
  graphicsReady = true;
  view.update(session.rig);
  updatePickerHighlight();
  renderMission();
  message('Build and submit your first step. The worked example is available whenever you need it.');
} catch (error) {
  console.error('Unable to initialise the 3D rig:', error);
  $('#rig').innerHTML = '<div class="graphics-failure"><h2>3D rig unavailable</h2><p>This app requires a browser with WebGL and hardware acceleration. Enable them and reload. Assessment playback and exercise unlocking are disabled.</p></div>';
  graphicsError(`3D initialisation failed: ${error instanceof Error ? error.message : String(error)}`);
}
requestAnimationFrame(frame);
$('#orientation').showModal();
window.addEventListener('pagehide', () => view?.dispose(), { once: true });
