# SOP & Recipe Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser-only static web app that imports an SOP/recipe from Excel or JSON, lets the user reorder (drag and drop), edit, add and delete steps, walk through it step by step with a timer and end-of-timer notifications, and download it as Excel or JSON.

**Architecture:** Pure logic lives in `src/lib/` (duration parsing, import, export, state reducer, notifications) and is unit-tested with Vitest. React components in `src/components/` hold no business rules beyond wiring; one `useReducer` at the top of `App` owns the SOP. The build is a single self-contained `index.html` so it can be hosted anywhere or opened by double-click.

**Tech Stack:** Node.js 20+, Vite 5, React 18, TypeScript, SheetJS (`xlsx`), `@dnd-kit/core` + `@dnd-kit/sortable`, `vite-plugin-singlefile`, Vitest + `@testing-library/react` + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-15-sop-viewer-design.md`

## Global Constraints

- Static output only — no server, database, or network calls at runtime.
- No persistence: no localStorage/IndexedDB; refresh clears everything.
- Fields: `Step | Title | Description | Duration` (no `type`, no `Image`).
- One SOP open at a time; one timer at a time.
- Downloads: one sheet, four columns in order `Step | Title | Description | Duration`; Duration written as text; JSON is a bare array; file name = SOP title.
- Plain-number duration = minutes. Text `01:30` = 1 min 30 s; an Excel time-value cell = its stored time (e.g. 1 h 30 m).
- Notification permission is requested on the first timer start, never on page load.
- `dist/index.html` must work when opened via `file://` (single-file build).

## Review Focus

1. **Timer accuracy when the tab is in the background** — browsers throttle `setInterval`; the countdown must be computed from an end timestamp, so a 30-min timer still ends at 30 min. Test in Task 6.
2. **Unparseable durations** such as `5-10 min`, `about 1 hour`, `1.5 h` — `5-10 min` and `about 1 hour` show as text with no timer and are excluded from the total; `1.5 h` parses as 5400 s. Test in Task 1.
3. **Wrong or broken file** (`.csv`, `.docx`, malformed JSON, JSON that is a number) — clear error message, current SOP unchanged. Tests in Tasks 2 and 5.
4. **`Step` numbers out of order or duplicated** (`3,1,2` or `1,1,2`) — sorted by `Step`, ties keep file order; non-numeric `Step` falls back to file order. Test in Task 2.
5. **SOP with zero steps** (all deleted) — "Start step-by-step" disabled; download still works and produces a header-only file. Tests in Tasks 3 and 5.

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, index.html
src/main.tsx                     – mounts <App/>
src/styles.css                   – all styling
src/lib/types.ts                 – Step, Sop, ImportResult, ImportError
src/lib/duration.ts              – parse/format durations
src/lib/importSop.ts             – JSON + Excel → ImportResult
src/lib/exportSop.ts             – Sop → JSON string / xlsx bytes; download helper
src/lib/sopReducer.ts            – all SOP edits
src/lib/useCountdown.ts          – timestamp-based countdown hook
src/lib/notify.ts                – permission, browser notification, sound, title flash
src/components/App.tsx           – reducer owner, view switch (list | step mode)
src/components/ImportControls.tsx– file button, page drop zone, replace confirm
src/components/StepList.tsx      – dnd-kit sortable list + add step
src/components/StepRow.tsx       – one row: handle, number, title, duration, inline edit
src/components/DownloadMenu.tsx  – Excel / JSON download
src/components/StepMode.tsx      – one-step view, Back/Next, timer controls
src/components/DoneAlert.tsx     – on-page "is done" alert
Tests colocated as *.test.ts(x); fixtures in src/test/fixtures/
```

---

### Task 1: Project scaffold + duration parsing

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/styles.css`, `.gitignore`
- Create: `src/lib/duration.ts`
- Test: `src/lib/duration.test.ts`

**Interfaces:**
- Produces:
  - `parseDuration(text: string): number | null` — seconds, or `null` if empty/unparseable
  - `formatDuration(seconds: number): string` — compact human form: `"45s"`, `"1m 30s"`, `"10m"`, `"1h 45m"`, `"1h 15m 20s"`
  - `formatClock(seconds: number): string` — countdown form: `"0:45"`, `"30:00"`, `"1:02:30"`

- [ ] **Step 1: Scaffold**

