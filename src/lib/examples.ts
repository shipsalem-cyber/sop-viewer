import coffeeJson from '../../samples/Pour-over Coffee.json?raw';
import sourdoughJson from '../../samples/Sourdough.json?raw';
import espressoJson from '../../samples/Clean Espresso Machine.json?raw';
import { parseJsonText } from './importSop';
import type { Sop } from './types';

/** Example recipes offered for download on the first page, built from samples/*.json. */
export type Example = { label: string; sop: Sop };

export const EXAMPLES: Example[] = [
  { label: 'Pour-over Coffee (with ingredients)', sop: parseJsonText(coffeeJson, 'Pour-over Coffee.json').sop },
  { label: 'Sourdough', sop: parseJsonText(sourdoughJson, 'Sourdough.json').sop },
  { label: 'Clean Espresso Machine (SOP)', sop: parseJsonText(espressoJson, 'Clean Espresso Machine.json').sop },
];
