# Ingredients in Recipes — Short Design

Date: 2026-11-20
Status: Approved 2026-11-20 (one recipe per file confirmed)
Builds on: `2026-11-15-sop-viewer-design.md`

## Intent

Let a recipe list its ingredients (e.g. Coffee 18 g, Water 250 ml) in the
same Excel/JSON file as its steps, told apart by a `Type` column. Ingredients
can sit anywhere in the list — typically right before the step that uses them.

## Goals / non-goals

- Goal: `Type` column with `Ingredient` or `Step`; one mixed, reorderable list.
- Goal: old files without `Type` keep working exactly as today.
- Non-goal: a separate Amount column (user chose to reuse Description).
- Non-goal: multiple recipes per file (user confirmed: one recipe per file), unit conversion, scaling servings.

## Approaches

1. **One mixed list with a type label on each row — chosen by the user.**
   Ingredients can be dragged between steps, so they appear where they're used.
2. Two separate lists (ingredients section + steps). Simpler numbering, but an
   ingredient can't sit next to the step that needs it.
3. Separate sheet for ingredients. Rejected: user wants one sheet.

## File format

```
Type       | Step | Title  | Description   | Duration
Ingredient |      | Coffee | 18 g, ground  |
Ingredient |      | Water  | 250 ml, 94 °C |
Step       | 1    | Grind  | Medium-fine   | 30 sec
Step       | 2    | Brew   | Pour slowly   | 3 min
```

- `Type`: `Ingredient` (also accepts `ingredients`, any case) or `Step`.
  Blank or missing → Step. Any other value → Step *(my call)*.
- Ingredient: **Title = name, Description = amount/notes** (user decision).
  Duration on an ingredient is kept in the file but never timed *(my call)*.
- A row needs a Title or Description to count (unchanged rule).
- **Order** *(my call)*: if the file has any ingredient rows, rows keep file
  order (ingredients have no Step number to sort by). Files with only steps
  still sort by Step as today.
- JSON: each object may have `"Type"`. Downloads include it.

## Download

Columns `Type | Step | Title | Description | Duration`, in list order. Step
numbers count steps only; ingredient rows get a blank Step. `Type` is written
for every row. A file with no ingredients is still written with the `Type`
column *(my call — one format, re-imports the same)*.

## Main view

```
Make Pour-over            Total: 3m 30s
  ☰ 🧂  Coffee     18 g, ground       ✎
  ☰ 🧂  Water      250 ml, 94 °C      ✎
  ☰  1  Grind                 30 sec  ✎
  ☰  2  Brew                   3 min  ✎
  [ + Add step ]  [ + Add ingredient ]   [ ▶ Start step-by-step ]
```

- Ingredient rows: 🧂 instead of a number, amount shown in place of duration,
  slightly tinted background *(my call)*.
- Drag and drop works across both kinds; step numbers recount steps only.
- Editor: a **Step / Ingredient** switch at the top. Ingredient editor shows
  **Name** and **Amount** (Title/Description); no Duration field.
- "+ Add ingredient" appends an ingredient and opens its editor.
- An **Ingredients summary** box above the list collects all ingredient rows
  (name + amount), read-only, so the "section" is visible at a glance even when
  ingredients are spread between steps *(my call)*. Hidden when there are none.
- "Start step-by-step" needs at least one step (ingredients alone don't count).

## Step-by-step mode *(my call)*

- "Step N of M" counts steps only.
- Ingredients placed before a step show on that step's screen as
  **You'll need: Coffee — 18 g, ground · Water — 250 ml**.
- Ingredients after the last step show on the last step's screen.
- Timers, auto-start and notifications are unchanged.

## Left to the builder

Exact styling, icon choice, data-model naming (e.g. `kind: 'step' | 'ingredient'`
on each item), and how the summary box looks on a phone.
