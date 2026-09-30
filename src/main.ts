import './style.css';
import { fromColumns } from './math/mat2';
import { createPlane } from './plane';

const frame = document.getElementById('plane-frame')!;
const plane = createPlane(frame);

plane.render(fromColumns([1.5, 0.5], [-0.5, 1]));
