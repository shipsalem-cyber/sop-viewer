import { importFile, parseJsonText, parseWorkbook } from './importSop';
import { ImportError } from './types';
import { makeXlsx } from '../test/fixtures/makeXlsx';

// JSON
test('bare array', () => {
  const r = parseJsonText(JSON.stringify([{ Step: 1, Title: 'Mix', Description: 'a\nb', Duration: '10 min' }]), 'Bread.json');
  expect(r.sop.title).toBe('Bread');
  expect(r.sop.steps).toMatchObject([{ title: 'Mix', description: 'a\nb', duration: '10 min' }]);
  expect(r.ignoredColumns).toEqual([]);
});

test('object with steps + title', () => {
  const r = parseJsonText(JSON.stringify({ title: 'Cake', steps: [{ Title: 'A' }] }), 'x.json');
  expect(r.sop.title).toBe('Cake');
  expect(r.sop.steps[0]).toMatchObject({ title: 'A', description: '', duration: '' });
});

test('case-insensitive keys, unit suffix, extras reported', () => {
  const r = parseJsonText(JSON.stringify([{ ' title ': 'A', 'Duration (min)': '5', Image: 'x.png', type: 'prep' }]), 'x.json');
  expect(r.sop.steps[0]).toMatchObject({ title: 'A', duration: '5 min' });
  expect(r.ignoredColumns).toEqual(['Image', 'type']);
});

test('steps get unique ids', () => {
  const r = parseJsonText(JSON.stringify([{ Title: 'a' }, { Title: 'b' }]), 'x.json');
  expect(new Set(r.sop.steps.map((s) => s.id)).size).toBe(2);
});

test.each(['not json', '42', '{"steps": 3}', '[]', '[{"Description":"no title"}]'])(
  'bad JSON %j throws ImportError', (t) => expect(() => parseJsonText(t, 'x.json')).toThrow(ImportError));

test('invalid JSON message', () => {
  expect(() => parseJsonText('not json', 'x.json')).toThrow("This JSON file couldn't be read.");
});

// Ordering (Review Focus 4)
test('sorts by Step, ties keep file order, non-numeric falls back', () => {
  const r = parseJsonText(JSON.stringify([{ Step: 3, Title: 'c' }, { Step: 1, Title: 'a' }, { Step: 1, Title: 'b' }]), 'x.json');
  expect(r.sop.steps.map((s) => s.title)).toEqual(['a', 'b', 'c']);
  const r2 = parseJsonText(JSON.stringify([{ Step: 'x', Title: 'p' }, { Title: 'q' }]), 'x.json');
  expect(r2.sop.steps.map((s) => s.title)).toEqual(['p', 'q']);
});

// Excel
test('title row above header, blank rows skipped', () => {
  const buf = makeXlsx([['My SOP'], [], ['step', 'Title', 'Description', 'Duration'], [1, 'Mix', 'x', '45 sec'], [], [2, 'Bake', '', 20]]);
  const r = parseWorkbook(buf, 'Bread.xlsx');
  expect(r.sop.title).toBe('Bread');
  expect(r.sop.steps.map((s) => [s.title, s.duration])).toEqual([['Mix', '45 sec'], ['Bake', '20']]);
});

test('Excel time-value Duration cell uses stored time', () => {
  const buf = makeXlsx([['Title', 'Duration'], ['Rest', { t: 'n', v: 1.5 / 24, z: 'h:mm' }]]);
  expect(parseWorkbook(buf, 'x.xlsx').sop.steps[0].duration).toBe('1h 30m');
});

test('text 01:30 stays text', () => {
  const buf = makeXlsx([['Title', 'Duration'], ['Rest', { t: 's', v: '01:30' }]]);
  expect(parseWorkbook(buf, 'x.xlsx').sop.steps[0].duration).toBe('01:30');
});

test('Excel extra columns reported', () => {
  const buf = makeXlsx([['Title', 'Image'], ['a', 'x.png']]);
  expect(parseWorkbook(buf, 'x.xlsx').ignoredColumns).toEqual(['Image']);
});

test('no Title header → ImportError', () => {
  expect(() => parseWorkbook(makeXlsx([['Name', 'Desc'], ['a', 'b']]), 'x.xlsx'))
    .toThrow("Couldn't find a header row with a 'Title' column.");
});

test('header only → no steps error', () => {
  expect(() => parseWorkbook(makeXlsx([['Title']]), 'x.xlsx')).toThrow('The file has no steps.');
});

test('unsupported extension', async () => {
  await expect(importFile(new File(['a,b'], 'x.csv'))).rejects.toThrow(/Unsupported file type/);
});

test('importFile reads JSON', async () => {
  const r = await importFile(new File([JSON.stringify([{ Title: 'A' }])], 'Soup.JSON'));
  expect(r.sop.title).toBe('Soup');
});

test('pre-numbered empty rows are skipped', () => {
  const buf = makeXlsx([['Step', 'Title', 'Description', 'Duration'], [1, 'a', '', ''], [2, '', '', ''], [3, '', '', '']]);
  expect(parseWorkbook(buf, 'x.xlsx').sop.steps.map((s) => s.title)).toEqual(['a']);
});

test('footer row without title or description is skipped and does not stop sorting', () => {
  const buf = makeXlsx([['Step', 'Title', 'Description', 'Duration'], [3, 'c', '', ''], [1, 'a', '', ''], ['Total', '', '', '1h 45m']]);
  expect(parseWorkbook(buf, 'x.xlsx').sop.steps.map((s) => s.title)).toEqual(['a', 'c']);
});

test.each([
  ['Duration (sec)', 45, '45 sec'],
  ['Duration (seconds)', '30', '30 sec'],
  ['Duration (hours)', 1.5, '1.5 h'],
  ['Duration (min)', 5, '5 min'],
  ['Duration (approx)', 5, '5'],
  ['Duration (sec)', '2 min', '2 min'],
] as const)('%s with %j imports as %j', (col, value, expected) => {
  const r = parseJsonText(JSON.stringify([{ Title: 'A', [col]: value }]), 'x.json');
  expect(r.sop.steps[0].duration).toBe(expected);
});
