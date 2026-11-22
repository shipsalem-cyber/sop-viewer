import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { formatDuration } from '../lib/duration';
import { failureText, importMany, noticeText } from '../lib/importMany';
import { findByTitle, libraryReducer, newRecipe, openRecipe, type Library } from '../lib/library';
import { loadLibrary, saveLibrary } from '../lib/libraryStorage';
import { stepCount } from '../lib/recipe';
import { totalSeconds, type SopAction } from '../lib/sopReducer';
import { primeAudio, requestPermissionOnce, showSystemNotification, startAlarm, startTitleFlash } from '../lib/notify';
import type { Step } from '../lib/types';
import { DoneAlert } from './DoneAlert';
import { DownloadMenu } from './DownloadMenu';
import { ExampleDownloads } from './ExampleDownloads';
import { ImportControls } from './ImportControls';
import { IngredientsSummary } from './IngredientsSummary';
import { RecipeList } from './RecipeList';
import { StepList } from './StepList';
import { StepMode } from './StepMode';

const MSG_CORRUPT = "Saved recipes couldn't be read and were cleared.";
const MSG_NOT_SAVED = "Recipes won't be remembered on this device.";

export function App() {
  const [loaded] = useState(() => loadLibrary());
  const [library, libDispatch] = useReducer(libraryReducer, loaded.library);
  const sop = openRecipe(library);
  const dispatch = useCallback((action: SopAction) => libDispatch({ type: 'edit', action }), []);
  const [storageNotice, setStorageNotice] = useState<string | null>(loaded.problem === 'corrupt' ? MSG_CORRUPT : null);
  const warnedNotSaved = useRef(false);
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

  // Remember the library on this device after every change; warn once if the browser won't store it.
  useEffect(() => {
    if (saveLibrary(library) || warnedNotSaved.current) return;
    warnedNotSaved.current = true;
    setStorageNotice(MSG_NOT_SAVED);
  }, [library]);

  // After "+ Add step", open the editor on the step that was just appended.
  useEffect(() => {
    if (editNewStep.current && sop?.steps.length) {
      editNewStep.current = false;
      setEditingId(sop.steps[sop.steps.length - 1].id);
    }
  }, [sop]);

  const handleFiles = async (files: File[]) => {
    const { imported, failed } = await importMany(files);
    // Track the library as it grows during this batch, so duplicates within one drop are caught too.
    let lib: Library = library;
    let firstId: string | null = null;
    for (const { result } of imported) {
      const existing = findByTitle(lib.recipes, result.sop.title);
      let action;
      if (existing) {
        if (!window.confirm(`Replace "${existing.title}"? OK replaces it, Cancel keeps the current one.`)) continue;
        action = { type: 'replace', id: existing.id, sop: result.sop } as const;
      } else {
        action = { type: 'add', recipe: newRecipe(result.sop) } as const;
      }
      lib = libraryReducer(lib, action);
      libDispatch(action);
      firstId ??= lib.openId;
    }
    if (firstId) {
      libDispatch({ type: 'open', id: firstId });
      setEditingId(null);
      clearDone();
      setView('list');
    }
    setError(failureText(failed));
    setNotice(noticeText(imported));
  };

  const openOther = (id: string) => {
    setEditingId(null);
    libDispatch({ type: 'open', id });
  };

  const removeOpen = () => {
    if (!sop || !window.confirm(`Remove "${sop.title}" from this device?`)) return;
    setEditingId(null);
    libDispatch({ type: 'remove', id: sop.id });
  };

  const clearAll = () => {
    const n = library.recipes.length;
    if (!window.confirm(`Remove all ${n} ${n === 1 ? 'recipe' : 'recipes'} from this device? This can't be undone.`)) return;
    setEditingId(null);
    setNotice(null);
    libDispatch({ type: 'clear' });
  };

  const total = sop ? totalSeconds(sop) : 0;

  return (
    <div className="app">
      <header className="toolbar">
        <ImportControls onFiles={handleFiles} disabled={view === 'steps'} />
        {sop && view === 'list' && <DownloadMenu sop={sop} />}
      </header>

      {error && (
        <div role="alert" className="banner banner-error">
          {error}
          <button className="icon-btn" aria-label="Dismiss error" onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {storageNotice && (
        <div role="status" className="banner banner-info">
          {storageNotice}
          <button className="icon-btn" aria-label="Dismiss storage notice" onClick={() => setStorageNotice(null)}>✕</button>
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
          <p>Import one or more Excel or JSON files</p>
          <p className="muted">or drop files anywhere on the page</p>
          <p className="muted small">Columns: Type · Step · Title · Description · Duration</p>
          <ExampleDownloads />
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
        <div className="library">
        <RecipeList
          recipes={library.recipes}
          openId={library.openId}
          onOpen={openOther}
          onRemove={removeOpen}
          onClearAll={clearAll}
        />
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
        </div>
      )}
    </div>
  );
}
