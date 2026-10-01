import 'katex/dist/katex.min.css';
import './style.css';
import { IDENTITY, fromColumns, type Mat2 } from './math/mat2';
import { tweenMatrix } from './anim';
import { bindHandles } from './interact';
import { createPlane, type OverlayState } from './plane';
import { createReadout } from './readout';

const START = fromColumns([1.5, 0.5], [-0.5, 1]);

const plane = createPlane(document.getElementById('plane-frame')!);
const readout = createReadout(
  document.getElementById('matrix-readout')!,
  document.getElementById('det-readout')!,
);

const overlays: OverlayState = { unitSquare: true, quarterRules: true, tickLabels: true };
for (const key of Object.keys(overlays) as (keyof OverlayState)[]) {
  const checkbox = document.getElementById(`overlay-${key}`) as HTMLInputElement;
  checkbox.checked = overlays[key];
  checkbox.addEventListener('change', () => {
    overlays[key] = checkbox.checked;
    plane.setOverlays(overlays);
  });
}
plane.setOverlays(overlays);

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