`git init`; `npm create vite@latest . -- --template react-ts`; add deps `xlsx @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`, dev deps `vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom vite-plugin-singlefile`. In `vite.config.ts`: `base: './'`, plugins `[react(), viteSingleFile()]`, `test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'] }` (setup imports `@testing-library/jest-dom/vitest`). Add script `"test": "vitest run"`. Remove Vite demo content.

- [ ] **Step 2: Write the failing tests**

```ts
import { parseDuration, formatDuration, formatClock } from './duration';

test.each([
  ['45 sec', 45], ['30s', 30], ['45 seconds', 45],
  ['5 min', 300], ['5m', 300], ['10 minutes', 600],
  ['1h 30m', 5400], ['1 hr 15 min 20 sec', 4520], ['2 hours', 7200],
  ['1.5 h', 5400],
  ['01:30', 90], ['1:02:30', 3750],
  ['10', 600], ['  5 MIN ', 300],
])('parseDuration(%j) = %i', (txt, secs) => expect(parseDuration(txt)).toBe(secs));

test.each(['', '   ', '5-10 min', 'about 1 hour', 'soon', '1:99'])(
  'parseDuration(%j) is null', (txt) => expect(parseDuration(txt)).toBeNull());

test('formatDuration', () => {
  expect(formatDuration(45)).toBe('45s');
  expect(formatDuration(90)).toBe('1m 30s');
  expect(formatDuration(600)).toBe('10m');
  expect(formatDuration(6300)).toBe('1h 45m');
  expect(formatDuration(4520)).toBe('1h 15m 20s');
  expect(formatDuration(0)).toBe('0s');
});

test('formatClock', () => {
  expect(formatClock(45)).toBe('0:45');
  expect(formatClock(1800)).toBe('30:00');
  expect(formatClock(3750)).toBe('1:02:30');
  expect(formatClock(-3)).toBe('0:00');
});
```

- [ ] **Step 3: Run to verify failure** — `npx vitest run src/lib/duration.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement `src/lib/duration.ts`**

Trim + lowercase. Order: plain number (int or decimal) → minutes; `m:ss` / `h:mm:ss` with each field after the first < 60 (else null); otherwise the whole string must be fully consumed by repeated `<number><unit>` tokens with units `h|hr|hrs|hour|hours`, `m|min|mins|minute|minutes`, `s|sec|secs|second|seconds` (optional spaces) — any leftover text → null. Round to whole seconds.

- [ ] **Step 5: Run tests** — PASS. Also `npm run build` succeeds and produces `dist/index.html` only (no separate JS files).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: scaffold app and duration parsing"`

---

### Task 2: Import (JSON + Excel)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/importSop.ts`
- Create: `src/test/fixtures/makeXlsx.ts` (builds workbooks in-test with SheetJS)
- Test: `src/lib/importSop.test.ts`

**Interfaces:**
- Consumes: `formatDuration` (Task 1)
- Produces (`types.ts`):
  - `type Step = { id: string; title: string; description: string; duration: string }` — step number is the array index + 1, never stored
  - `type Sop = { title: string; steps: Step[] }`
  - `type ImportResult = { sop: Sop; ignoredColumns: string[] }`
  - `class ImportError extends Error {}`
  - `newStepId(): string` (`crypto.randomUUID()`)
- Produces (`importSop.ts`):
  - `importFile(file: File): Promise<ImportResult>` — dispatch on extension `.json` / `.xlsx` / `.xls`; anything else → `ImportError("Unsupported file type. Please choose an Excel (.xlsx) or JSON file.")`
  - `parseJsonText(text: string, fileName: string): ImportResult`
  - `parseWorkbook(data: ArrayBuffer, fileName: string): ImportResult`
  - `rowsToSop(rows: Record<string, unknown>[], header: string[], fileName: string): ImportResult` — shared by both paths

- [ ] **Step 1: Write the failing tests**

