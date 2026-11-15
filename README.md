# SOP & Recipe Viewer

A static web page for viewing SOPs and recipes step by step. Import an Excel or
JSON file, drag steps into a new order, edit them, walk through them one at a
time with a timer, and download the result. Nothing is saved: refreshing the
page clears it, so download anything you want to keep.

## File format

One row (Excel) or object (JSON) per step:

| Step | Title | Description | Duration |
|------|-------|-------------|----------|
| 1 | Mix flour & water | Combine 500 g flour… | 10 min |

- Only **Title** is required. Column names are matched ignoring case and any
  trailing unit, e.g. `Duration (min)`. Other columns are ignored (you'll be told).
- Excel: the first sheet is used; rows above the header row are skipped.
- JSON: a list of steps, or `{ "title": "…", "steps": [ … ] }`.
- **Duration** examples: `45 sec`, `30s`, `5 min`, `1h 30m`, `1 hr 15 min 20 sec`,
  `01:30` (1 min 30 s), `1:02:30`. A plain number is minutes. Anything else
  (e.g. `5-10 min`) is shown as text without a timer.

Templates: [`samples/Sourdough.xlsx`](samples/Sourdough.xlsx) and
[`samples/Sourdough.json`](samples/Sourdough.json).

## Step-by-step mode

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
