import { useEffect, useRef, useState } from 'react';
import { downloadFile, safeFileName, toJsonText, toXlsxBytes, XLSX_MIME } from '../lib/exportSop';
import type { Sop } from '../lib/types';

export function DownloadMenu({ sop }: { sop: Sop }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const name = safeFileName(sop.title);
  const pick = (kind: 'xlsx' | 'json') => {
    setOpen(false);
    if (kind === 'xlsx') downloadFile(toXlsxBytes(sop), `${name}.xlsx`, XLSX_MIME);
    else downloadFile(toJsonText(sop), `${name}.json`, 'application/json');
  };

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Download ▾
      </button>
      {open && (
        <div role="menu" className="menu">
          <button role="menuitem" onClick={() => pick('xlsx')}>Excel (.xlsx)</button>
          <button role="menuitem" onClick={() => pick('json')}>JSON</button>
        </div>
      )}
    </div>
  );
}
