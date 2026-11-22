# Recipe Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import several recipe files at once into a library that is remembered on this device, pick any recipe from a searchable list, and offer example files on the first page.

**Architecture:** A pure `libraryReducer` holds `{ recipes, openId }` and delegates edits of the open recipe to the existing `sopReducer`. A small storage module reads/writes the library as versioned JSON in `localStorage`, reporting (never throwing) when that fails. `App` wires the reducer, saves after every change, and renders a new `RecipeList` beside today's list view; step-by-step mode stays full-screen and hides the library controls.

**Tech Stack:** Vite 8 + vite-plugin-singlefile, React 18, TypeScript, SheetJS, @dnd-kit, Vitest 5 + jsdom + Testing Library. Node is at `$HOME/.nvm/versions/node/v26.13.1/bin` — prepend it to PATH in every shell command.

**Spec:** `docs/superpowers/specs/2026-11-22-recipe-library-design.md`

## Global Constraints

- One recipe per file; file format, import leniency, download format and timers unchanged.
- Nothing leaves the device; storage is `localStorage` only.
- One recipe cooks at a time: in step-by-step mode the recipe list, Import, Remove recipe and Clear all are not rendered.
- Copy, verbatim:
  - Replace confirm: `Replace "<title>"? OK replaces it, Cancel keeps the current one.`
  - Import failures: `Couldn't import: <file name> — <error message>` — several joined with ` · ` after one `Couldn't import: ` prefix.
  - Per-file notices: `<file name>: <notice>`, several joined with ` · `.
  - Remove confirm: `Remove "<title>" from this device?`
  - Clear all confirm: `Remove all <N> recipes from this device? This can't be undone.` (`1 recipe` when N = 1)
  - Save failure (shown once per page load): `Recipes won't be remembered on this device.`
  - Corrupt saved data: `Saved recipes couldn't be read and were cleared.`
  - Empty state heading text: `Import one or more Excel or JSON files`; examples line: `Not sure how to set up a file? Download an example:`
- Recipe list sorted A–Z by title (`localeCompare`, sensitivity `base`); search filters by title, case-insensitive substring.
- Step-by-step position and timers are not restored after reload; the open recipe is.

## Review Focus

1. Saved data that parses as JSON but has the wrong shape (step missing `kind`, `recipes` not an array, unknown version) → treated as corrupt: empty library plus the corrupt notice, never a crash or a half-loaded library.
2. `localStorage` that throws on access or on `setItem` (private window, quota) → the app keeps working in memory and shows the save-failure notice exactly once, not on every keystroke.
3. Two files with the same recipe title in one drop → the second triggers the replace confirm against the first (duplicates are checked against the library as it grows during the batch).
4. Removing the open recipe while a search filter hides the others → the next recipe is chosen from the full A–Z list, not the filtered one.
5. Edits survive switching recipes and a full reload (remount), including step ids, so drag-and-drop keeps working on restored recipes.

---

### Task 1: Library model

**Files:**
- Create: `src/lib/library.ts`
- Test: `src/lib/library.test.ts`

**Interfaces:**
- Consumes: `sopReducer`, `SopAction` from `src/lib/sopReducer.ts`; `Sop` from `src/lib/types.ts`.
- Produces:
  - `type Recipe = Sop & { id: string }`
  - `type Library = { recipes: Recipe[]; openId: string | null }`
  - `const emptyLibrary: Library`
  - `type LibraryAction =`
    `{ type: 'add'; recipe: Recipe }` (appends, opens it) ·
    `{ type: 'replace'; id: string; sop: Sop }` (keeps `id` and position, opens it) ·
    `{ type: 'open'; id: string }` ·
    `{ type: 'remove'; id: string }` ·
    `{ type: 'clear' }` ·
    `{ type: 'edit'; action: SopAction }` (applies to the open recipe only; `load` is ignored)
  - `libraryReducer(state: Library, action: LibraryAction): Library`
  - `openRecipe(lib: Library): Recipe | null`
  - `sortedRecipes(recipes: Recipe[], query?: string): Recipe[]` — A–Z, filtered by query
  - `findByTitle(recipes: Recipe[], title: string): Recipe | undefined` — compares trimmed, case-insensitive
  - `newRecipe(sop: Sop): Recipe` — adds `crypto.randomUUID()` id