```ts
// JSON
test('bare array', () => {
  const r = parseJsonText(JSON.stringify([{ Step: 1, Title: 'Mix', Description: 'a\nb', Duration: '10 min' }]), 'Bread.json');
  expect(r.sop.title).toBe('Bread');
  expect(r.sop.steps).toMatchObject([{ title: 'Mix', description: 'a\nb', duration: '10 min' }]);
  expect(r.ignoredColumns).toEqual([]);
});
test('object with steps + title', () => {
  const r = parseJsonText(JSON.stringify({ title: 'Cake', steps: [{ Title: 'A' }] }), 'x.json');
  expect(r.sop.title).toBe('Cake');
  expect(r.sop.steps[0]).toMatchObject({ title: 'A', description: '', duration: '' });
});
test('case-insensitive keys, unit suffix, extras reported', () => {
  const r = parseJsonText(JSON.stringify([{ ' title ': 'A', 'Duration (min)': '5', Image: 'x.png', type: 'prep' }]), 'x.json');
  expect(r.sop.steps[0]).toMatchObject({ title: 'A', duration: '5' });
  expect(r.ignoredColumns).toEqual(['Image', 'type']);
});
test.each(['not json', '42', '{"steps": 3}', '[]', '[{"Description":"no title"}]'])(
  'bad JSON %j throws ImportError', (t) => expect(() => parseJsonText(t, 'x.json')).toThrow(ImportError));

// Ordering (Review Focus 4)
test('sorts by Step, ties keep file order, non-numeric falls back', () => {
  const r = parseJsonText(JSON.stringify([{ Step: 3, Title: 'c' }, { Step: 1, Title: 'a' }, { Step: 1, Title: 'b' }]), 'x.json');
  expect(r.sop.steps.map(s => s.title)).toEqual(['a', 'b', 'c']);
  const r2 = parseJsonText(JSON.stringify([{ Step: 'x', Title: 'p' }, { Title: 'q' }]), 'x.json');
  expect(r2.sop.steps.map(s => s.title)).toEqual(['p', 'q']);
});

// Excel
test('title row above header, blank rows skipped', () => {
  const buf = makeXlsx([['My SOP'], [], ['step', 'Title', 'Description', 'Duration'], [1, 'Mix', 'x', '45 sec'], [], [2, 'Bake', '', 20]]);
  const r = parseWorkbook(buf, 'Bread.xlsx');
  expect(r.sop.steps.map(s => [s.title, s.duration])).toEqual([['Mix', '45 sec'], ['Bake', '20']]);
});
test('Excel time-value Duration cell uses stored time', () => {
  const buf = makeXlsx([['Title', 'Duration'], ['Rest', { t: 'n', v: 1.5 / 24, z: 'h:mm' }]]);
  expect(parseWorkbook(buf, 'x.xlsx').sop.steps[0].duration).toBe('1h 30m');
});
test('text 01:30 stays text', () => {
  const buf = makeXlsx([['Title', 'Duration'], ['Rest', { t: 's', v: '01:30' }]]);
  expect(parseWorkbook(buf, 'x.xlsx').sop.steps[0].duration).toBe('01:30');
});
test('no Title header → ImportError', () => {
  expect(() => parseWorkbook(makeXlsx([['Name', 'Desc'], ['a', 'b']]), 'x.xlsx')).toThrow(ImportError);
});
test('unsupported extension', async () => {
  await expect(importFile(new File(['a,b'], 'x.csv'))).rejects.toThrow(/Unsupported file type/);
});
```

`makeXlsx(rows: (unknown | {t,v,z})[][]): ArrayBuffer` — `XLSX.utils.aoa_to_sheet`, then overwrite object-valued cells with the given cell object; write with `XLSX.write(wb, { type: 'array', bookType: 'xlsx' })`.

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/lib/importSop.test.ts` → FAIL.

- [ ] **Step 3: Implement**

Header normalisation: `name.trim().replace(/\s*\(.*\)\s*$/, '').toLowerCase()` matched against `step|title|description|duration`; extras reported with their original trimmed name. Excel: `XLSX.read(data, { type: 'array' })`, first sheet; iterate rows via `XLSX.utils.decode_range(ws['!ref'])`; header = first row containing a cell normalising to `title`. For the Duration column, if the cell is `t === 'n'` and `XLSX.SSF.is_date(cell.z ?? '')`, convert `Math.round(cell.v * 86400)` with `formatDuration`; otherwise `String(cell.w ?? cell.v)`. Merged cells need no work (SheetJS stores the value in the top-left cell only). A row is blank if all four known fields are empty. Error messages: no header → `"Couldn't find a header row with a 'Title' column."`; no steps → `"The file has no steps."`; invalid JSON → `"This JSON file couldn't be read."`.

- [ ] **Step 4: Run tests** — PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: import SOP from JSON and Excel"`

---

### Task 3: Export (JSON + Excel)

**Files:**
- Create: `src/lib/exportSop.ts`
- Test: `src/lib/exportSop.test.ts`

