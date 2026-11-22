import 'katex/dist/katex.min.css';
import './style.css';
import { IDENTITY, commute, diag, fromColumns, rotation, type Mat2 } from './math/mat2';
import { tweenMatrix } from './anim';
import { bindHandles } from './interact';
import { createPlane } from './plane';
import { createReadout, renderComposition } from './readout';
import { bindModeTabs, modes, overlayLabels, type ModeId } from './modes';
import { bindComposition } from './composition';
import { bindPlayback } from './playback';
import { bindMatrixInputs } from './matrix-inputs';
import { bindUrlState } from './url-state';
import { createKeyBurst, createMatrixHistory } from './history';

const START = fromColumns([1.5, 0.5], [-0.5, 1]);

const plane = createPlane(document.getElementById('plane-frame')!);
const readout = createReadout(
  document.getElementById('matrix-readout')!,
  document.getElementById('det-readout')!,
  document.getElementById('eigen-readout')!,
  document.getElementById('svd-readout')!,
);

let matrix: Mat2 = IDENTITY;
let stop = () => {};
let decomposing = false;
let activeMode: ModeId = 'explore';
const INITIAL_B: Mat2 = { a: 1, b: 0, c: 1, d: 1 };
let matrixB = INITIAL_B;
let syncUrl = () => {};
const history = createMatrixHistory();
const matrixInputs = bindMatrixInputs({
  a: document.getElementById('matrix-a') as HTMLInputElement,
  b: document.getElementById('matrix-b') as HTMLInputElement,
  c: document.getElementById('matrix-c') as HTMLInputElement,
  d: document.getElementById('matrix-d') as HTMLInputElement,
}, document.getElementById('matrix-error')!, () => matrix, editMatrix, () => stop());
const playback = bindPlayback(
  document.getElementById('play-pause') as HTMLButtonElement,
  document.getElementById('stage-time') as HTMLInputElement,
  [...document.querySelectorAll<HTMLElement>('.stage-captions li')],
  (m, stage) => plane.render(m, stage),
);
const modeOverlays = modes.map((mode) => ({ ...mode.overlays }));
const composition = bindComposition(
  document.getElementById('composition-back') as HTMLButtonElement,
  document.getElementById('composition-next') as HTMLButtonElement,
  document.getElementById('composition-caption')!,
  (m) => plane.render(m),
);
function resetComposition() {
  plane.setComposition(matrix, matrixB);
  renderComposition(document.getElementById('composition-readout')!, matrix, matrixB);
  document.getElementById('composition-order')!.textContent = commute(matrix, matrixB)
    ? 'AB = BA: these matrices commute (within numerical precision).'
    : 'AB differs from BA: these matrices do not commute.';
  composition.reset(matrix, matrixB);
}
const selectMode = bindModeTabs(
  modes.map((mode) => document.getElementById(`mode-${mode.id}`) as HTMLButtonElement),
  document.getElementById('mode-panel')!,
  (mode) => {
    if (decomposing && mode.id === 'decompose') return;
    stop();
    playback.pause();
    composition.pause();
    activeMode = mode.id;
    plane.setComposition();
    decomposing = mode.id === 'decompose';
    document.getElementById('playback-cell')!.hidden = !decomposing;
    for (const which of ['i', 'j'] as const) {
      plane.handles[which].style.display = decomposing ? 'none' : '';
      plane.handles[which].setAttribute('tabindex', decomposing ? '-1' : '0');
    }
    if (decomposing) playback.reset(matrix);
    else if (activeMode === 'compose') resetComposition();
    else plane.render(matrix);
    for (const cell of ['matrix', 'presets', 'det', 'eigen', 'svd', 'composition']) {
      document.getElementById(`${cell}-cell`)!.hidden = !mode.cells.includes(cell);
    }
    const overlays = modeOverlays[modes.indexOf(mode)]!;
    const strip = document.getElementById('overlay-strip')!;
    strip.replaceChildren();
    for (const key of mode.controls) {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `overlay-${key}`;
      checkbox.checked = overlays[key];
      checkbox.addEventListener('change', () => {
        overlays[key] = checkbox.checked;
        plane.setOverlays(overlays);
      });
      label.append(checkbox, ` ${overlayLabels[key]}`);
      strip.append(label);
    }
    plane.setOverlays(overlays);
    syncUrl();
  },
);

