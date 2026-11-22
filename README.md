# SOP & Recipe Viewer

A static web page for viewing SOPs and recipes step by step. Import Excel or
JSON files, drag steps into a new order, edit them, walk through them one at a
time with a timer, and download the result. Made to be set up once and used all
day, e.g. on a café or restaurant tablet.

## Recipe library

- **Import several files at once** (choose them together, or drop them on the
  page). Each file is one recipe. New imports are added to the recipes already
  loaded; a file with the same recipe name asks before replacing it. A file
  that can't be read doesn't stop the others — you're told which one failed.
- **Recipe list**: sorted A–Z with a search box. On a phone it's the
  **Recipes ▾** button at the top.
- **Remembered on this device**: recipes and your edits are kept in this
  browser, so a refresh or restart brings them back. Nothing is uploaded.
  **Remove recipe** takes one out; **Clear all** empties the device. Download a
  recipe to get your edits back into a file. (In a private window the browser
  may not keep them — you'll see a notice.)
- **One recipe cooks at a time**: while step-by-step is running the recipe list
  and Import are hidden; **✕ Back to list** stops the timer and brings them back.
- **Examples**: the first page offers the three sample files below as Excel or
  JSON downloads.

## File format

One file holds one recipe or SOP. One row (Excel) or object (JSON) per
ingredient or step:

| Type | Step | Title | Description | Duration |
|------|------|-------|-------------|----------|
| Ingredient | | Coffee | 18 g, medium-fine | |
| Ingredient | | Water | 300 ml, 94 °C | |
| Step | 1 | Rinse filter | Rinse with hot water… | 20 sec |
| Step | 2 | Bloom | Pour 40 ml… | 45 sec |

- **Type** is `Ingredient` or `Step`. Blank (or no Type column at all) means Step,
  so older files keep working.
- For an ingredient, **Title** is the name and **Description** is the amount.
  Ingredients are never timed and don't count towards the total time.
- Ingredients can go anywhere in the list, e.g. right before the step that uses them.
  Files with ingredients keep their row order; files with only steps are sorted by Step.
- Only **Title** is required. Column names are matched ignoring case and any
  trailing unit, e.g. `Duration (min)`. Other columns are ignored (you'll be told).
- Excel: the first sheet is used; rows above the header row are skipped.
- JSON: a list of rows, or `{ "title": "…", "steps": [ … ] }`.
- **Duration** examples: `45 sec`, `30s`, `5 min`, `1h 30m`, `1 hr 15 min 20 sec`,
  `01:30` (1 min 30 s), `1:02:30`. A plain number is minutes. Anything else
  (e.g. `5-10 min`) is shown as text without a timer.

Templates in [`samples/`](samples/): **Pour-over Coffee** (with ingredients),
**Sourdough**, and **Clean Espresso Machine** (every duration style), each as
`.xlsx` and `.json`.

## Step-by-step mode

- Steps are counted on their own ("Step 2 of 4"); ingredients placed before a
  step appear on that step's screen under **You'll need**.
- One timer at a time. Press **Start timer** on the first step; after that,
  **Next**/**Back** stops the current timer and starts the new step's timer.
- When a timer ends you get an on-page alert, a repeating beep, a flashing tab
  title, and a browser notification (the browser asks for permission the first
  time you start a timer).

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev      # local dev server
npm test         # unit and component tests
npm run build    # produces dist/index.html
```

`dist/index.html` is a single self-contained file: host it anywhere (GitHub
Pages, Netlify, any web server) or open it directly by double-clicking.

`node scripts/make-samples.mjs` regenerates the sample files.