**Interfaces:**
- Consumes: `Sop` (Task 2), `parseJsonText`, `parseWorkbook` (Task 2, for round-trip tests)
- Produces:
  - `toJsonText(sop: Sop): string` — pretty-printed bare array `[{Step, Title, Description, Duration}]`
  - `toXlsxBytes(sop: Sop): ArrayBuffer` — sheet named `SOP`, header row `Step | Title | Description | Duration`, all Duration cells type `s`
  - `downloadFile(bytes: BlobPart, fileName: string, mime: string): void` — Blob + object URL + temporary `<a download>`
  - `safeFileName(title: string): string` — strips `\/:*?"<>|`, trims, falls back to `"SOP"`

- [ ] **Step 1: Write the failing tests**

```ts
const sop: Sop = { title: 'Bread', steps: [
  { id: 'a', title: 'Mix', description: 'x\ny', duration: '01:30' },
  { id: 'b', title: 'Bake', description: '', duration: '20 min' }] };

test('JSON shape', () => {
  expect(JSON.parse(toJsonText(sop))).toEqual([
    { Step: 1, Title: 'Mix', Description: 'x\ny', Duration: '01:30' },
    { Step: 2, Title: 'Bake', Description: '', Duration: '20 min' }]);
});
test('xlsx round trip keeps text durations', () => {
  const back = parseWorkbook(toXlsxBytes(sop), 'Bread.xlsx');
  expect(back.sop.steps.map(s => [s.title, s.description, s.duration]))
    .toEqual([['Mix', 'x\ny', '01:30'], ['Bake', '', '20 min']]);
});
test('xlsx header row order', () => {
  const ws = XLSX.read(toXlsxBytes(sop), { type: 'array' }).Sheets['SOP'];
  expect(XLSX.utils.sheet_to_json(ws, { header: 1 })[0]).toEqual(['Step', 'Title', 'Description', 'Duration']);
});
test('zero steps exports header only', () => {
  expect(JSON.parse(toJsonText({ title: 'E', steps: [] }))).toEqual([]);
  const ws = XLSX.read(toXlsxBytes({ title: 'E', steps: [] }), { type: 'array' }).Sheets['SOP'];
  expect(XLSX.utils.sheet_to_json(ws, { header: 1 })).toEqual([['Step', 'Title', 'Description', 'Duration']]);
});
test('safeFileName', () => {
  expect(safeFileName('a/b: c?')).toBe('ab c');
  expect(safeFileName('  ')).toBe('SOP');
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** with `XLSX.utils.aoa_to_sheet` / `book_new` / `book_append_sheet` / `XLSX.write({ type: 'array' })`.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: export SOP to JSON and Excel"`

---

### Task 4: SOP state reducer

**Files:**
- Create: `src/lib/sopReducer.ts`
- Test: `src/lib/sopReducer.test.ts`

**Interfaces:**
- Consumes: `Sop`, `Step`, `newStepId` (Task 2)
- Produces:
  - `type SopAction =`
    `| { type: 'load'; sop: Sop }`
    `| { type: 'setTitle'; title: string }`
    `| { type: 'updateStep'; id: string; patch: Partial<Omit<Step, 'id'>> }`
    `| { type: 'addStep' }` (appends `{ title: 'New step', description: '', duration: '' }`)
    `| { type: 'deleteStep'; id: string }`
    `| { type: 'moveStep'; fromId: string; toId: string }`
  - `sopReducer(state: Sop | null, action: SopAction): Sop | null` — every action except `load` is a no-op when state is `null`
  - `totalSeconds(sop: Sop): number` — sum of `parseDuration` over steps, ignoring `null`

- [ ] **Step 1: Write the failing tests** — one per action: `load` replaces; `setTitle`; `updateStep` patches only that step; `addStep` appends with a fresh id and `title: 'New step'`; `deleteStep` removes; `moveStep` from index 0 to index 2 of `[a,b,c]` gives `[b,c,a]` (use `arrayMove` semantics); actions on `null` return `null`; `totalSeconds` of durations `['10 min', '5-10 min', '45 sec']` = 645.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** (immutable updates; `arrayMove` from `@dnd-kit/sortable`).
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: SOP editing reducer"`

---

### Task 5: Main view (import, list, drag and drop, edit, download)

**Files:**
- Create: `src/components/App.tsx`, `ImportControls.tsx`, `StepList.tsx`, `StepRow.tsx`, `DownloadMenu.tsx`; modify `src/main.tsx`, `src/styles.css`
- Test: `src/components/App.test.tsx`

