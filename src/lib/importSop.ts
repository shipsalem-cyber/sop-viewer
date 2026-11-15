import * as XLSX from 'xlsx';
import { formatDuration } from './duration';
import { ImportError, newStepId, type ImportResult, type Step } from './types';

type Field = 'step' | 'title' | 'description' | 'duration';
const FIELDS: readonly Field[] = ['step', 'title', 'description', 'duration'];

const MSG_NO_HEADER = "Couldn't find a header row with a 'Title' column.";
const MSG_NO_STEPS = 'The file has no steps.';
const MSG_BAD_JSON = "This JSON file couldn't be read.";
const MSG_NO_LIST = "This JSON file doesn't contain a list of steps.";
const MSG_UNSUPPORTED = 'Unsupported file type. Please choose an Excel (.xlsx) or JSON file.';

/** "  Duration (min) " -> "duration"; returns the known field or null. */
function fieldOf(name: string): Field | null {
  const n = name.trim().replace(/\s*\(.*\)\s*$/, '').toLowerCase();
  return (FIELDS as readonly string[]).includes(n) ? (n as Field) : null;
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim() || 'SOP';
}

function text(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}

/** Shared by JSON and Excel: rows are keyed by the file's own header names. */
export function rowsToSop(rows: Record<string, unknown>[], header: string[], fileName: string): ImportResult {
  const colFor = new Map<Field, string>();
  const ignoredColumns: string[] = [];
  for (const h of header) {
    const f = fieldOf(h);
    if (f && !colFor.has(f)) colFor.set(f, h);
    else if (!f && h.trim()) ignoredColumns.push(h.trim());
  }
  if (!colFor.has('title')) throw new ImportError(MSG_NO_HEADER);

  const get = (row: Record<string, unknown>, f: Field) => {
    const col = colFor.get(f);
    return col === undefined ? '' : text(row[col]);
  };

  const parsed = rows
    .map((row) => ({
      stepNo: get(row, 'step').trim(),
      step: {
        id: newStepId(),
        title: get(row, 'title'),
        description: get(row, 'description'),
        duration: get(row, 'duration').trim(),
      } satisfies Step,
    }))
    .filter(({ stepNo, step }) => stepNo || step.title.trim() || step.description.trim() || step.duration);

  if (parsed.length === 0) throw new ImportError(MSG_NO_STEPS);

  const allNumeric = parsed.every(({ stepNo }) => stepNo !== '' && Number.isFinite(Number(stepNo)));
  if (allNumeric) parsed.sort((a, b) => Number(a.stepNo) - Number(b.stepNo)); // Array.sort is stable

  return { sop: { title: baseName(fileName), steps: parsed.map((p) => p.step) }, ignoredColumns };
}

export function parseJsonText(source: string, fileName: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch {
    throw new ImportError(MSG_BAD_JSON);
  }

  let list: unknown;
  let title: string | undefined;
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    list = obj.steps;
    if (typeof obj.title === 'string' && obj.title.trim()) title = obj.title.trim();
  }
  if (!Array.isArray(list)) throw new ImportError(MSG_NO_LIST);
  if (list.length === 0) throw new ImportError(MSG_NO_STEPS);

  const rows = list.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r));
  const header: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!header.includes(k)) header.push(k);

  const result = rowsToSop(rows, header, fileName);
  if (title) result.sop.title = title;
  return result;
}

function cellText(cell: XLSX.CellObject | undefined, isDuration: boolean): string {
  if (!cell || cell.v === undefined || cell.v === null) return '';
  if (cell.t === 's') return String(cell.v);
  if (isDuration && cell.t === 'n' && XLSX.SSF.is_date(String(cell.z ?? ''))) {
    return formatDuration(Math.round((cell.v as number) * 86400));
  }
  return cell.w ?? String(cell.v);
}

export function parseWorkbook(data: ArrayBuffer, fileName: string): ImportResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(data, { type: 'array', cellNF: true });
  } catch {
    throw new ImportError("This Excel file couldn't be read.");
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws || !ws['!ref']) throw new ImportError(MSG_NO_HEADER);
  const range = XLSX.utils.decode_range(ws['!ref']);
  const at = (r: number, c: number) => ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;

  let headerRow = -1;
  for (let r = range.s.r; r <= range.e.r && headerRow < 0; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (fieldOf(cellText(at(r, c), false)) === 'title') {
        headerRow = r;
        break;
      }
    }
  }
  if (headerRow < 0) throw new ImportError(MSG_NO_HEADER);

  const cols: { c: number; name: string }[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const name = cellText(at(headerRow, c), false);
    if (name.trim()) cols.push({ c, name });
  }

  const rows: Record<string, unknown>[] = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const row: Record<string, unknown> = {};
    for (const { c, name } of cols) row[name] = cellText(at(r, c), fieldOf(name) === 'duration');
    rows.push(row);
  }

  return rowsToSop(rows, cols.map((c) => c.name), fileName);
}

export async function importFile(file: File): Promise<ImportResult> {
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext === '.json') return parseJsonText(await file.text(), file.name);
  if (ext === '.xlsx' || ext === '.xls') return parseWorkbook(await file.arrayBuffer(), file.name);
  throw new ImportError(MSG_UNSUPPORTED);
}
