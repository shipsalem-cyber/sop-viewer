import { emptyLibrary, newRecipe, type Library } from './library';
import { loadLibrary, saveLibrary, STORAGE_KEY } from './libraryStorage';

const bread = newRecipe({
  title: 'Bread',
  steps: [
    { id: 's1', kind: 'ingredient', title: 'Flour', description: '500 g', duration: '' },
    { id: 's2', kind: 'step', title: 'Mix', description: '', duration: '10 min' },
  ],
});
const lib: Library = { recipes: [bread], openId: bread.id };

test('round-trips a library', () => {
  expect(saveLibrary(lib)).toBe(true);
  expect(loadLibrary()).toEqual({ library: lib, problem: null });
});

test('missing key loads empty', () => {
  expect(loadLibrary()).toEqual({ library: emptyLibrary, problem: null });
});

test.each([
  ['not json', 'not json'],
  ['recipes not an array', '{"version":1,"recipes":{},"openId":null}'],
  ['step without kind', JSON.stringify({ version: 1, recipes: [{ ...bread, steps: [{ id: 'x', title: 'A', description: '', duration: '' }] }], openId: null })],
  ['unknown kind', JSON.stringify({ version: 1, recipes: [{ ...bread, steps: [{ ...bread.steps[0], kind: 'sauce' }] }], openId: null })],
  ['unknown version', JSON.stringify({ version: 2, recipes: [bread], openId: bread.id })],
])('wrong shape is corrupt: %s', (_name, raw) => {
  localStorage.setItem(STORAGE_KEY, raw);
  expect(loadLibrary()).toEqual({ library: emptyLibrary, problem: 'corrupt' });
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
});

test('openId that matches no recipe falls back to the first recipe', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, recipes: [bread], openId: 'gone' }));
  expect(loadLibrary()).toEqual({ library: lib, problem: null });
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, recipes: [], openId: 'gone' }));
  expect(loadLibrary()).toEqual({ library: emptyLibrary, problem: null });
});

test('storage getter that throws', () => {
  const blocked = () => { throw new DOMException('denied', 'SecurityError'); };
  expect(loadLibrary(blocked)).toEqual({ library: emptyLibrary, problem: 'unavailable' });
  expect(saveLibrary(lib, blocked)).toBe(false);
});

test('setItem that throws', () => {
  const full = {
    getItem: () => null,
    removeItem: () => {},
    setItem: () => { throw new DOMException('full', 'QuotaExceededError'); },
  } as unknown as Storage;
  expect(saveLibrary(lib, () => full)).toBe(false);
});
