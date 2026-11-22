import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { formatDuration } from '../lib/duration';
import { importFile } from '../lib/importSop';
import { stepCount } from '../lib/recipe';
import { sopReducer, totalSeconds } from '../lib/sopReducer';
import { primeAudio, requestPermissionOnce, showSystemNotification, startAlarm, startTitleFlash } from '../lib/notify';
import { ImportError, type Step } from '../lib/types';
import { DoneAlert } from './DoneAlert';
import { DownloadMenu } from './DownloadMenu';
import { ImportControls } from './ImportControls';
import { IngredientsSummary } from './IngredientsSummary';
import { StepList } from './StepList';
import { StepMode } from './StepMode';

export function App() {
  const [sop, dispatch] = useReducer(sopReducer, null);
  const [view, setView] = useState<'list' | 'steps'>('list');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editNewStep = useRef(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const stopEffects = useRef<(() => void)[]>([]);

  const clearDone = useCallback(() => {
    stopEffects.current.forEach((stop) => stop());
    stopEffects.current = [];
    setDoneMessage(null);
  }, []);

  const handleTimerEnd = (step: Step, index: number) => {
    clearDone();
    const message = `Step ${index + 1} — ${step.title} is done`;
    setDoneMessage(message);
    showSystemNotification(message);
    stopEffects.current = [startAlarm(), startTitleFlash(document.title)];
  };

  useEffect(() => clearDone, [clearDone]);

  // After "+ Add step", open the editor on the step that was just appended.
  useEffect(() => {
    if (editNewStep.current && sop?.steps.length) {
      editNewStep.current = false;
      setEditingId(sop.steps[sop.steps.length - 1].id);
    }
  }, [sop]);

  const handleFile = async (file: File) => {
    if (sop && !window.confirm('Replace the current SOP? Unsaved changes will be lost.')) return;
    try {
      const { sop: next, ignoredColumns, unknownTypes } = await importFile(file);
      dispatch({ type: 'load', sop: next });
      setError(null);
      setEditingId(null);
      clearDone();
      setView('list');
      const notes = [
        ignoredColumns.length && `These columns will not be included in downloads: ${ignoredColumns.join(', ')}`,
        unknownTypes.length && `Type values not recognised (treated as Step): ${unknownTypes.join(', ')}`,
      ].filter(Boolean);
      setNotice(notes.length ? notes.join('. ') : null);
    } catch (e) {
      setError(e instanceof ImportError ? e.message : 'Something went wrong reading that file.');
    }
  };

  const total = sop ? totalSeconds(sop) : 0;

  return (
    <div className="app">
      <header className="toolbar">
        <ImportControls onFiles={(files) => files[0] && handleFile(files[0])} />
        {sop && <DownloadMenu sop={sop} />}
      </header>

      {error && (
        <div role="alert" className="banner banner-error">
          {error}
          <button className="icon-btn" aria-label="Dismiss error" onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {notice && (
        <div role="status" className="banner banner-info">
          {notice}
          <button className="icon-btn" aria-label="Dismiss notice" onClick={() => setNotice(null)}>✕</button>
        </div>
      )}

      {!sop ? (
        <main className="empty">
          <h1>SOP &amp; Recipe Viewer</h1>
          <p>Import an Excel or JSON file to see it step by step.</p>
          <p className="muted">or drop a file anywhere on the page</p>
          <p className="muted small">Columns: Type · Step · Title · Description · Duration</p>
        </main>
      ) : view === 'steps' ? (
        <>
          {doneMessage && <DoneAlert message={doneMessage} onDismiss={clearDone} />}
          <StepMode
            sop={sop}
            onExit={() => { clearDone(); setView('list'); }}
            onTimerStart={() => { clearDone(); primeAudio(); requestPermissionOnce(); }}
            onTimerEnd={handleTimerEnd}
          />
        </>
      ) : (
        <main>
          <div className="sop-header">
            <input
              className="sop-title"
              aria-label="SOP title"
              value={sop.title}
              onChange={(e) => dispatch({ type: 'setTitle', title: e.target.value })}
            />
            {total > 0 && <span className="total">Total: {formatDuration(total)}</span>}
          </div>
          <IngredientsSummary items={sop.steps} />
          <StepList steps={sop.steps} editingId={editingId} setEditingId={setEditingId} dispatch={dispatch} />
          {sop.steps.length === 0 && <p className="muted">No steps yet.</p>}
          <div className="list-actions">
            <button
              className="btn"
              onClick={() => {
                editNewStep.current = true;
                dispatch({ type: 'addStep' });
              }}
            >
              + Add step
            </button>
            <button
              className="btn"
              onClick={() => {
                editNewStep.current = true;
                dispatch({ type: 'addIngredient' });
              }}
            >
              + Add ingredient
            </button>
            <button className="btn btn-primary" disabled={stepCount(sop.steps) === 0} onClick={() => setView('steps')}>
              ▶ Start step-by-step
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
