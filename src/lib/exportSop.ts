import * as XLSX from 'xlsx';
import type { Sop } from './types';

const HEADER = ['Step', 'Title', 'Description', 'Duration'] as const;

export function toJsonText(sop: Sop): string {
  const rows = sop.steps.map((s, i) => ({
    Step: i + 1,
    Title: s.title,
    Description: s.description,
    Duration: s.duration,
  }));
  return JSON.stringify(rows, null, 2);
}

export function toXlsxBytes(sop: Sop): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet([
    [...HEADER],
    ...sop.steps.map((s, i) => [i + 1, s.title, s.description, null]),
  ]);
  // Duration is always written as text so values like "10" or "01:30" round-trip unchanged.
  sop.steps.forEach((s, i) => {
    ws[XLSX.utils.encode_cell({ r: i + 1, c: 3 })] = { t: 's', v: s.duration };
  });
  ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 60 }, { wch: 12 }];
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
