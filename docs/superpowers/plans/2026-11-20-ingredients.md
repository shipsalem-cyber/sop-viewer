# Ingredients in Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one recipe file hold ingredients and steps in a single mixed list, told apart by a `Type` column, shown and edited in the list view and surfaced in step-by-step mode as "You'll need".

**Architecture:** Every list item keeps the existing `Step` shape plus a `kind: 'step' | 'ingredient'`. The `Sop.steps` array stays the one ordered list. Pure helpers in a new `src/lib/recipe.ts` derive step numbers and step-mode screens; import, export, reducer and components consume them.

**Tech Stack:** Existing Vite + React + TypeScript app, SheetJS, dnd-kit, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-20-ingredients-design.md` (builds on `docs/superpowers/specs/2026-11-15-sop-viewer-design.md`)

## Global Constraints

- One recipe per file. One mixed, reorderable list.
- `Type` values: `Ingredient` (also `ingredients`, any case) → ingredient; blank, missing, `Step` or anything else → step.
- Ingredient: Title = name, Description = amount/notes. Its Duration is kept in files but never timed and never counted in the total.
- Order: if the file has any ingredient rows, keep file order; otherwise sort by Step exactly as today.
- Download columns: `Type | Step | Title | Description | Duration`, list order; `Type` written for every row as `Ingredient` or `Step`; Step numbers count steps only; ingredient Step cell blank (JSON: `null`).
- Step numbers ("1", "Step N of M") count steps only.
- Old files without `Type` import exactly as before.

## Review Focus

1. **Every row numbered, including ingredients** (`Step` = 1..n on all rows) — ingredient rows still import as ingredients, file order kept, and they show 🧂 not a number. Test in Task 1.
2. **`Type` column present but blank on every row** — all steps, still sorted by Step as before. Test in Task 1.
3. **Ingredient with a Duration** (`5 min`) — not timed, not in total, written back unchanged on download. Tests in Tasks 2 and 3.
4. **Recipe with ingredients but no steps** — "Start step-by-step" disabled; download still works. Test in Task 4.
5. **Ingredients after the last step / between steps** — trailing ones show on the last step's screen; ones between step 1 and 2 show on step 2 only. Test in Task 5.

---

### Task 1: Item kind + import

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/importSop.ts`
- Modify (fixtures only, add `kind: 'step'`): `src/lib/exportSop.test.ts`, `src/lib/sopReducer.test.ts`, `src/components/StepMode.test.tsx`
- Test: `src/lib/importSop.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `type StepKind = 'step' | 'ingredient'`
  - `type Step = { id: string; kind: StepKind; title: string; description: string; duration: string }`
- Produces (`importSop.ts`): `kindOf(value: string): StepKind` (exported for reuse in tests); `rowsToSop` recognises a `type` column (no longer reported in `ignoredColumns`).

- [ ] **Step 1: Write failing tests** in `importSop.test.ts`

```ts
test('Type column splits ingredients and steps, keeps file order', () => {
  const r = parseJsonText(JSON.stringify([
    { Type: 'Ingredient', Title: 'Coffee', Description: '18 g' },
    { Type: 'step', Step: 2, Title: 'Brew' },
    { Type: 'INGREDIENTS', Title: 'Water', Description: '250 ml' },
    { Type: 'Step', Step: 1, Title: 'Grind' },
  ]), 'x.json');
  expect(r.sop.steps.map((s) => [s.kind, s.title])).toEqual([
    ['ingredient', 'Coffee'], ['step', 'Brew'], ['ingredient', 'Water'], ['step', 'Grind']]);
  expect(r.ignoredColumns).toEqual([]);
});

test.each([['', 'step'], ['Step', 'step'], ['note', 'step'], ['ingredient', 'ingredient'], [' Ingredients ', 'ingredient']] as const)(
  'kindOf(%j) = %s', (v, k) => expect(kindOf(v)).toBe(k));

test('no Type column → all steps', () => {
  const r = parseJsonText(JSON.stringify([{ Title: 'A' }]), 'x.json');
  expect(r.sop.steps[0].kind).toBe('step');
});

