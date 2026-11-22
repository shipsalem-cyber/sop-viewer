import { emptyLibrary, findByTitle, libraryReducer, newRecipe, openRecipe, sortedRecipes, type Library, type Recipe } from './library';
import type { Sop } from './types';

const sop = (title: string, stepTitle = 'Mix'): Sop => ({
  title,
  steps: [{ id: `${title}-${stepTitle}`, kind: 'step', title: stepTitle, description: '', duration: '' }],
});
const add = (lib: Library, r: Recipe) => libraryReducer(lib, { type: 'add', recipe: r });
const titles = (lib: Library) => lib.recipes.map((r) => r.title);

test('add appends and opens the new recipe', () => {
  const bread = newRecipe(sop('Bread'));
  const coffee = newRecipe(sop('Coffee'));
  const lib = add(add(emptyLibrary, bread), coffee);
  expect(titles(lib)).toEqual(['Bread', 'Coffee']);
  expect(lib.openId).toBe(coffee.id);
  expect(openRecipe(lib)?.title).toBe('Coffee');
});

test('replace keeps id and position', () => {
  const bread = newRecipe(sop('Bread'));
  const coffee = newRecipe(sop('Coffee'));
  const lib = libraryReducer(add(add(emptyLibrary, bread), coffee), { type: 'replace', id: bread.id, sop: sop('Bread', 'Knead') });
  expect(lib.recipes[0].id).toBe(bread.id);
  expect(lib.recipes[0].steps[0].title).toBe('Knead');
  expect(lib.openId).toBe(bread.id);
});

test('edit changes only the open recipe', () => {
  const bread = newRecipe(sop('Bread'));
  const coffee = newRecipe(sop('Coffee'));
  let lib = libraryReducer(add(add(emptyLibrary, bread), coffee), { type: 'open', id: bread.id });
  lib = libraryReducer(lib, { type: 'edit', action: { type: 'setTitle', title: 'Rye' } });
  expect(titles(lib)).toEqual(['Rye', 'Coffee']);
  const closed = { ...lib, openId: null };
  expect(libraryReducer(closed, { type: 'edit', action: { type: 'setTitle', title: 'X' } })).toBe(closed);
});

test('remove the open recipe opens the next one A–Z', () => {
  const coffee = newRecipe(sop('Coffee'));
  const bread = newRecipe(sop('Bread'));
  const apple = newRecipe(sop('Apple'));
  let lib = libraryReducer(add(add(add(emptyLibrary, coffee), bread), apple), { type: 'open', id: bread.id });
  lib = libraryReducer(lib, { type: 'remove', id: bread.id });
  expect(lib.openId).toBe(coffee.id);
  lib = libraryReducer(lib, { type: 'remove', id: coffee.id });
  expect(lib.openId).toBe(apple.id);
  lib = libraryReducer(lib, { type: 'remove', id: apple.id });
  expect(lib).toEqual({ recipes: [], openId: null });
});

test('remove a recipe that is not open keeps openId', () => {
  const bread = newRecipe(sop('Bread'));
  const coffee = newRecipe(sop('Coffee'));
  const lib = libraryReducer(add(add(emptyLibrary, bread), coffee), { type: 'remove', id: bread.id });
  expect(lib.openId).toBe(coffee.id);
  expect(titles(lib)).toEqual(['Coffee']);
});

test('clear empties the library', () => {
  const lib = add(emptyLibrary, newRecipe(sop('Bread')));
  expect(libraryReducer(lib, { type: 'clear' })).toEqual(emptyLibrary);
});

test('sortedRecipes sorts A–Z ignoring case and filters by query', () => {
  const recipes = ['banana', 'Apple', 'cherry'].map((t) => newRecipe(sop(t)));
  expect(sortedRecipes(recipes).map((r) => r.title)).toEqual(['Apple', 'banana', 'cherry']);
  expect(sortedRecipes(recipes, 'AN').map((r) => r.title)).toEqual(['banana']);
});

test('findByTitle ignores case and surrounding spaces', () => {
  const recipes = ['Bread', 'Coffee'].map((t) => newRecipe(sop(t)));
  expect(findByTitle(recipes, '  bread ')?.title).toBe('Bread');
  expect(findByTitle(recipes, 'Tea')).toBeUndefined();
});

test('replace of a recipe that is gone changes nothing', () => {
  const bread = newRecipe(sop('Bread'));
  const lib = add(emptyLibrary, bread);
  expect(libraryReducer(lib, { type: 'replace', id: 'gone', sop: sop('Rye') })).toBe(lib);
});
