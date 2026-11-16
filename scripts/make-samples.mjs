// Writes example SOPs to samples/ as both .json and .xlsx, in the app's download format.
import { writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const examples = {
  // A recipe.
  Sourdough: [
    ['Mix flour & water', 'Combine 500 g bread flour with 350 g water.\nMix until no dry bits remain.', '10 min'],
    ['Rest (autolyse)', 'Cover the bowl and leave at room temperature.', '30 min'],
    ['Add starter', 'Add 100 g active starter and 10 g salt. Squeeze to combine.', '45 sec'],
    ['Bulk ferment', 'Stretch and fold every 30 minutes, 4 times, then leave covered.', '1h 30m'],
    ['Shape', 'Turn out, pre-shape, rest briefly, then shape and place in a floured basket.', ''],
  ],
  // A work procedure, showing every duration style the app understands.
  'Clean Espresso Machine': [
    ['Prepare', 'Put on gloves. Fill a jug with 500 ml hot water and 1 cleaning tablet.\nPlace the blind basket in the group handle.', ''],
    ['Backflush with cleaner', 'Lock in the group handle and run the pump.', '10 sec'],
    ['Rest', 'Stop the pump and let the cleaner sit in the group head.', '0:30'],
    ['Repeat backflush', 'Run and stop the pump 5 more times.', '1 min 30 sec'],
    ['Soak parts', 'Soak group handles and baskets in the cleaning jug.', '15 min'],
    ['Purge steam wand', 'Wipe the wand with a damp cloth, then open the steam valve.', '5s'],
    ['Rinse', 'Rinse all parts under running water and refit them.', 'about 5 minutes'],
    ['Flush with water', 'Backflush with clean water (blind basket, no tablet) to remove any cleaner.', '2'],
    ['Test shot', 'Pull one shot and discard it. Check taste before serving.', '1:00'],
  ],
};

for (const [name, steps] of Object.entries(examples)) {
  const rows = steps.map(([Title, Description, Duration], i) => ({ Step: i + 1, Title, Description, Duration }));
  writeFileSync(`samples/${name}.json`, JSON.stringify(rows, null, 2) + '\n');

  const ws = XLSX.utils.aoa_to_sheet([
    ['Step', 'Title', 'Description', 'Duration'],
    ...rows.map((r) => [r.Step, r.Title, r.Description, null]),
  ]);
  // Duration as text so "0:30" stays 30 seconds instead of Excel turning it into a time of day.
  rows.forEach((r, i) => { ws[XLSX.utils.encode_cell({ r: i + 1, c: 3 })] = { t: 's', v: r.Duration }; });
  ws['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 70 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SOP');
  writeFileSync(`samples/${name}.xlsx`, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  console.log(`wrote samples/${name}.json, samples/${name}.xlsx`);
}
