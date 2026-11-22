import { failureText, importMany, noticeText } from './importMany';

const json = (rows: unknown, name: string) => new File([JSON.stringify(rows)], name, { type: 'application/json' });

test('imports good files and collects failures in order', async () => {
  const { imported, failed } = await importMany([
    json([{ Title: 'Mix' }], 'Bread.json'),
    new File(['a,b'], 'notes.csv'),
    json([{ Title: 'Brew' }], 'Coffee.json'),
  ]);
  expect(imported.map((f) => [f.fileName, f.result.sop.title])).toEqual([['Bread.json', 'Bread'], ['Coffee.json', 'Coffee']]);
  expect(failed).toEqual([{ fileName: 'notes.csv', message: 'Unsupported file type. Please choose an Excel (.xlsx) or JSON file.' }]);
});

test('failureText', () => {
  expect(failureText([
    { fileName: 'a.csv', message: 'Unsupported file type. Please choose an Excel (.xlsx) or JSON file.' },
    { fileName: 'b.json', message: "This JSON file couldn't be read." },
  ])).toBe("Couldn't import: a.csv — Unsupported file type. Please choose an Excel (.xlsx) or JSON file. · b.json — This JSON file couldn't be read.");
  expect(failureText([])).toBeNull();
});

test('noticeText', async () => {
  const { imported } = await importMany([json([{ Title: 'A', Image: 'x.png' }], 'Bread.json'), json([{ Title: 'B' }], 'Tea.json')]);
  expect(noticeText(imported)).toBe('Bread.json: These columns will not be included in downloads: Image');
  expect(noticeText(imported.slice(1))).toBeNull();
});
