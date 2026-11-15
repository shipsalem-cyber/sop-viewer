# SOP & Recipe Viewer — Design

Date: 2026-11-15
Status: Approved 2026-11-15

## Intent

A static web app for viewing cooking recipes and SOPs (standard operating
procedures) as clear, step-by-step processes. The user imports an existing
SOP file (Excel or JSON), sees it laid out as steps, rearranges and edits it
in the browser (drag and drop), walks through it one step at a time, and
downloads the result if they want to keep changes.

The point is *easier viewing and adjusting of a process on a web page* — not
a content management system.

## Goals

- Import an SOP from **Excel (.xlsx)** or **JSON**.
- Show it as an ordered list of steps.
- Edit in the browser: **drag-and-drop reorder**, edit step fields, add and
  delete steps.
- **Step-by-step mode**: one step at a time, Back / Next, with a timer when
  the step has a duration.
- **Download** the current SOP as Excel or JSON — either format, regardless
  of which was imported *(my call)*.

## Non-goals

- No saving / persistence. Refreshing the page loses everything not
  downloaded. (User decision.)
- No server, database, accounts, or sharing between users.
- No library of multiple SOPs; one file open at a time.
- No separate ingredients list for recipes (not in the columns; can be added
  later).

## Anti-goals

- Requiring a backend or paid hosting to run it.
- An importer that rejects or silently mangles the user's real files.
- Editing that's fiddly — drag and drop must feel direct.

## Constraints

- Static output only: `vite build` produces plain files hostable anywhere
  (GitHub Pages, Netlify) or openable locally.
- Built with Node.js tooling.

## Data format

Columns (Excel header row, or JSON keys):

| Field         | Meaning |
|---------------|---------|
| `Step`        | Step number. Used for initial order on import; renumbered 1..n after any reorder/add/delete. |
| `Title`       | Short step heading. |
| `Description` | Full instructions; line breaks preserved. |
| `Duration`    | Free text. Optional. Supports seconds, minutes, hours (see below). |

The earlier `type` and `Image` columns were removed by the user. An `Image`
column in an imported file is treated like any other extra column (ignored,
with a notice).

JSON shape: an array of step objects with the keys above, e.g.

```json
[
  { "Step": 1, "Title": "Mix flour & water", "Description": "…", "Duration": "10 min" }
]
```

### Import leniency *(my call — no sample files were provided)*

- Excel: read the **first sheet**. The header row is the first row that
  contains a `Title` column (so a title row above the header is tolerated).
- Column names match **case-insensitively, ignoring surrounding spaces and any
  trailing bracketed unit** (`step`, ` Title `, `Duration (min)` all match).
- Only `Title` is required. Missing `Step` → file order is used. Missing
  `Description` / `Duration` → empty.
- Extra columns are ignored, and the import shows a notice naming them
  ("these columns will not be included in downloads").
- Blank rows are skipped. Merged cells: the value is read from the top-left
  cell only.
- JSON: accept either a bare array of steps, or an object with a `steps`
  array (and an optional `title`).
- If no usable header or no steps are found, show a clear error and keep the
  current SOP unchanged.

### Download shape *(my call)*

Downloads are regenerated cleanly from the steps: one sheet, four columns in
the order `Step | Title | Description | Duration`, no original
formatting. JSON downloads are a bare array. Extra columns from the import
are not kept (the user is told at import time).

### Duration parsing

Accept free text; parse into seconds when possible. Recognise combinations of
hours, minutes and seconds, e.g. `45 sec`, `30s`, `5 min`, `5m`, `1h 30m`,
`1 hr 15 min 20 sec`, `01:30` (mm:ss), `1:02:30` (h:mm:ss). A plain number
is treated as minutes *(my call)*. If it can't be parsed, display the text as-is
with no timer and exclude it from the total.

Excel cells *(my call)*: if a Duration cell is stored as an Excel **time
value** (e.g. typed `01:30` and Excel converted it), use its stored value —
Excel means 1 h 30 m. If the cell is **text**, parse the text with the rules
above (so text `01:30` = 1 min 30 s). Downloads write Duration as text, so a
round trip is stable.

