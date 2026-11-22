import { importFile } from './importSop';
import { ImportError, type ImportResult } from './types';

export type ImportedFile = { fileName: string; result: ImportResult };
export type FailedFile = { fileName: string; message: string };

/** Reads each file in order; one bad file never stops the others. */
export async function importMany(files: File[]): Promise<{ imported: ImportedFile[]; failed: FailedFile[] }> {
  const imported: ImportedFile[] = [];
  const failed: FailedFile[] = [];
  for (const file of files) {
    try {
      imported.push({ fileName: file.name, result: await importFile(file) });
    } catch (e) {
      failed.push({ fileName: file.name, message: e instanceof ImportError ? e.message : 'Something went wrong reading that file.' });
    }
  }
  return { imported, failed };
}

export function failureText(failed: FailedFile[]): string | null {
  if (failed.length === 0) return null;
  return `Couldn't import: ${failed.map((f) => `${f.fileName} — ${f.message}`).join(' · ')}`;
}

function notesFor({ ignoredColumns, unknownTypes }: ImportResult): string[] {
  return [
    ignoredColumns.length ? `These columns will not be included in downloads: ${ignoredColumns.join(', ')}` : '',
    unknownTypes.length ? `Type values not recognised (treated as Step): ${unknownTypes.join(', ')}` : '',
  ].filter(Boolean);
}

export function noticeText(imported: ImportedFile[]): string | null {
  const parts = imported
    .map((f) => ({ fileName: f.fileName, notes: notesFor(f.result) }))
    .filter((f) => f.notes.length)
    .map((f) => `${f.fileName}: ${f.notes.join('. ')}`);
  return parts.length ? parts.join(' · ') : null;
}
