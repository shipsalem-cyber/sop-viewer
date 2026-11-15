import { sopReducer, totalSeconds } from './sopReducer';
import type { Sop } from './types';

const mk = (): Sop => ({ title: 'T', steps: [
  { id: 'a', title: 'A', description: '', duration: '10 min' },
  { id: 'b', title: 'B', description: '', duration: '5-10 min' },
  { id: 'c', title: 'C', description: '', duration: '45 sec' }] });
const titles = (s: Sop | null) => s!.steps.map((x) => x.title);

test('load replaces', () => {
  const other: Sop = { title: 'X', steps: [] };
  expect(sopReducer(mk(), { type: 'load', sop: other })).toBe(other);
  expect(sopReducer(null, { type: 'load', sop: other })).toBe(other);
});

test('setTitle', () => {
  expect(sopReducer(mk(), { type: 'setTitle', title: 'New' })!.title).toBe('New');
});

test('updateStep patches only that step', () => {
  const s = sopReducer(mk(), { type: 'updateStep', id: 'b', patch: { title: 'Bee', duration: '1m' } })!;
  expect(s.steps[1]).toEqual({ id: 'b', title: 'Bee', description: '', duration: '1m' });
  expect(s.steps[0]).toEqual(mk().steps[0]);
});

test('addStep appends a fresh step', () => {
  const s = sopReducer(mk(), { type: 'addStep' })!;
  expect(s.steps).toHaveLength(4);
  expect(s.steps[3]).toMatchObject({ title: 'New step', description: '', duration: '' });
  expect(['a', 'b', 'c']).not.toContain(s.steps[3].id);
});

test('deleteStep removes', () => {
  expect(titles(sopReducer(mk(), { type: 'deleteStep', id: 'b' }))).toEqual(['A', 'C']);
});

test('moveStep first to last', () => {
  expect(titles(sopReducer(mk(), { type: 'moveStep', fromId: 'a', toId: 'c' }))).toEqual(['B', 'C', 'A']);
});

test('does not mutate input', () => {
  const s = mk();
  sopReducer(s, { type: 'deleteStep', id: 'a' });
  expect(s.steps).toHaveLength(3);
});

test('actions on null return null', () => {
  expect(sopReducer(null, { type: 'addStep' })).toBeNull();
  expect(sopReducer(null, { type: 'setTitle', title: 'x' })).toBeNull();
});

test('totalSeconds ignores unparseable', () => {
  expect(totalSeconds(mk())).toBe(645);
});
