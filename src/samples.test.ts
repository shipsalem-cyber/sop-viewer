import { readFileSync } from 'node:fs';
import { importFile, parseJsonText } from './lib/importSop';
import { totalSeconds } from './lib/sopReducer';

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