- [ ] **Step 1: Write the failing tests** in `src/lib/library.test.ts`:
  - `add appends and opens the new recipe` — after two adds, `recipes.map(r => r.title)` is `['Bread','Coffee']` and `openId` is Coffee's id.
  - `replace keeps id and position` — replacing Bread (first of two) with a Sop titled `Bread` having one step `Knead`: `recipes[0].id` unchanged, `recipes[0].steps[0].title === 'Knead'`, `openId` is Bread's id.
  - `edit changes only the open recipe` — open Bread, `edit` `{type:'setTitle', title:'Rye'}` → Bread becomes Rye, Coffee unchanged; with `openId: null` edit returns the same state object.
  - `remove the open recipe opens the next one A–Z` — recipes Coffee, Bread, Apple (titles); open Bread; remove Bread → `openId` is Coffee's id. Remove Coffee (last A–Z) → opens Apple (previous). Remove the only recipe → `openId: null`. (Review Focus 4: the reducer uses the full list; no query is involved.)
  - `remove a recipe that is not open keeps openId`.
  - `clear empties the library` → `toEqual(emptyLibrary)`.
  - `sortedRecipes sorts A–Z ignoring case and filters by query` — `['banana','Apple','cherry']` → `['Apple','banana','cherry']`; query `AN` → `['banana']`.
  - `findByTitle ignores case and surrounding spaces` — `findByTitle(recipes, '  bread ')` finds `Bread`.

- [ ] **Step 2: Run to see them fail**
  Run: `npx vitest run src/lib/library.test.ts`
  Expected: FAIL — cannot resolve `./library`.

- [ ] **Step 3: Implement `src/lib/library.ts`** with the interfaces above. `remove`: compute the A–Z order of the full list before removal; if the removed recipe was open, open the one after it in that order, else the one before, else `null`.

- [ ] **Step 4: Run to see them pass**
  Run: `npx vitest run src/lib/library.test.ts`
  Expected: PASS (8 tests).

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/library.ts src/lib/library.test.ts
  git commit -m "feat: recipe library reducer"
  ```

### Task 2: Remember the library on this device

**Files:**
- Create: `src/lib/libraryStorage.ts`
- Test: `src/lib/libraryStorage.test.ts`
- Modify: `src/test/setup.ts` (add `afterEach(() => localStorage.clear())`)

**Interfaces:**
- Consumes: `Library`, `emptyLibrary` from Task 1.
- Produces:
  - `const STORAGE_KEY = 'sop-viewer.library'`
  - `type LoadResult = { library: Library; problem: 'corrupt' | 'unavailable' | null }`
  - `loadLibrary(getStorage?: () => Storage): LoadResult` — default `() => window.localStorage`
  - `saveLibrary(library: Library, getStorage?: () => Storage): boolean` — `false` when storage access or `setItem` throws
  - Stored shape: `{ "version": 1, "recipes": [...], "openId": ... }`

- [ ] **Step 1: Write the failing tests:**
  - `round-trips a library` — save then load returns `toEqual` the same library (recipe ids and step ids preserved — Review Focus 5) and `problem: null`.
  - `missing key loads empty` → `{ library: emptyLibrary, problem: null }`.
  - `wrong shape is corrupt` — each of: `'not json'`, `'{"version":1,"recipes":{}}'`, a step without `kind`, a step with `kind: 'sauce'`, `version: 2` → `library` equals `emptyLibrary`, `problem: 'corrupt'`, and the key is removed (Review Focus 1).
  - `openId that matches no recipe falls back to the first recipe` (or `null` when there are none), `problem: null`.
  - `getter that throws` → load gives `problem: 'unavailable'` with an empty library; save returns `false` (Review Focus 2).
  - `setItem that throws` (fake storage whose `setItem` throws `QuotaExceededError`) → save returns `false`.

- [ ] **Step 2: Run to see them fail**
  Run: `npx vitest run src/lib/libraryStorage.test.ts`
  Expected: FAIL — cannot resolve `./libraryStorage`.

- [ ] **Step 3: Implement** `loadLibrary`/`saveLibrary`. Validate every recipe (`id`, `title` strings, `steps` array) and every step (`id`, `title`, `description`, `duration` strings, `kind` in `step|ingredient`); any failure → corrupt.

- [ ] **Step 4: Run to see them pass**
  Run: `npx vitest run src/lib/libraryStorage.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/libraryStorage.ts src/lib/libraryStorage.test.ts src/test/setup.ts
  git commit -m "feat: save the recipe library in local storage"
  ```

### Task 3: Read several files at once

**Files:**
- Create: `src/lib/importMany.ts`
- Test: `src/lib/importMany.test.ts`
- Modify: `src/components/ImportControls.tsx` (prop `onFiles(files: File[])`, `multiple` on the input, drop passes all files, overlay text `Drop your Excel or JSON files`)

**Interfaces:**
- Consumes: `importFile` from `src/lib/importSop.ts`; `ImportError`, `ImportResult` from `src/lib/types.ts`.
- Produces:
  - `type ImportedFile = { fileName: string; result: ImportResult }`
  - `type FailedFile = { fileName: string; message: string }`
  - `importMany(files: File[]): Promise<{ imported: ImportedFile[]; failed: FailedFile[] }>` — reads in the given order; a non-`ImportError` becomes `Something went wrong reading that file.`
  - `failureText(failed: FailedFile[]): string | null` — the Global Constraints copy, `null` when empty
  - `noticeText(imported: ImportedFile[]): string | null` — per file, today's ignored-columns / unknown-Type sentences joined with `. `, prefixed `<file name>: `; files joined with ` · `; `null` when nothing to say
  - `ImportControls` props: `{ onFiles(files: File[]): void; disabled?: boolean }` — when `disabled`, the button is not rendered and drops are ignored

- [ ] **Step 1: Write the failing tests:**
  - `imports good files and collects failures in order` — `[Bread.json (valid), notes.csv, Coffee.json (valid)]` → imported titles `['Bread','Coffee']`, failed `[{fileName:'notes.csv', message: <MSG_UNSUPPORTED text>}]`.
  - `failureText` — two failures → `Couldn't import: a.csv — Unsupported file type. Please choose an Excel (.xlsx) or JSON file. · b.json — This JSON file couldn't be read.`; empty → `null`.
  - `noticeText` — one file with an `Image` column → `Bread.json: These columns will not be included in downloads: Image`; none → `null`.

- [ ] **Step 2: Run to see them fail**
  Run: `npx vitest run src/lib/importMany.test.ts`
  Expected: FAIL — cannot resolve `./importMany`.

- [ ] **Step 3: Implement `importMany.ts` and update `ImportControls`** (App keeps compiling in Task 4 — until then, adapt App's call site to `onFiles={(fs) => fs[0] && handleFile(fs[0])}` so the suite stays green).

- [ ] **Step 4: Run all tests**
  Run: `npx vitest run`
  Expected: PASS, including the existing App tests.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/importMany.ts src/lib/importMany.test.ts src/components/ImportControls.tsx src/components/App.tsx
  git commit -m "feat: import several files at once"
  ```

