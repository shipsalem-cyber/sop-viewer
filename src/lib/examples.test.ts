import { readFileSync } from 'node:fs';
import { EXAMPLES } from './examples';
import { toJsonText } from './exportSop';

test('the three samples are built in, in order', () => {
  expect(EXAMPLES.map((e) => e.sop.title)).toEqual(['Pour-over Coffee', 'Sourdough', 'Clean Espresso Machine']);
  expect(EXAMPLES.map((e) => e.label)).toEqual(['Pour-over Coffee (with ingredients)', 'Sourdough', 'Clean Espresso Machine (SOP)']);
  expect(EXAMPLES[0].sop.steps.filter((s) => s.kind === 'ingredient')).toHaveLength(4);
});

test('an example downloads as the same rows as its sample file', () => {
  expect(JSON.parse(toJsonText(EXAMPLES[1].sop))).toEqual(JSON.parse(readFileSync('samples/Sourdough.json', 'utf8')));
});