**Interfaces:**
- Consumes: `importFile`, `ImportError` (Task 2); `toJsonText`, `toXlsxBytes`, `downloadFile`, `safeFileName` (Task 3); `sopReducer`, `totalSeconds` (Task 4); `formatDuration` (Task 1)
- Produces: `App` holds `const [sop, dispatch] = useReducer(sopReducer, null)` and `view: 'list' | 'steps'`; renders `<StepMode sop={sop} onExit={() => setView('list')} />` (Task 6) when `view === 'steps'`.

Behaviour to build (from spec):
- Empty state: heading, "Import Excel/JSON" button, text "or drop a file anywhere on the page". Whole window accepts file drop.
- Importing while an SOP is open: `window.confirm("Replace the current SOP? Unsaved changes will be lost.")`; cancel → nothing changes.
- Import error: red message showing `ImportError.message` (others: `"Something went wrong reading that file."`); current SOP unchanged.
- `ignoredColumns.length > 0`: dismissible notice `"These columns will not be included in downloads: Image, type"`.
- Header: editable title input, `Total: {formatDuration(totalSeconds(sop))}` (hidden when 0).
- Rows: drag handle (only the handle starts a drag; `PointerSensor` + `TouchSensor` + `KeyboardSensor`), number, title, duration text as typed, ✎ toggles inline editor with Title input, Description textarea, Duration input (shows "won't be timed" hint when non-empty and `parseDuration` is null), and Delete (with `confirm`).
- "+ Add step" opens the new step's editor. "▶ Start step-by-step" disabled when `steps.length === 0`.
- Download menu: "Excel (.xlsx)" and "JSON" → `downloadFile` with `${safeFileName(title)}.xlsx|.json`.

