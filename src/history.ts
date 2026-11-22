import type { Mat2 } from './math/mat2';

const equal = (a: Mat2, b: Mat2) => a.a === b.a && a.b === b.b && a.c === b.c && a.d === b.d;

export function createMatrixHistory() {
  const past: Mat2[] = [];
  const future: Mat2[] = [];
  let lastGroup: object | undefined;
  const travel = (from: Mat2[], to: Mat2[], current: Mat2) => {
    lastGroup = undefined;
    const next = from.pop();
    if (next) to.push({ ...current });
    return next;
  };
  return {
    record(before: Mat2, after: Mat2, group?: object) {
      if (equal(before, after)) return;
      if (!group || group !== lastGroup) past.push({ ...before });
      lastGroup = group;
      future.length = 0;
    },
    undo: (current: Mat2) => travel(past, future, current),
    redo: (current: Mat2) => travel(future, past, current),
    clear() {
      past.length = future.length = 0;
      lastGroup = undefined;
    },
  };
}

export function createKeyBurst() {
  let last = -Infinity;
  let group = {};
  return (now = performance.now(), repeat = false) => {
    if (!repeat && now - last > 400) group = {};
    last = now;
    return group;
  };
}
