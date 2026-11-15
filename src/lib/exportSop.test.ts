import * as XLSX from 'xlsx';
import { toJsonText, toXlsxBytes, safeFileName } from './exportSop';
import { parseWorkbook } from './importSop';
import type { Sop } from './types';

const sop: Sop = { title: 'Bread', steps: [
  { id: 'a', title: 'Mix', description: 'x\ny', duration: '01:30' },
  { id: 'b', title: 'Bake', description: '', duration: '20 min' }] };

const sheetRows = (bytes: ArrayBuffer) =>
  XLSX.utils.sheet_to_json(XLSX.read(bytes, { type: 'array' }).Sheets['SOP'], { header: 1 });

test('JSON shape', () => {
  expect(JSON.parse(toJsonText(sop))).toEqual([
    { Step: 1, Title: 'Mix', Description: 'x\ny', Duration: '01:30' },
    { Step: 2, Title: 'Bake', Description: '', Duration: '20 min' }]);
});

test('xlsx round trip keeps text durations', () => {
  const back = parseWorkbook(toXlsxBytes(sop), 'Bread.xlsx');
  expect(back.sop.steps.map((s) => [s.title, s.description, s.duration]))
    .toEqual([['Mix', 'x\ny', '01:30'], ['Bake', '', '20 min']]);
});

test('xlsx header row order', () => {
  expect(sheetRows(toXlsxBytes(sop))[0]).toEqual(['Step', 'Title', 'Description', 'Duration']);
});

test('numeric-looking duration is written as text', () => {
  const bytes = toXlsxBytes({ title: 'T', steps: [{ id: 'a', title: 'A', description: '', duration: '10' }] });
  const ws = XLSX.read(bytes, { type: 'array' }).Sheets['SOP'];
  expect(ws['D2'].t).toBe('s');
});

test('zero steps exports header only', () => {
  expect(JSON.parse(toJsonText({ title: 'E', steps: [] }))).toEqual([]);
  expect(sheetRows(toXlsxBytes({ title: 'E', steps: [] }))).toEqual([['Step', 'Title', 'Description', 'Duration']]);
});

test('safeFileName', () => {
  expect(safeFileName('a/b: c?')).toBe('ab c');
  expect(safeFileName('  ')).toBe('SOP');
});
