import 'katex/dist/katex.min.css';
import './style.css';
import { IDENTITY, diag, fromColumns, rotation, type Mat2 } from './math/mat2';
import { tweenMatrix } from './anim';
import { bindHandles } from './interact';
import { createPlane } from './plane';
import { createReadout } from './readout';
import { bindModeTabs, modes, overlayLabels } from './modes';
import { bindPlayback } from './playback';

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
const playback = bindPlayback(
  document.getElementById('play-pause') as HTMLButtonElement,
  document.getElementById('stage-time') as HTMLInputElement,
  [...document.querySelectorAll<HTMLElement>('.stage-captions li')],
  (m, stage) => plane.render(m, stage),
);
const modeOverlays = modes.map((mode) => ({ ...mode.overlays }));
bindModeTabs(
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
  },
);

function setMatrix(m: Mat2) {
  matrix = m;
  if (decomposing) playback.reset(m);
  else plane.render(m);
  readout.update(m);
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

bindHandles(plane, () => matrix, setMatrix, () => stop());
document.getElementById('reset')!.addEventListener('click', () => {
  if (decomposing) setMatrix(IDENTITY);
  else glideTo(IDENTITY);
});

// open on the identity and ease into the starting shape so the first thing
// you see is the plane moving
setMatrix(IDENTITY);
glideTo(START);