// Review Focus 1
test('ingredients with step numbers stay ingredients, file order kept', () => {
  const buf = makeXlsx([['Type', 'Step', 'Title'], ['Ingredient', 2, 'Coffee'], ['Step', 1, 'Grind']]);
  expect(parseWorkbook(buf, 'x.xlsx').sop.steps.map((s) => [s.kind, s.title])).toEqual([['ingredient', 'Coffee'], ['step', 'Grind']]);
});

// Review Focus 2
test('blank Type column still sorts by Step', () => {
  const buf = makeXlsx([['Type', 'Step', 'Title'], ['', 2, 'b'], ['', 1, 'a']]);
  expect(parseWorkbook(buf, 'x.xlsx').sop.steps.map((s) => s.title)).toEqual(['a', 'b']);
});
```

Update the existing test `case-insensitive keys, unit suffix, extras reported`: `ignoredColumns` becomes `['Image']` (`type` is now a known column).

- [ ] **Step 2: Run** `npx vitest run src/lib/importSop.test.ts` → FAIL (`kindOf` not exported / `kind` undefined).
- [ ] **Step 3: Implement.** Add `'type'` to `Field`/`FIELDS`; set `kind: kindOf(get(row, 'type'))` on each item; sort by Step only when no item is an ingredient **and** all Step values are numeric. Add `kind: 'step'` to `Step` literals in the three other test files so `npx tsc -b` passes.
- [ ] **Step 4: Run** `npx vitest run && npx tsc -b` → all PASS, no type errors.
- [ ] **Step 5: Commit** — `git commit -am "feat: import Type column as ingredients or steps"`

---

### Task 2: Export with Type column

**Files:**
- Modify: `src/lib/exportSop.ts`
- Test: `src/lib/exportSop.test.ts`

**Interfaces:**
- Consumes: `Step.kind` (Task 1), `stepNumbers` (Task 3 — **not yet available**; compute numbers inline here, Task 3 refactors to the helper)
- Produces: same function names; new column order `Type | Step | Title | Description | Duration`.

- [ ] **Step 1: Write failing tests** (replace the header-order and JSON-shape expectations)

```ts
const mixed: Sop = { title: 'Pour-over', steps: [
  { id: 'i1', kind: 'ingredient', title: 'Coffee', description: '18 g', duration: '' },
  { id: 's1', kind: 'step', title: 'Grind', description: '', duration: '30 sec' },
  { id: 'i2', kind: 'ingredient', title: 'Water', description: '250 ml', duration: '5 min' },
  { id: 's2', kind: 'step', title: 'Brew', description: '', duration: '3 min' }] };

test('JSON has Type and step-only numbering', () => {
  expect(JSON.parse(toJsonText(mixed))).toEqual([
    { Type: 'Ingredient', Step: null, Title: 'Coffee', Description: '18 g', Duration: '' },
    { Type: 'Step', Step: 1, Title: 'Grind', Description: '', Duration: '30 sec' },
    { Type: 'Ingredient', Step: null, Title: 'Water', Description: '250 ml', Duration: '5 min' },
    { Type: 'Step', Step: 2, Title: 'Brew', Description: '', Duration: '3 min' }]);
});

test('xlsx header and rows', () => {
  const rows = sheetRows(toXlsxBytes(mixed));
  expect(rows[0]).toEqual(['Type', 'Step', 'Title', 'Description', 'Duration']);
  expect(rows[1]).toEqual(['Ingredient', undefined, 'Coffee', '18 g', '']);   // sheet_to_json leaves the blank Step as a hole
  expect(rows[2].slice(0, 3)).toEqual(['Step', 1, 'Grind']);
});

