import * as XLSX from 'xlsx';

type CellSpec = { t: XLSX.ExcelDataType; v: unknown; z?: string };

function isCellSpec(x: unknown): x is CellSpec {
  return typeof x === 'object' && x !== null && 't' in x && 'v' in x;
}

/** Build an .xlsx in memory. Plain values become ordinary cells; {t,v,z} objects become exact cells. */
export function makeXlsx(rows: unknown[][]): ArrayBuffer {
  const plain = rows.map((r) => r.map((c) => (isCellSpec(c) ? null : c)));
  const ws = XLSX.utils.aoa_to_sheet(plain);
  rows.forEach((r, ri) =>
    r.forEach((c, ci) => {
      if (isCellSpec(c)) ws[XLSX.utils.encode_cell({ r: ri, c: ci })] = { ...c };
    }),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}