- [ ] **Step 1: Write the failing tests** (RTL + `userEvent.upload` on the hidden file input, label "Import Excel/JSON")
  - uploading a JSON file with 3 steps shows 3 rows titled in order, and `Total:` text
  - uploading a JSON with an `Image` column shows the ignored-columns notice naming `Image`
  - uploading `notes.csv` after a good import shows "Unsupported file type" and the 3 rows are still there
  - uploading malformed `x.json` shows "This JSON file couldn't be read."
  - second import with `confirm` mocked to `false` keeps the first SOP; with `true` replaces it
  - editing a row's title updates the row; deleting all rows disables "Start step-by-step"
  - clicking Download → JSON calls a mocked `downloadFile` with `'Bread.json'` and text equal to `toJsonText` of current state
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement components.** Drag-and-drop: `DndContext` + `SortableContext` (vertical list strategy), `useSortable` in `StepRow`, `onDragEnd` dispatches `moveStep`. Reorder is verified manually in Step 5 (jsdom can't simulate pointer drags).
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Manual check** — `npm run dev`; drag a row with mouse and with keyboard (Space, arrows, Space); numbers renumber; works at 375 px width.
- [ ] **Step 6: Commit** — `git commit -am "feat: main view with import, drag-and-drop editing and download"`

---

### Task 6: Step-by-step mode + timer

**Files:**
- Create: `src/lib/useCountdown.ts`, `src/components/StepMode.tsx`
- Test: `src/lib/useCountdown.test.ts`, `src/components/StepMode.test.tsx`

**Interfaces:**
- Consumes: `Sop` (Task 2), `parseDuration`, `formatClock` (Task 1)
- Produces:
  - `useCountdown(onEnd: () => void): { remaining: number; running: boolean; ended: boolean; start(seconds: number): void; pause(): void; resume(): void; reset(seconds: number): void; stop(): void }` — stores `endAt = Date.now() + remaining*1000`, ticks every 250 ms recomputing `remaining = ceil((endAt - Date.now())/1000)`; calls `onEnd` exactly once when it reaches 0
  - `StepMode({ sop, onExit, onTimerStart, onTimerEnd }: { sop: Sop; onExit(): void; onTimerStart?(): void; onTimerEnd?(step: Step, index: number): void })` — Task 7 passes the callbacks

Rules (spec): one timer at a time; on first entering step mode at step 1 the timer is shown but not started ("Start timer"); Next/Back stops the current timer and, if the new step's duration parses, starts it automatically; when the timer ends the view stays on that step; Exit (✕ "Back to list") stops the timer. Steps without a parseable duration show the duration text (if any) and no timer. Next is disabled on the last step, Back on the first. Large readable text.

- [ ] **Step 1: Write the failing tests** (`vi.useFakeTimers()`; fake timers also mock `Date.now`)
  - `useCountdown`: start(5) → after 5 s `ended` true, `onEnd` called once; pause at 2 s, advance 10 s, remaining still 3; **background throttling (Review Focus 1)**: start(1800), `vi.setSystemTime(Date.now() + 1800_000)` then advance only 250 ms → `ended` true
  - `StepMode` with steps `[{Mix,'10 s'}, {Rest,'30 s'}, {Note,''}]`:
    - shows "Step 1 of 3 — Mix", clock `0:10`, timer not running after 5 s
    - click Start timer, advance 3 s, click Next → shows "Step 2 of 3 — Rest", clock running from `0:30` (advance 1 s → `0:29`)
    - advance 30 s → `onTimerEnd` called with step Rest, index 1; still on step 2
    - Next to step 3 → no clock shown; Back to step 2 → its timer restarts from `0:30`
    - Back to list calls `onExit`; no `onTimerEnd` fires afterwards
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: step-by-step mode with timer"`

---

### Task 7: Timer-end notifications

**Files:**
- Create: `src/lib/notify.ts`, `src/components/DoneAlert.tsx`; modify `src/components/App.tsx`
- Test: `src/lib/notify.test.ts`, `src/components/DoneAlert.test.tsx`

**Interfaces:**
- Consumes: `StepMode` callbacks `onTimerStart`, `onTimerEnd` (Task 6)
- Produces:
  - `requestPermissionOnce(): void` — calls `Notification.requestPermission()` only if `'Notification' in window` and permission is `'default'`, and only the first time per page load
  - `showSystemNotification(message: string): void` — `new Notification('Timer done', { body: message })` only when permission is `'granted'`; never throws
  - `startAlarm(): () => void` — WebAudio beep (~0.3 s, 880 Hz) every 1.5 s; returns stop function; no-op if `AudioContext` missing
  - `startTitleFlash(original: string): () => void` — toggles `document.title` between `"⏰ Done"` and original every 1 s; stop restores original
  - `DoneAlert({ message, onDismiss })` — `role="alert"`, text = message, "Dismiss" button

Message copy (spec): `` `Step ${index + 1} — ${step.title} is done` ``.

Wiring in App: `onTimerStart` → `requestPermissionOnce()`. `onTimerEnd` → set `alertMessage`, `showSystemNotification`, `stopAlarm = startAlarm()`, `stopFlash = startTitleFlash(document.title)`. Dismiss (or a new timer end, or leaving step mode) → stop both and clear the alert.

- [ ] **Step 1: Write the failing tests**
  - `requestPermissionOnce`: with mocked `Notification.permission = 'default'`, two calls → `requestPermission` called once; with `'denied'` → not called; with `Notification` undefined → no throw
  - `showSystemNotification`: constructor called with body when granted; not called when denied
  - `startTitleFlash`: after 1 s title is `"⏰ Done"`; stop restores original
  - `DoneAlert`: renders message with `role="alert"`; Dismiss calls `onDismiss`
  - App integration: import JSON with one `'2 s'` step, start step mode, Start timer, advance 2 s → alert "Step 1 — Mix is done" visible; Dismiss → gone, title restored
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Manual check** — in `npm run dev`, start a 5 s timer, switch to another tab: system notification appears and the sound plays; deny permission in a fresh profile → on-page alert and sound still work.
- [ ] **Step 6: Commit** — `git commit -am "feat: notify when a timer ends"`

---

### Task 8: Static build check + README

**Files:**
- Create: `README.md`, `src/test/fixtures/sample-sop.xlsx`, `src/test/fixtures/sample-sop.json`

- [ ] **Step 1:** Generate the two sample files (a 5-step sourdough SOP covering `45 sec`, `10 min`, `1h 30m`, one blank duration) with a small node script using `toXlsxBytes` / `toJsonText`, so users have a template.
- [ ] **Step 2:** `npm test` → all pass. `npm run build` → `dist/` contains only `index.html`.
- [ ] **Step 3:** Open `dist/index.html` directly from disk (`open dist/index.html`); import `sample-sop.xlsx`; reorder, edit, run step mode, download both formats; re-import the downloaded xlsx and confirm it matches.
- [ ] **Step 4:** README: what it does, the column format (`Step | Title | Description | Duration`) and duration examples, `npm install`, `npm run dev`, `npm test`, `npm run build`, and "host `dist/index.html` anywhere or open it directly".
- [ ] **Step 5: Commit** — `git add -A && git commit -m "docs: README, sample files, build check"`
