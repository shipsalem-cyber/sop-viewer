import * as XLSX from 'xlsx';
import { stepNumbers } from './recipe';
import type { Sop } from './types';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const HEADER = ['Type', 'Step', 'Title', 'Description', 'Duration'] as const;
const DURATION_COL = 4;

const typeLabel = (s: Sop['steps'][number]) => (s.kind === 'ingredient' ? 'Ingredient' : 'Step');

export function toJsonText(sop: Sop): string {
  const nos = stepNumbers(sop.steps);
  const rows = sop.steps.map((s, i) => ({
    Type: typeLabel(s),
    Step: nos[i],
    Title: s.title,
    Description: s.description,
    Duration: s.duration,
  }));
  return JSON.stringify(rows, null, 2);
}

export function toXlsxBytes(sop: Sop): ArrayBuffer {
  const nos = stepNumbers(sop.steps);
  const ws = XLSX.utils.aoa_to_sheet([
    [...HEADER],
    ...sop.steps.map((s, i) => [typeLabel(s), nos[i], s.title, s.description, null]),
  ]);
  // Duration is always written as text so values like "10" or "01:30" round-trip unchanged.
  sop.steps.forEach((s, i) => {
    ws[XLSX.utils.encode_cell({ r: i + 1, c: DURATION_COL })] = { t: 's', v: s.duration };
  });
  ws['!cols'] = [{ wch: 11 }, { wch: 6 }, { wch: 28 }, { wch: 60 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SOP');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

export function safeFileName(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '').trim() || 'SOP';
}

export function downloadFile(bytes: BlobPart, fileName: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
