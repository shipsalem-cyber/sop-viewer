import { sopReducer, totalSeconds } from './sopReducer';
import type { Sop } from './types';

const mk = (): Sop => ({ title: 'T', steps: [
  { id: 'a', kind: 'step', title: 'A', description: '', duration: '10 min' },
  { id: 'b', kind: 'step', title: 'B', description: '', duration: '5-10 min' },
  { id: 'c', kind: 'step', title: 'C', description: '', duration: '45 sec' }] });
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
  expect(s.steps[1]).toEqual({ id: 'b', kind: 'step', title: 'Bee', description: '', duration: '1m' });
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

test('addIngredient appends an ingredient', () => {
  const s = sopReducer(mk(), { type: 'addIngredient' })!;
  expect(s.steps[3]).toMatchObject({ kind: 'ingredient', title: 'New ingredient', description: '', duration: '' });
});

test('addStep appends kind step', () => {
  expect(sopReducer(mk(), { type: 'addStep' })!.steps[3].kind).toBe('step');
});

test('updateStep can switch kind', () => {
  expect(sopReducer(mk(), { type: 'updateStep', id: 'a', patch: { kind: 'ingredient' } })!.steps[0].kind).toBe('ingredient');
});

// Review Focus 3 (total half)
test('totalSeconds ignores ingredient durations', () => {
  const s = mk();
  s.steps[0] = { ...s.steps[0], kind: 'ingredient' };
  expect(totalSeconds(s)).toBe(45);
});
