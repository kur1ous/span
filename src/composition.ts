import { tweenMatrix } from './anim';
import { IDENTITY, mul, type Mat2 } from './math/mat2';

export function bindComposition(
  back: HTMLButtonElement, next: HTMLButtonElement, caption: HTMLElement,
  render: (matrix: Mat2) => void,
) {
  let stages = [IDENTITY, IDENTITY, IDENTITY];
  let stage = 0;
  let displayed = IDENTITY;
  let cancel: (() => void) | undefined;
  const captions = ['Unit plane', 'A applied', 'B after A = BA'];

  function pause() { cancel?.(); cancel = undefined; }
  function update() {
    back.disabled = stage === 0;
    next.disabled = stage === 2;
    caption.textContent = captions[stage]!;
  }
  function draw(matrix: Mat2) { displayed = matrix; render(matrix); }
  function step(direction: number) {
    const target = stage + direction;
    if (target < 0 || target > 2) return;
    pause();
    stage = target;
    update();
    cancel = tweenMatrix(displayed, stages[stage]!, 560, draw);
  }
  back.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  update();

  return {
    pause,
    reset(a: Mat2, b: Mat2) {
      pause();
      stages = [IDENTITY, a, mul(b, a)];
      stage = 0;
      update();
      draw(IDENTITY);
    },
  };
}