Show the SOP's total time in the header (sum of parsed durations).

## Screens

**Main view**

```
┌──────────────────────────────────────────────┐
│  [ Import Excel/JSON ]   [ Download ▾ ]       │
├──────────────────────────────────────────────┤
│  Make Sourdough          Total: 1h 45m        │
│  ☰ 1  Mix flour & water           10 min  ✎   │
│  ☰ 2  Rest (autolyse)             30 min  ✎   │
│  ☰ 3  Add starter                 45 sec  ✎   │
│  [ + Add step ]        [ ▶ Start step-by-step ]│
└──────────────────────────────────────────────┘
```

**Step-by-step mode**

```
┌──────────────────────────────────────────────┐
│  Step 2 of 3 — Rest (autolyse)                │
│  Cover and leave at room temp…                │
│  ⏱ 30:00  [Start timer]                       │
│  [ ◀ Back ]                      [ Next ▶ ]   │
└──────────────────────────────────────────────┘
```

## Behaviour

- Before anything is imported, show an empty state with the import button
  (and drag-a-file-onto-page support *(my call)*).
- Importing a new file while one is open replaces it, after a confirm warning.
- SOP title: taken from the file name (without extension) *(my call)*,
  editable in the header.
- Download menu offers Excel and JSON; file name is the SOP title.
- Timer: start / pause / reset.
- **Only one timer at a time, tied to the step on screen** (user decision).
  Moving to another step (Next or Back) stops the current timer, and the new
  step's timer **starts automatically** if that step has a parseable duration.
  The first step's timer starts with the user's "Start timer" press
  *(my call — so it doesn't start before they're ready)*.
- When a timer ends, the app stays on that step; the user presses Next when
  ready *(my call — no automatic advance)*.
- Leaving step-by-step mode stops any running timer. Editing steps happens
  in the main view, so a running timer is never on a step being edited.
- **When a timer ends, notify the user** (user decision):
  - an on-page alert naming the step ("Step 2 — Rest (autolyse) is done"),
    which stays until dismissed;
  - a short repeating sound until dismissed *(my call)*;
  - a **browser notification** (Notification API) so it's seen even when the
    tab is in the background. Permission is requested the first time a timer
    is started, not on page load *(my call)*. If permission is denied, the
    on-page alert and sound still work.
  - the tab title flashes "⏰ Done" while the alert is open *(my call)*.
- Desktop-first layout that also works on a phone (drag works with touch).

## Approaches considered

1. **Browser-only static app — chosen.** Vite + React, SheetJS for Excel
   read/write, dnd-kit for drag and drop. No server. Fits "import, view, edit,
   download, no saving" exactly; free hosting.
2. **Static site generator + Git-backed CMS (Astro + Decap).** Shared,
   versioned edits. Rejected: user doesn't need saving or sharing, and Astro's
   strength (pre-built content pages) is wasted when content arrives at runtime.
3. **Small Node server (Express/Fastify + SQLite).** Real shared editing.
   Rejected: not static, needs hosting, solves a problem the user doesn't have.

Framework comparison (React vs Vue vs Svelte vs plain JS vs Astro vs Next.js)
was discussed; React chosen mainly for the strongest drag-and-drop and UI
ecosystem. Vue would have been an equal fit; plain JS gets messy with
synchronised list/editor/step views; Next.js is server-oriented overkill.

## Decided by the user

- Static site, Node.js tooling, Vite + React.
- Import Excel or JSON; edit via drag and drop; download; no saving.
- Columns: Step, Title, Description, Duration (`type` and `Image` removed).
- Duration must support seconds as well as minutes/hours.
- Notify when a timer ends.
- One timer at a time: moving to another step stops the current timer and
  starts the next step's timer.

## Left to the builder

- Styling and visual design (clean, readable, kitchen-friendly large text in
  step mode).
- Component structure, state management (plain React state is fine).
- Exact error messages for bad files (missing header row, wrong columns).
- Whether to use TypeScript (recommended).
- Test setup (Vitest for parsing/serialising logic at minimum).