### Task 4: Library screen

**Files:**
- Create: `src/components/RecipeList.tsx`
- Modify: `src/components/App.tsx`, `src/styles.css`
- Test: `src/components/App.test.tsx` (rewrite the replace-confirm test; add the tests below), `src/components/App.notify.test.tsx` (only if its setup breaks)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `RecipeList` props: `{ recipes: Recipe[]; openId: string | null; onOpen(id: string): void; onRemove(): void; onClearAll(): void }`
  - Rendered as `<nav aria-label="Recipes">` containing heading `Recipes (N)`, a search input labelled `Search recipes`, a list of buttons (one per recipe, `aria-current="true"` on the open one), and buttons `Remove recipe` and `Clear all`.
  - At `max-width: 700px` the list is collapsed behind a toggle button `Recipes (N) ▾` (`aria-expanded`); choosing a recipe collapses it again.

App behaviour (spec "Import", "Screen"):
- `useReducer(libraryReducer, undefined, () => loaded.library)` where `loaded = loadLibrary()` runs once; show the corrupt notice when `problem === 'corrupt'`.
- After every library change, `saveLibrary`; on the first `false` (or `problem === 'unavailable'`) show the save-failure notice, then never again this page load.
- Import: `importMany`, then for each imported file in order: if `findByTitle` (against the library including recipes added earlier in this batch — Review Focus 3) finds a match, `window.confirm(<replace copy>)` → `replace` or skip; otherwise `add(newRecipe(sop))`. Afterwards open the first recipe added or replaced in this batch, set error to `failureText`, notice to `noticeText`, `clearDone()`, view `list`, editing `null`.
- The old `Replace the current SOP?` confirm is deleted.
- The list view's `sop` is `openRecipe(library)`; all existing list-view dispatches become `{ type: 'edit', action }`.
- `Remove recipe` / `Clear all` confirm with the Global Constraints copy.
- In `view === 'steps'`: `ImportControls disabled`, no `RecipeList`, no `DownloadMenu`.
- Switching recipe closes any open step editor.

