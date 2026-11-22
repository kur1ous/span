import 'katex/dist/katex.min.css';
import './style.css';
import { IDENTITY, diag, fromColumns, rotation, type Mat2 } from './math/mat2';
import { tweenMatrix } from './anim';
import { bindHandles } from './interact';
import { createPlane } from './plane';
import { createReadout } from './readout';
import { bindModeTabs, modes, overlayLabels } from './modes';
import { bindPlayback } from './playback';
import { bindMatrixInputs } from './matrix-inputs';
import { bindUrlState } from './url-state';

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
let syncUrl = () => {};
const matrixInputs = bindMatrixInputs({
  a: document.getElementById('matrix-a') as HTMLInputElement,
  b: document.getElementById('matrix-b') as HTMLInputElement,
  c: document.getElementById('matrix-c') as HTMLInputElement,
  d: document.getElementById('matrix-d') as HTMLInputElement,
}, document.getElementById('matrix-error')!, () => matrix, setMatrix, () => stop());
const playback = bindPlayback(
  document.getElementById('play-pause') as HTMLButtonElement,
  document.getElementById('stage-time') as HTMLInputElement,
  [...document.querySelectorAll<HTMLElement>('.stage-captions li')],
  (m, stage) => plane.render(m, stage),
);
const modeOverlays = modes.map((mode) => ({ ...mode.overlays }));
const selectMode = bindModeTabs(
  modes.map((mode) => document.getElementById(`mode-${mode.id}`) as HTMLButtonElement),
  document.getElementById('mode-panel')!,
  (mode) => {
    if (decomposing && mode.id === 'decompose') return;
    stop();
    playback.pause();
    decomposing = mode.id === 'decompose';
    document.getElementById('playback-cell')!.hidden = !decomposing;
    for (const which of ['i', 'j'] as const) {
      plane.handles[which].style.display = decomposing ? 'none' : '';
      plane.handles[which].setAttribute('tabindex', decomposing ? '-1' : '0');
    }
    if (decomposing) playback.reset(matrix);
    else plane.render(matrix);
    for (const cell of ['matrix', 'presets', 'det', 'eigen', 'svd']) {
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
  else plane.render(m);
  readout.update(m);
  matrixInputs.update(m);
  syncUrl();
}

function glideTo(target: Mat2) {
  stop();
  stop = tweenMatrix(matrix, target, 560, setMatrix);
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
  slider.addEventListener('input', () => {
    stop();
    updateValue();
    setMatrix(toMatrix(slider.valueAsNumber));
  });
}

bindHandles(plane, () => matrix, setMatrix, () => stop());
document.getElementById('reset')!.addEventListener('click', () => {
  if (decomposing) setMatrix(IDENTITY);
  else glideTo(IDENTITY);
});

const urlState = bindUrlState(
  () => ({ matrix, mode: decomposing ? 'decompose' : 'explore' }),
  (state) => {
    stop();
    playback.pause();
    setMatrix(state.matrix);
    selectMode(state.mode);
  },
);
syncUrl = urlState.update;
if (!urlState.restored) {
  // Open on the identity and ease into the starting shape.
  setMatrix(IDENTITY);
  glideTo(START);
}
