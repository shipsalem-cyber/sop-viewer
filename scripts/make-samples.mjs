// Writes example recipes/SOPs to samples/ as both .json and .xlsx, in the app's download format:
// Type | Step | Title | Description | Duration  (Step numbers count steps only).
import { writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const I = (title, amount = '') => ['Ingredient', title, amount, ''];
const S = (title, description = '', duration = '') => ['Step', title, description, duration];

const examples = {
  // A recipe with ingredients, including one placed right before the step that needs it.
  'Pour-over Coffee': [
    I('Coffee', '18 g, medium-fine'),
    I('Water', '300 ml, 94 °C'),
    I('Filter paper', '1'),
    S('Rinse filter', 'Place the filter in the dripper and rinse it with hot water. Discard the water.', '20 sec'),
    S('Add coffee', 'Add the ground coffee and shake gently to level the bed.'),
    S('Bloom', 'Pour 40 ml of water over the grounds and let it bloom.', '45 sec'),
    I('Cup', 'warmed'),
    S('Pour', 'Pour the rest of the water in slow circles until you reach 300 ml.', '2 min 30 sec'),
  ],
  // A recipe without an ingredients list.
  Sourdough: [
    S('Mix flour & water', 'Combine 500 g bread flour with 350 g water.\nMix until no dry bits remain.', '10 min'),
    S('Rest (autolyse)', 'Cover the bowl and leave at room temperature.', '30 min'),
    S('Add starter', 'Add 100 g active starter and 10 g salt. Squeeze to combine.', '45 sec'),
    S('Bulk ferment', 'Stretch and fold every 30 minutes, 4 times, then leave covered.', '1h 30m'),
    S('Shape', 'Turn out, pre-shape, rest briefly, then shape and place in a floured basket.'),
  ],
  // A work procedure, showing every duration style the app understands.
  'Clean Espresso Machine': [
    S('Prepare', 'Put on gloves. Fill a jug with 500 ml hot water and 1 cleaning tablet.\nPlace the blind basket in the group handle.'),
    S('Backflush with cleaner', 'Lock in the group handle and run the pump.', '10 sec'),
    S('Rest', 'Stop the pump and let the cleaner sit in the group head.', '0:30'),
    S('Repeat backflush', 'Run and stop the pump 5 more times.', '1 min 30 sec'),
    S('Soak parts', 'Soak group handles and baskets in the cleaning jug.', '15 min'),
    S('Purge steam wand', 'Wipe the wand with a damp cloth, then open the steam valve.', '5s'),
    S('Rinse', 'Rinse all parts under running water and refit them.', 'about 5 minutes'),
    S('Flush with water', 'Backflush with clean water (blind basket, no tablet) to remove any cleaner.', '2'),
    S('Test shot', 'Pull one shot and discard it. Check taste before serving.', '1:00'),
  ],
};

for (const [name, items] of Object.entries(examples)) {
  let n = 0;
  const rows = items.map(([Type, Title, Description, Duration]) => ({
    Type,
    Step: Type === 'Step' ? ++n : null,
    Title,
    Description,
    Duration,
  }));
  writeFileSync(`samples/${name}.json`, JSON.stringify(rows, null, 2) + '\n');

  const ws = XLSX.utils.aoa_to_sheet([
    ['Type', 'Step', 'Title', 'Description', 'Duration'],
    ...rows.map((r) => [r.Type, r.Step, r.Title, r.Description, null]),
  ]);
  // Duration as text so "0:30" stays 30 seconds instead of Excel turning it into a time of day.
  rows.forEach((r, i) => { ws[XLSX.utils.encode_cell({ r: i + 1, c: 4 })] = { t: 's', v: r.Duration }; });
  ws['!cols'] = [{ wch: 11 }, { wch: 6 }, { wch: 26 }, { wch: 70 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SOP');
  writeFileSync(`samples/${name}.xlsx`, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  console.log(`wrote samples/${name}.json, samples/${name}.xlsx`);
}