// Review Focus 3 (export half)
test('round trip keeps kinds, order and ingredient duration', () => {
  const back = parseWorkbook(toXlsxBytes(mixed), 'x.xlsx');
  expect(back.sop.steps.map((s) => [s.kind, s.title, s.duration])).toEqual(
    mixed.steps.map((s) => [s.kind, s.title, s.duration]));
});
```

Existing tests: update `xlsx header row order` and `zero steps exports header only` to the five-column header; the Duration-as-text test now checks cell `E2`.

- [ ] **Step 2: Run** `npx vitest run src/lib/exportSop.test.ts` → FAIL.
- [ ] **Step 3: Implement** — Type cell `'Ingredient' | 'Step'`; Step number = running count of steps, `null`/empty cell for ingredients; Duration column index 4, still written as `t: 's'`; widths `[{wch:11},{wch:6},{wch:28},{wch:60},{wch:14}]`.
- [ ] **Step 4: Run** `npx vitest run` → PASS (sample test may fail on header — fixed in Task 6; if so, ledger it and continue).
- [ ] **Step 5: Commit** — `git commit -am "feat: export Type column"`

---

### Task 3: Recipe helpers + reducer

**Files:**
- Create: `src/lib/recipe.ts`
- Modify: `src/lib/sopReducer.ts`, `src/lib/exportSop.ts` (use `stepNumbers`)
- Test: `src/lib/recipe.test.ts`, `src/lib/sopReducer.test.ts`

**Interfaces:**
- Consumes: `Step`, `StepKind` (Task 1)
- Produces (`recipe.ts`):
  - `stepNumbers(items: Step[]): (number | null)[]` — 1-based count of steps, `null` for ingredients
  - `stepCount(items: Step[]): number`
  - `type StepScreen = { step: Step; stepNo: number; needs: Step[] }`
  - `stepScreens(items: Step[]): StepScreen[]` — one per step; `needs` = ingredients since the previous step; ingredients after the last step are appended to the last screen's `needs`
- Produces (`sopReducer.ts`): new action `{ type: 'addIngredient' }` appending `{ kind: 'ingredient', title: 'New ingredient', description: '', duration: '' }`; `addStep` appends `kind: 'step'`; `updateStep` patch may include `kind`; `totalSeconds` skips ingredients.

- [ ] **Step 1: Write failing tests**

```ts
// recipe.test.ts
const I = (t: string): Step => ({ id: t, kind: 'ingredient', title: t, description: '', duration: '' });
const S = (t: string): Step => ({ id: t, kind: 'step', title: t, description: '', duration: '' });

test('stepNumbers', () => {
  expect(stepNumbers([I('a'), S('b'), I('c'), S('d')])).toEqual([null, 1, null, 2]);
  expect(stepCount([I('a'), S('b')])).toBe(1);
});

