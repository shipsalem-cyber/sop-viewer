# Recipe Library (multiple files, remembered on this device) — Design

Date: 2026-11-22
Status: Approved 2026-11-22
Builds on: `2026-11-15-sop-viewer-design.md`, `2026-11-20-ingredients-design.md`

## Intent

A café, restaurant or other merchant imports all of its recipes/SOPs **once**
(e.g. at the start of the day) and staff use that same screen all day, picking
whichever recipe they need. Today the app holds one recipe and forgets it on
reload, so it can't serve that.

Success: import 20 files in one go, refresh the page or restart the tablet, and
all 20 are still there; any recipe is two taps away.

## Goals / non-goals / anti-goals

- Goal: import **several files at once** (picker and drag-and-drop); each file
  is one recipe, as today.
- Goal: new imports are **added** to the recipes already loaded.
- Goal: recipes and edits are **remembered on this device** (user decision)
  until someone removes them or presses **Clear all**.
- Goal: a recipe list with search; open one to view, edit, download or cook.
- Goal: the first page offers **example files to download** (user request).
- Goal: **one recipe cooks at a time** (user decision). While step-by-step is
  running the recipe list is locked; Exit (which stops the timer, as today)
  unlocks it.
- Non-goal: timers running in several recipes at once; syncing between
  devices; accounts; uploading anything; "Download all"; per-recipe links/URLs
  (option 3 below — can be added later).
- Anti-goal: an accidental refresh losing the day's recipes. Anti-goal: one bad
  file blocking the rest of an import.

## Approaches

1. **Browser local storage + a library layer around today's code — chosen by
   the user.** State becomes a list of recipes plus which one is open; each
   recipe is still changed by today's `sopReducer`. Every change is written to
   `localStorage`; it's read back on load. ~5 MB limit ≈ hundreds of text
   recipes. Smallest change, reuses existing tests.
2. IndexedDB. Much more space, but async loading and more code; nothing (e.g.
   images) needs the space. Rejected.
3. Approach 1 plus a URL hash per recipe (Back button, bookmarks). More to keep
   in sync; deferred, can be layered on 1.

## Data and storage

- Library = `{ recipes: Recipe[], openId: string | null }`, where a recipe is
  today's `Sop` plus an `id`. The open recipe is edited through the existing
  `sopReducer` actions unchanged.
- Saved as JSON under one `localStorage` key with a format version, after every
  change. On load: read and validate; a missing key → empty library.
- **Unreadable saved data** (corrupt/old format) → start empty and show
  "Saved recipes couldn't be read and were cleared." *(my call)*
- **Saving fails** (private window, storage full, blocked) → app keeps working
  in memory and shows once: "Recipes won't be remembered on this device."
  *(my call)*
- The open recipe is remembered; after a reload the app opens it in the list
  view. Step-by-step position and timers are **not** restored *(my call — a
  running timer after a restart would be misleading)*.
- Two tabs open at once: last change wins; not handled further *(my call)*.

## Import

- File picker accepts multiple files; drop accepts all dropped files.
- Files are read one by one; each success is added to the library.
- **Same recipe name already loaded** (title compared ignoring case and
  surrounding spaces) → confirm `Replace "Sourdough"? OK replaces it, Cancel
  keeps the current one.` Cancel skips that file *(my call)*.
- **A file fails** → the others still import; one error banner lists each
  failure, e.g. `Couldn't import: notes.csv — Unsupported file type. …`
  (several joined with ` · `).
- Per-file notices (ignored columns, unknown Type values) are combined into one
  notice, each prefixed with the file name.
- After an import, the **first newly added recipe opens** *(my call)*.
- The old "Replace the current SOP?" confirm goes away — imports add, they no
  longer replace.
- Import is unavailable while step-by-step is running *(my call — it would
  otherwise change the screen mid-cook)*.

## Screen

```
┌ Recipes (12) ─────────┐  Pour-over Coffee          Total: 3m 35s
│ 🔍 search…            │  Ingredients: Coffee — 18 g · Water — 300 ml
│ ▸ Pour-over Coffee    │   ☰ 🧂 Coffee        18 g, medium-fine   ✎
│   Sourdough           │   ☰  1 Rinse filter            20 sec    ✎
│   Clean Espresso…     │   ...
│                       │  [+ Add step] [+ Add ingredient]  [▶ Start]
│ [+ Import] [Clear all]│  [Download ▾]  [Remove recipe]
└───────────────────────┘
```

- **Recipe list** (left on wide screens): count, search box (filters by title,
  case-insensitive), recipes sorted A–Z by title *(my call)*, the open one
  highlighted. Editing a title updates the list.
- **Phone width**: the list becomes a "Recipes ▾" picker at the top, with the
  same search and buttons *(my call)*.
- The open recipe's area is today's list view unchanged: title, total,
  ingredients box, mixed list, add buttons, Start, Download.
- **Remove recipe** → confirm `Remove "Sourdough" from this device?` Then
  opens the next recipe in the list, or the empty state if none.
- **Clear all** → confirm `Remove all 12 recipes from this device? This can't
  be undone.`
- **Empty state**: "Import one or more Excel or JSON files", drop hint, column
  hint as today, plus **example files to download** (user request):

  ```
  Not sure how to set up a file? Download an example:
    Pour-over Coffee (with ingredients)   [Excel] [JSON]
    Sourdough                             [Excel] [JSON]
    Clean Espresso Machine (SOP)          [Excel] [JSON]
  ```

  - The examples are the three in `samples/`, built into the app from
    `samples/*.json` and downloaded through the app's own export (so they match
    the download format exactly and work offline and from `file://`)
    *(my call)*.
  - Shown on the first (empty) page only *(my call)*; downloading doesn't
    import anything — the user opens the file to see the layout, or imports
    it to try the app.
- **Step-by-step**: full screen as today; recipe list, Import, Remove and
  Clear all are hidden. Exit stops the timer and alarm and returns to that
  recipe.

## Unchanged

File format, import leniency rules, download format (per recipe), ingredients,
timers, auto-start, notifications, one timer at a time.

## Left to the builder

Component and file names, exact styling, how the phone picker opens, the
storage key name, and how library state is wired (a library reducer that
delegates to `sopReducer` is the intended shape).