function setMatrix(m: Mat2) {
  matrix = m;
  if (decomposing) playback.reset(m);
  else if (activeMode === 'compose') resetComposition();
  else plane.render(m);
  readout.update(m);
  matrixInputs.update(m);
  syncUrl();
}

function editMatrix(m: Mat2, group?: object) {
  history.record(matrix, m, group);
  setMatrix(m);
}

function glideTo(target: Mat2, record = true) {
  stop();
  const group = {};
  stop = tweenMatrix(matrix, target, 560, (m) => record ? editMatrix(m, group) : setMatrix(m));
}

const presets: readonly [string, Mat2][] = [
  ['Identity', IDENTITY],
  ['Rotate 30°', rotation(Math.PI / 6)],
  ['Shear x by 1', { a: 1, b: 1, c: 0, d: 1 }],
  ['Project onto x axis', diag(1, 0)],
  ['Reflect across y = x', { a: 0, b: 1, c: 1, d: 0 }],
  ['Uniform scale ×2', diag(2, 2)],
];
for (const [label, target] of presets) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn';
  button.textContent = label;
  button.addEventListener('click', () => glideTo(target));
  document.getElementById('preset-gallery')!.append(button);
}

const parametricPresets: readonly [string, string, (value: number) => Mat2, (value: number) => string][] = [
  ['rotation-angle', 'rotation-value', (degrees) => rotation(degrees * Math.PI / 180), (degrees) => `${degrees}°`],
  ['shear-factor', 'shear-value', (factor) => ({ a: 1, b: factor, c: 0, d: 1 }), (factor) => factor.toFixed(1)],
];
for (const [sliderId, outputId, toMatrix, format] of parametricPresets) {
  const slider = document.getElementById(sliderId) as HTMLInputElement;
  const output = document.getElementById(outputId) as HTMLOutputElement;
  const updateValue = () => {
    output.value = format(slider.valueAsNumber);
    slider.setAttribute('aria-valuetext', output.value);
  };
  updateValue();
  let dragGroup: object | undefined;
  let dragPointer: number | undefined;
  let keyGroup: object | undefined;
  let keyBurst = createKeyBurst();
  slider.addEventListener('pointerdown', (event) => {
    if (event.button === 0 && dragPointer === undefined) {
      dragPointer = event.pointerId;
      dragGroup = {};
    }
  });
  for (const event of ['pointerup', 'pointercancel'] as const) {
    window.addEventListener(event, (event) => {
      if (event.pointerId === dragPointer) { dragPointer = undefined; dragGroup = undefined; }
    });
  }
  slider.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
      keyGroup = keyBurst(undefined, event.repeat);
    }
  });
  slider.addEventListener('keyup', () => { keyGroup = undefined; });
  slider.addEventListener('blur', () => {
    dragPointer = undefined; dragGroup = keyGroup = undefined; keyBurst = createKeyBurst();
  });
  slider.addEventListener('input', () => {
    stop();
    updateValue();
    editMatrix(toMatrix(slider.valueAsNumber), dragGroup ?? keyGroup ?? keyBurst());
  });
}

bindHandles(plane, () => matrix, editMatrix, () => { stop(); composition.pause(); });
bindHandles({ ...plane, handles: { ...plane.handles, ...plane.bHandles } },
  () => matrixB, (m) => {
    matrixB = m;
    resetComposition();
    syncUrl();
  }, () => { stop(); composition.pause(); }, ['i', 'j']);
document.getElementById('reset')!.addEventListener('click', () => {
  if (activeMode === 'compose') {
    stop();
    matrixB = INITIAL_B;
    editMatrix(IDENTITY);
  } else if (decomposing) editMatrix(IDENTITY);
  else glideTo(IDENTITY);
});

window.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.isComposing || event.altKey ||
      !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' ||
      matrixInputs.isEditing(event.target)) return;
  event.preventDefault();
  stop();
  const previous = event.shiftKey ? history.redo(matrix) : history.undo(matrix);
  if (previous) setMatrix(previous);
});

const urlState = bindUrlState(
  () => ({ matrix, mode: activeMode, ...(activeMode === 'compose' ? { b: matrixB } : {}) }),
  (state) => {
    stop();
    playback.pause();
    composition.pause();
    matrixB = state.b ?? INITIAL_B;
    history.clear();
    setMatrix(state.matrix);
    selectMode(state.mode);
  },
);
syncUrl = urlState.update;
if (!urlState.restored) {
  // Open on the identity and ease into the starting shape.
  setMatrix(IDENTITY);
  glideTo(START, false);
}