// Review Focus 5
test('stepScreens groups ingredients onto the next step; trailing ones onto the last', () => {
  const screens = stepScreens([I('coffee'), S('grind'), I('water'), S('brew'), I('cup')]);
  expect(screens.map((s) => [s.stepNo, s.step.title, s.needs.map((n) => n.title)])).toEqual([
    [1, 'grind', ['coffee']], [2, 'brew', ['water', 'cup']]]);
  expect(stepScreens([I('x')])).toEqual([]);
});
```

```ts
// sopReducer.test.ts additions
test('addIngredient appends an ingredient', () => {
  const s = sopReducer(mk(), { type: 'addIngredient' })!;
  expect(s.steps[3]).toMatchObject({ kind: 'ingredient', title: 'New ingredient' });
});
test('addStep appends kind step', () => {
  expect(sopReducer(mk(), { type: 'addStep' })!.steps[3].kind).toBe('step');
});
test('updateStep can switch kind', () => {
  expect(sopReducer(mk(), { type: 'updateStep', id: 'a', patch: { kind: 'ingredient' } })!.steps[0].kind).toBe('ingredient');
});
// Review Focus 3 (total half)
test('totalSeconds ignores ingredient durations', () => {
  const s = mk();
  s.steps[0] = { ...s.steps[0], kind: 'ingredient' };   // '10 min' ingredient
  expect(totalSeconds(s)).toBe(45);
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/recipe.test.ts src/lib/sopReducer.test.ts` → FAIL.
- [ ] **Step 3: Implement**; switch `exportSop.ts` numbering to `stepNumbers`.
- [ ] **Step 4: Run** `npx vitest run && npx tsc -b` → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: recipe helpers and ingredient actions"`

---

### Task 4: List view — ingredient rows, editor switch, summary

**Files:**
- Create: `src/components/IngredientsSummary.tsx`
- Modify: `src/components/StepRow.tsx`, `src/components/StepList.tsx`, `src/components/App.tsx`, `src/styles.css`
- Test: `src/components/App.test.tsx`

**Interfaces:**
- Consumes: `stepNumbers`, `stepCount` (Task 3); `addIngredient` action (Task 3)
- Produces: `StepRow` gets `stepNo: number | null` and `ingredientNo: number | null` props instead of `index` for labels; `IngredientsSummary({ items }: { items: Step[] })`.

Behaviour (from spec):
- Ingredient row: 🧂 in the number slot, amount (description) where duration shows, class `ingredient` (tinted background).
- Accessible names: steps `Edit step {stepNo}` / `Drag step {stepNo}`; ingredients `Edit ingredient {ingredientNo}` / `Drag ingredient {ingredientNo}` (1-based count of ingredients).
- Editor: radio group labelled **Type** with options **Step** / **Ingredient** (dispatches `updateStep { kind }`). Ingredient editor labels: **Name** (title), **Amount** (description, single-line input), no Duration field. Step editor unchanged.
- Delete confirm: steps `Delete step {n}?`; ingredients `Delete ingredient "{title}"?`.
- "+ Add ingredient" button next to "+ Add step"; opens the new item's editor (reuse the `editNewStep` mechanism).
- `IngredientsSummary` above the list: heading "Ingredients", one line per ingredient `{title} — {description}` (no dash when description empty); hidden when there are none.
- "Start step-by-step" disabled when `stepCount === 0`.

- [ ] **Step 1: Write failing tests** in `App.test.tsx` (fixture `mixed` = JSON rows Coffee/18 g ingredient, Grind step 30 sec, Water/250 ml ingredient, Brew step 3 min)

```ts
test('ingredient rows show without numbers; steps numbered 1..n', async () => {
  const { upload } = setup();
  await upload(jsonFile(mixed, 'Pour-over.json'));
  expect(rowTitles()).toEqual(['Coffee', 'Grind', 'Water', 'Brew']);
  expect(screen.getByRole('button', { name: 'Edit ingredient 2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit step 2' })).toBeInTheDocument();
  expect(screen.getByText('Total: 3m 30s')).toBeInTheDocument();
});

test('ingredients summary lists name and amount', async () => {
  const { upload } = setup();
  await upload(jsonFile(mixed, 'Pour-over.json'));
  const box = screen.getByRole('region', { name: 'Ingredients' });
  expect(within(box).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Coffee — 18 g', 'Water — 250 ml']);
});

test('add ingredient opens Name/Amount editor without Duration', async () => {
  const { user, upload } = setup();
  await upload(jsonFile(three));
  await user.click(screen.getByRole('button', { name: '+ Add ingredient' }));
  expect(screen.getByLabelText('Name')).toHaveValue('New ingredient');
  expect(screen.getByLabelText('Amount')).toBeInTheDocument();
  expect(screen.queryByLabelText('Duration')).toBeNull();
});

test('switching a step to ingredient renumbers', async () => {
  const { user, upload } = setup();
  await upload(jsonFile(three));
  await user.click(screen.getByRole('button', { name: 'Edit step 1' }));
  await user.click(screen.getByRole('radio', { name: 'Ingredient' }));
  expect(screen.getByRole('button', { name: 'Edit step 1' })).toBeInTheDocument();   // former step 2
  expect(screen.getByRole('button', { name: 'Edit ingredient 1' })).toBeInTheDocument();
});

// Review Focus 4
test('ingredients only: step-by-step disabled, download works', async () => {
  const spy = vi.spyOn(exportSop, 'downloadFile').mockImplementation(() => {});
  const { user, upload } = setup();
  await upload(jsonFile([{ Type: 'Ingredient', Title: 'Salt', Description: '1 tsp' }]));
  expect(screen.getByRole('button', { name: /Start step-by-step/ })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: /Download/ }));
  await user.click(screen.getByRole('menuitem', { name: 'JSON' }));
  expect(JSON.parse(spy.mock.calls[0][0] as string)[0]).toMatchObject({ Type: 'Ingredient', Title: 'Salt' });
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/App.test.tsx` → new tests FAIL, existing pass.
- [ ] **Step 3: Implement.** Summary is a `<section aria-label="Ingredients">` with an `<h2>` and `<ul>`.
- [ ] **Step 4: Run** `npx vitest run && npx tsc -b` → PASS.
- [ ] **Step 5: Manual check** — `npm run dev`, import a mixed file, drag an ingredient between steps (numbers recount), check 375 px width.
- [ ] **Step 6: Commit** — `git commit -am "feat: ingredients in list view"`

---

### Task 5: Step-by-step mode with "You'll need"

**Files:**
- Modify: `src/components/StepMode.tsx`, `src/styles.css`
- Test: `src/components/StepMode.test.tsx`

**Interfaces:**
- Consumes: `stepScreens`, `StepScreen` (Task 3)
- Produces: unchanged props; `onTimerEnd(step, index)` — `index` is the 0-based position among **steps** (so App's "Step {index+1}" message stays right).

Behaviour: navigate over `stepScreens(sop.steps)`; heading `Step {stepNo} of {screens.length} — {title}`; when `needs` is non-empty, a `<section aria-label="You'll need">` above the description listing `{title} — {description}`; timers/auto-start unchanged.

- [ ] **Step 1: Write failing tests**

```ts
const recipe: Sop = { title: 'Pour-over', steps: [
  { id: 'i1', kind: 'ingredient', title: 'Coffee', description: '18 g', duration: '' },
  { id: 's1', kind: 'step', title: 'Grind', description: '', duration: '5 s' },
  { id: 'i2', kind: 'ingredient', title: 'Water', description: '250 ml', duration: '9 min' },
  { id: 's2', kind: 'step', title: 'Brew', description: '', duration: '3 s' },
  { id: 'i3', kind: 'ingredient', title: 'Cup', description: '', duration: '' }] };

test('counts steps only and shows what you need', () => {
  const onTimerEnd = vi.fn();
  render(<StepMode sop={recipe} onExit={() => {}} onTimerEnd={onTimerEnd} />);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Step 1 of 2 — Grind');
  const needs = () => within(screen.getByRole('region', { name: "You'll need" })).getAllByRole('listitem').map((li) => li.textContent);
  expect(needs()).toEqual(['Coffee — 18 g']);
  expect(clock()).toBe('0:05');
  click('Next');
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Step 2 of 2 — Brew');
  expect(needs()).toEqual(['Water — 250 ml', 'Cup']);
  tick(3000);
  expect(onTimerEnd).toHaveBeenCalledWith(recipe.steps[3], 1);
});

test('no "You\'ll need" box when a step has no ingredients', () => {
  render(<StepMode sop={sop} onExit={() => {}} />);   // existing all-steps fixture
  expect(screen.queryByRole('region', { name: "You'll need" })).toBeNull();
});
```

Existing tests use `getByRole('heading')`; switch them to `{ level: 2 }` if the new section heading makes it ambiguous.

- [ ] **Step 2: Run** `npx vitest run src/components/StepMode.test.tsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run && npx tsc -b` → PASS.
- [ ] **Step 5: Manual check** — step mode on a mixed recipe in `npm run dev`.
- [ ] **Step 6: Commit** — `git commit -am "feat: show ingredients in step-by-step mode"`

---

### Task 6: Samples + README

**Files:**
- Modify: `scripts/make-samples.mjs`, `src/samples.test.ts`, `README.md`
- Create (generated): `samples/Pour-over Coffee.json`, `samples/Pour-over Coffee.xlsx`

- [ ] **Step 1: Write failing test** in `samples.test.ts`: `samples/Pour-over Coffee.xlsx` and `.json` import to the same `[kind, title]` list, beginning `['ingredient','Coffee'], ['ingredient','Water'], ['step','Rinse filter']`, with `stepCount` = 4.
- [ ] **Step 2: Run** → FAIL (file missing).
- [ ] **Step 3:** Script writes the five-column format (`Type` column) for every example; add Pour-over Coffee: ingredients Coffee — 18 g, medium-fine; Water — 300 ml, 94 °C; Filter paper — 1; then steps Rinse filter (20 sec), Add coffee (—), Bloom (45 sec), Pour (2 min 30 sec), with one ingredient (Cup — warmed) placed before the last step. Run `node scripts/make-samples.mjs`.
- [ ] **Step 4:** README "File format": add the `Type` column, the Ingredient/Step rule, "Description = amount for ingredients", and the step-mode "You'll need" line.
- [ ] **Step 5: Run** `npx vitest run && npm run build` → PASS, `dist/index.html` only.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "docs: ingredient sample and README"`
