import { useEffect, useRef, useState } from 'react';

type Props = { onFiles(files: File[]): void; disabled?: boolean };

/** "Import" button plus a whole-window drop zone; both accept several files. Hidden and inert while disabled. */
export function ImportControls({ onFiles, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
    // While disabled, drops are still swallowed so the browser doesn't navigate away to the file.
    const enter = (e: DragEvent) => { if (hasFiles(e) && !disabledRef.current) { depth++; setDragging(true); } };
    const leave = (e: DragEvent) => { if (hasFiles(e) && !disabledRef.current && --depth <= 0) { depth = 0; setDragging(false); } };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (disabledRef.current) return;
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) onFilesRef.current(files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, []);

  useEffect(() => { if (disabled) setDragging(false); }, [disabled]);

  if (disabled) return null;

  return (
    <>
      <label className="btn btn-primary">
        Import Excel/JSON
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.json"
          multiple
          className="visually-hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (files.length) onFiles(files);
          }}
        />
      </label>
      {dragging && <div className="drop-overlay">Drop your Excel or JSON files</div>}
    </>
  );
}
