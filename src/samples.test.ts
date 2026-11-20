import { readFileSync } from 'node:fs';
import { importFile, parseJsonText } from './lib/importSop';
import { totalSeconds } from './lib/sopReducer';
import { stepCount } from './lib/recipe';
import { parseDuration } from './lib/duration';

const expected = ['Mix flour & water', 'Rest (autolyse)', 'Add starter', 'Bulk ferment', 'Shape'];

test('sample JSON imports', () => {
  const r = parseJsonText(readFileSync('samples/Sourdough.json', 'utf8'), 'Sourdough.json');
  expect(r.sop.steps.map((s) => s.title)).toEqual(expected);
  expect(r.ignoredColumns).toEqual([]);
  expect(totalSeconds(r.sop)).toBe(600 + 1800 + 45 + 5400);
});

test('sample Excel imports the same', async () => {
  const r = await importFile(new File([readFileSync('samples/Sourdough.xlsx')], 'Sourdough.xlsx'));
  expect(r.sop.title).toBe('Sourdough');
  expect(r.sop.steps.map((s) => [s.title, s.duration])).toEqual([
    ['Mix flour & water', '10 min'], ['Rest (autolyse)', '30 min'], ['Add starter', '45 sec'],
    ['Bulk ferment', '1h 30m'], ['Shape', ''],
  ]);
});

test('espresso SOP: both files match and durations parse as intended', async () => {
  const json = parseJsonText(readFileSync('samples/Clean Espresso Machine.json', 'utf8'), 'Clean Espresso Machine.json');
  const xlsx = await importFile(new File([readFileSync('samples/Clean Espresso Machine.xlsx')], 'Clean Espresso Machine.xlsx'));
  const view = (r: typeof json) => r.sop.steps.map((s) => [s.title, s.duration]);
  expect(view(xlsx)).toEqual(view(json));
  expect(xlsx.sop.title).toBe('Clean Espresso Machine');
  expect(json.sop.steps.map((s) => parseDuration(s.duration)))
    .toEqual([null, 10, 30, 90, 900, 5, null, 120, 60]);
});

test('pour-over sample: ingredients and steps, both files match', async () => {
  const json = parseJsonText(readFileSync('samples/Pour-over Coffee.json', 'utf8'), 'Pour-over Coffee.json');
  const xlsx = await importFile(new File([readFileSync('samples/Pour-over Coffee.xlsx')], 'Pour-over Coffee.xlsx'));
  const view = (r: typeof json) => r.sop.steps.map((s) => [s.kind, s.title]);
  expect(view(xlsx)).toEqual(view(json));
  expect(view(json).slice(0, 3)).toEqual([['ingredient', 'Coffee'], ['ingredient', 'Water'], ['ingredient', 'Filter paper']]);
  expect(view(json)[3]).toEqual(['step', 'Rinse filter']);
  expect(stepCount(json.sop.steps)).toBe(4);
  expect(xlsx.ignoredColumns).toEqual([]);
});
