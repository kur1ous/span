import { expect, it } from 'vitest';
import { createKeyBurst, createMatrixHistory } from './history';
import { IDENTITY, diag } from './math/mat2';

it('coalesces every frame of a drag and keeps separate gestures undoable', () => {
  const history = createMatrixHistory();
  const drag = {};
  history.record(IDENTITY, diag(2, 1), drag);
  history.record(diag(2, 1), diag(3, 1), drag);
  history.record(diag(3, 1), diag(4, 1), {});
  expect(history.undo(diag(4, 1))).toEqual(diag(3, 1));
  expect(history.undo(diag(3, 1))).toEqual(IDENTITY);
  expect(history.undo(IDENTITY)).toBeUndefined();
  expect(history.redo(IDENTITY)).toEqual(diag(3, 1));
  expect(history.redo(diag(3, 1))).toEqual(diag(4, 1));
  expect(history.redo(diag(4, 1))).toBeUndefined();
});

it('coalesces a key burst until an idle gap, including changing arrow directions', () => {
  const history = createMatrixHistory();
  const burst = createKeyBurst();
  history.record(IDENTITY, diag(1.1, 1), burst(0));
  history.record(diag(1.1, 1), diag(1.1, 1.1), burst(1000, true));
  history.record(diag(1.1, 1.1), diag(1.2, 1.1), burst(1500));
  expect(history.undo(diag(1.2, 1.1))).toEqual(diag(1.1, 1.1));
  expect(history.undo(diag(1.1, 1.1))).toEqual(IDENTITY);
});

it('keeps redo after a no-op, discards it after an edit, and closes an undone group', () => {
  const history = createMatrixHistory();
  const group = {};
  history.record(IDENTITY, diag(2, 1), group);
  history.undo(diag(2, 1));
  history.record(IDENTITY, { ...IDENTITY });
  expect(history.redo(IDENTITY)).toEqual(diag(2, 1));
  history.undo(diag(2, 1));
  history.record(IDENTITY, diag(3, 1), group);
  expect(history.redo(diag(3, 1))).toBeUndefined();
  expect(history.undo(diag(3, 1))).toEqual(IDENTITY);
  history.clear();
  expect(history.undo(IDENTITY)).toBeUndefined();
  expect(history.redo(IDENTITY)).toBeUndefined();
});
