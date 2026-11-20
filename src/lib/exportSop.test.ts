import * as XLSX from 'xlsx';
import { toJsonText, toXlsxBytes, safeFileName } from './exportSop';
import { parseWorkbook } from './importSop';
import type { Sop } from './types';

const sop: Sop = { title: 'Bread', steps: [
  { id: 'a', kind: 'step', title: 'Mix', description: 'x\ny', duration: '01:30' },
  { id: 'b', kind: 'step', title: 'Bake', description: '', duration: '20 min' }] };

const sheetRows = (bytes: ArrayBuffer) =>
  XLSX.utils.sheet_to_json(XLSX.read(bytes, { type: 'array' }).Sheets['SOP'], { header: 1 });

test('JSON shape', () => {
  expect(JSON.parse(toJsonText(sop))).toEqual([
    { Type: 'Step', Step: 1, Title: 'Mix', Description: 'x\ny', Duration: '01:30' },
    { Type: 'Step', Step: 2, Title: 'Bake', Description: '', Duration: '20 min' }]);
});

test('xlsx round trip keeps text durations', () => {
  const back = parseWorkbook(toXlsxBytes(sop), 'Bread.xlsx');
  expect(back.sop.steps.map((s) => [s.title, s.description, s.duration]))
    .toEqual([['Mix', 'x\ny', '01:30'], ['Bake', '', '20 min']]);
});

test('xlsx header row order', () => {
  expect(sheetRows(toXlsxBytes(sop))[0]).toEqual(['Type', 'Step', 'Title', 'Description', 'Duration']);
});

test('numeric-looking duration is written as text', () => {
  const bytes = toXlsxBytes({ title: 'T', steps: [{ id: 'a', kind: 'step', title: 'A', description: '', duration: '10' }] });
  const ws = XLSX.read(bytes, { type: 'array' }).Sheets['SOP'];
  expect(ws['E2'].t).toBe('s');
});

test('zero steps exports header only', () => {
  expect(JSON.parse(toJsonText({ title: 'E', steps: [] }))).toEqual([]);
  expect(sheetRows(toXlsxBytes({ title: 'E', steps: [] }))).toEqual([['Type', 'Step', 'Title', 'Description', 'Duration']]);
});

test('safeFileName', () => {
  expect(safeFileName('a/b: c?')).toBe('ab c');
  expect(safeFileName('  ')).toBe('SOP');
});

const mixed: Sop = { title: 'Pour-over', steps: [
  { id: 'i1', kind: 'ingredient', title: 'Coffee', description: '18 g', duration: '' },
  { id: 's1', kind: 'step', title: 'Grind', description: '', duration: '30 sec' },
  { id: 'i2', kind: 'ingredient', title: 'Water', description: '250 ml', duration: '5 min' },
  { id: 's2', kind: 'step', title: 'Brew', description: '', duration: '3 min' }] };

test('JSON has Type and step-only numbering', () => {
  expect(JSON.parse(toJsonText(mixed))).toEqual([
    { Type: 'Ingredient', Step: null, Title: 'Coffee', Description: '18 g', Duration: '' },
    { Type: 'Step', Step: 1, Title: 'Grind', Description: '', Duration: '30 sec' },
    { Type: 'Ingredient', Step: null, Title: 'Water', Description: '250 ml', Duration: '5 min' },
    { Type: 'Step', Step: 2, Title: 'Brew', Description: '', Duration: '3 min' }]);
});

test('xlsx header and rows', () => {
  const rows = sheetRows(toXlsxBytes(mixed)) as unknown[][];
  expect(rows[0]).toEqual(['Type', 'Step', 'Title', 'Description', 'Duration']);
  expect(rows[1][0]).toBe('Ingredient');
  expect(rows[1][1]).toBeUndefined();
  expect(rows[1].slice(2, 4)).toEqual(['Coffee', '18 g']);
  expect(rows[2].slice(0, 3)).toEqual(['Step', 1, 'Grind']);
  expect(rows[4].slice(0, 3)).toEqual(['Step', 2, 'Brew']);
});

// Review Focus 3 (export half)
test('round trip keeps kinds, order and ingredient duration', () => {
  const back = parseWorkbook(toXlsxBytes(mixed), 'x.xlsx');
  expect(back.sop.steps.map((s) => [s.kind, s.title, s.duration])).toEqual(
    mixed.steps.map((s) => [s.kind, s.title, s.duration]));
});
