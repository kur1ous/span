import 'katex/dist/katex.min.css';
import './style.css';
import { IDENTITY, fromColumns, type Mat2 } from './math/mat2';
import { tweenMatrix } from './anim';
import { bindHandles } from './interact';
import { createPlane } from './plane';
import { createReadout } from './readout';
import { bindModeTabs, modes, overlayLabels } from './modes';

const START = fromColumns([1.5, 0.5], [-0.5, 1]);

const plane = createPlane(document.getElementById('plane-frame')!);
const readout = createReadout(
  document.getElementById('matrix-readout')!,
  document.getElementById('det-readout')!,
  document.getElementById('eigen-readout')!,
  document.getElementById('svd-readout')!,
);

const modeOverlays = modes.map((mode) => ({ ...mode.overlays }));
bindModeTabs(
  modes.map((mode) => document.getElementById(`mode-${mode.id}`) as HTMLButtonElement),
  document.getElementById('mode-panel')!,
  (mode) => {
    for (const cell of ['matrix', 'det', 'eigen', 'svd']) {
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

let matrix: Mat2 = IDENTITY;
let stop = () => {};

function setMatrix(m: Mat2) {
  matrix = m;
  plane.render(m);
  readout.update(m);
}

function glideTo(target: Mat2) {
  stop();
  stop = tweenMatrix(matrix, target, 560, setMatrix);
}

bindHandles(plane, () => matrix, setMatrix, () => stop());
document.getElementById('reset')!.addEventListener('click', () => glideTo(IDENTITY));

// open on the identity and ease into the starting shape so the first thing
// you see is the plane moving
setMatrix(IDENTITY);
glideTo(START);
