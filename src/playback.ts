import { easeInOutCubic } from './anim';
import { svd, type Mat2 } from './math/mat2';
import { stageMatrix } from './math/stages';
import type { DecompositionStage } from './plane';

export function bindPlayback(
  button: HTMLButtonElement, slider: HTMLInputElement, captions: readonly HTMLElement[],
  render: (matrix: Mat2, stage: DecompositionStage) => void,
) {
  let factors: ReturnType<typeof svd>;
  let time = 0;
  let playing = false;
  let frame = 0;

  function pause() {
    cancelAnimationFrame(frame);
    playing = false;
    button.textContent = 'Play';
  }

  function seek(value: number) {
    time = value;
    const stage = Math.min(2, Math.floor(time));
    slider.value = String(time);
    slider.setAttribute('aria-valuetext', `${captions[stage]!.textContent}, stage ${stage + 1} of 3`);
    captions.forEach((caption, i) => caption.setAttribute('aria-current', i === stage ? 'step' : 'false'));
    const easedTime = stage + easeInOutCubic(time - stage);
    render(stageMatrix(factors, easedTime), { factors, time: easedTime });
  }

  button.addEventListener('click', () => {
    if (playing) { pause(); return; }
    if (time === 3) seek(0);
    playing = true;
    button.textContent = 'Pause';
    const start = performance.now();
    const from = time;
    const step = (now: number) => {
      seek(Math.min(3, from + (now - start) / 1200));
      if (time < 3) frame = requestAnimationFrame(step);
      else pause();
    };
    frame = requestAnimationFrame(step);
  });
  slider.addEventListener('input', () => {
    pause();
    seek(Number(slider.value));
  });

  return {
    pause,
    reset(matrix: Mat2) {
      pause();
      factors = svd(matrix);
      seek(0);
    },
  };
}