- [ ] **Step 1: Write the failing tests** in `App.test.tsx` (`upload` accepts several files):
  - `importing two files lists both A–Z and opens the first imported` — upload `Coffee.json`, `Bread.json` → nav buttons `['Bread','Coffee']`, title input shows `Coffee`.
  - `a later import adds instead of replacing` — import Bread, then Coffee → both listed, no confirm called.
  - `same title asks to replace; Cancel keeps the current one` — import Bread (steps Mix), then a different `Bread.json` (steps Knead) with confirm → `false` keeps Mix; `true` replaces with Knead; only one Bread listed. Message equals `Replace "Bread"? OK replaces it, Cancel keeps the current one.`
  - `same title twice in one drop asks once` — upload two files both titled Bread in one call → confirm called once (Review Focus 3).
  - `one bad file does not block the others` — `[Bread.json, notes.csv]` → Bread listed and alert text starts with `Couldn't import: notes.csv — `.
  - `edits survive switching and reload` — import Bread and Coffee, edit Bread's step 1 title to `Proof`, open Coffee, open Bread → `Proof`; `unmount()` and render `<App />` again → Bread open and step title `Proof` (Review Focus 5).
  - `search filters the list` — type `co` → only Coffee listed.
  - `remove recipe confirms and opens the next` — message `Remove "Bread" from this device?`; afterwards Coffee is open.
  - `clear all confirms and returns to the empty state` — message `Remove all 2 recipes from this device? This can't be undone.`; empty-state text visible; `localStorage.getItem('sop-viewer.library')` has no recipes.
  - `step-by-step hides the library controls` — start step-by-step → no `nav` named Recipes, no `Import Excel/JSON` label; `✕ Back to list` brings them back.
  - `save failure shows once` — `vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })`; import, then edit a title twice → exactly one element with `Recipes won't be remembered on this device.` (Review Focus 2).
  - `corrupt saved data shows notice` — `localStorage.setItem('sop-viewer.library','{oops')` before render → notice `Saved recipes couldn't be read and were cleared.` and empty state.

- [ ] **Step 2: Run to see them fail**
  Run: `npx vitest run src/components/App.test.tsx`
  Expected: FAIL — no `Recipes` navigation; replace behaviour differs.

- [ ] **Step 3: Implement `RecipeList`, the App changes and styles** (two-column layout above 700px: list ~240px, content fills the rest; collapsed toggle below).

- [ ] **Step 4: Run all tests and the type check**
  Run: `npx vitest run && npx tsc -p .`
  Expected: all PASS, no type errors.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/RecipeList.tsx src/components/App.tsx src/components/App.test.tsx src/styles.css
  git commit -m "feat: recipe library screen with search, remove and clear all"
  ```

### Task 5: Example files on the first page, docs

**Files:**
- Create: `src/lib/examples.ts`, `src/components/ExampleDownloads.tsx`
- Test: `src/lib/examples.test.ts`, add one test to `src/components/App.test.tsx`
- Modify: `src/components/App.tsx` (empty state copy + examples), `README.md`

**Interfaces:**
- Consumes: `parseJsonText` from `importSop.ts`; `toJsonText`, `toXlsxBytes`, `downloadFile`, `safeFileName` from `exportSop.ts`.
- Produces:
  - `type Example = { label: string; sop: Sop }`
  - `const EXAMPLES: Example[]` — in this order, labels `Pour-over Coffee (with ingredients)`, `Sourdough`, `Clean Espresso Machine (SOP)`; each `sop` from `parseJsonText(<samples/*.json?raw>, '<name>.json').sop`
  - `ExampleDownloads` renders the line `Not sure how to set up a file? Download an example:` and, per example, its label plus buttons named `Download <title> as Excel` / `Download <title> as JSON` (visible text `Excel` / `JSON`).
  - Move the xlsx MIME constant from `DownloadMenu.tsx` to `exportSop.ts` as `export const XLSX_MIME` and use it in both.

- [ ] **Step 1: Write the failing tests:**
  - `examples.test.ts`: `EXAMPLES.map(e => e.sop.title)` is `['Pour-over Coffee','Sourdough','Clean Espresso Machine']`; Pour-over has 4 ingredient rows; `toJsonText(EXAMPLES[1].sop)` parses to the same rows as `samples/Sourdough.json` (read with `readFileSync`).
  - `App.test.tsx` `empty state offers example downloads` — text `Import one or more Excel or JSON files` and the examples line are shown; clicking `Download Pour-over Coffee as Excel` calls `downloadFile` with name `Pour-over Coffee.xlsx` and `XLSX_MIME`; clicking `Download Sourdough as JSON` calls it with `Sourdough.json`; no recipe is added (empty state still shown).

- [ ] **Step 2: Run to see them fail**
  Run: `npx vitest run src/lib/examples.test.ts src/components/App.test.tsx`
  Expected: FAIL — cannot resolve `./examples`; example buttons missing.

- [ ] **Step 3: Implement** examples (`?raw` imports; `vite/client` types are already referenced), `ExampleDownloads`, the empty-state copy (`Import one or more Excel or JSON files`, `or drop files anywhere on the page`, the column hint unchanged), and README sections: importing several files, the recipe list, remembered on this device + Clear all, example downloads.

- [ ] **Step 4: Run everything**
  Run: `npx vitest run && npx tsc -p . && npm run build`
  Expected: all PASS, no type errors, build writes `dist/index.html`.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/examples.ts src/lib/examples.test.ts src/components/ExampleDownloads.tsx src/components/App.tsx src/components/App.test.tsx src/components/DownloadMenu.tsx src/lib/exportSop.ts README.md
  git commit -m "feat: example files on the first page; document the recipe library"
  ```
