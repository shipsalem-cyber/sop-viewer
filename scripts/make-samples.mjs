// Writes samples/Sourdough.json and samples/Sourdough.xlsx in the app's download format.
import { writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const steps = [
  ['Mix flour & water', 'Combine 500 g bread flour with 350 g water.\nMix until no dry bits remain.', '10 min'],
  ['Rest (autolyse)', 'Cover the bowl and leave at room temperature.', '30 min'],
  ['Add starter', 'Add 100 g active starter and 10 g salt. Squeeze to combine.', '45 sec'],
  ['Bulk ferment', 'Stretch and fold every 30 minutes, 4 times, then leave covered.', '1h 30m'],
  ['Shape', 'Turn out, pre-shape, rest briefly, then shape and place in a floured basket.', ''],
];

const rows = steps.map(([Title, Description, Duration], i) => ({ Step: i + 1, Title, Description, Duration }));
writeFileSync('samples/Sourdough.json', JSON.stringify(rows, null, 2) + '\n');

const ws = XLSX.utils.aoa_to_sheet([['Step', 'Title', 'Description', 'Duration'], ...rows.map((r) => [r.Step, r.Title, r.Description, null])]);
rows.forEach((r, i) => { ws[XLSX.utils.encode_cell({ r: i + 1, c: 3 })] = { t: 's', v: r.Duration }; });
ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 60 }, { wch: 12 }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'SOP');
writeFileSync('samples/Sourdough.xlsx', XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
console.log('wrote samples/Sourdough.json, samples/Sourdough.xlsx');
