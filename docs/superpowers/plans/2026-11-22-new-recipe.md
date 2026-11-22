# New Recipe Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "+ New recipe" button that adds an empty, uniquely named recipe to the library and opens it in the existing editor with the title selected.

**Architecture:** A pure `uniqueTitle` helper in `library.ts` picks the name; `App` adds the recipe through the existing `add` action and focuses the title input; `RecipeList` and the empty first page each render the button.

**Tech Stack:** React 18, TypeScript, Vitest + Testing Library. Node at `$HOME/.nvm/versions/node/v26.13.1/bin` — prepend to PATH.

**Spec:** `docs/superpowers/specs/2026-11-22-new-recipe-design.md`

## Global Constraints

- Button text exactly `+ New recipe`.
- Base title `New recipe`; when taken (per `findByTitle`: trimmed, case-insensitive) use `New recipe 2`, `New recipe 3`, … (lowest free number ≥ 2).
- New recipe has `steps: []`; Start step-by-step stays disabled until a step exists.
- Hidden during step-by-step (the list and first page aren't rendered then — unchanged).

## Review Focus

1. Existing `new recipe` in another case or with spaces (`" new RECIPE "`) → counts as taken; next is `New recipe 2`.
2. Gaps: `New recipe` and `New recipe 3` exist → `New recipe 2` (lowest free).
3. Pressing the button while a step editor is open on another recipe → editor closes; new recipe opens with title focused.
4. Pressing it while a search filter is active → the new recipe still opens (main area), even if the filter hides it in the list.
5. The new recipe survives a reload like any other.

---

### Task 1: New recipe button

**Files:**
- Modify: `src/lib/library.ts`, `src/lib/library.test.ts`, `src/components/RecipeList.tsx`, `src/components/App.tsx`, `src/components/App.test.tsx`, `src/styles.css`, `README.md`

**Interfaces:**
- Consumes: `findByTitle`, `newRecipe`, `libraryReducer` `add` (existing).
- Produces:
  - `uniqueTitle(recipes: Recipe[], base?: string): string` — default base `'New recipe'`
  - `RecipeList` gains prop `onNew(): void`, rendered as a `+ New recipe` button above the search box.

- [ ] **Step 1: Write the failing tests**
  - `library.test.ts` `uniqueTitle picks the lowest free name` — `[]` → `New recipe`; `[' new RECIPE ']` → `New recipe 2`; `['New recipe','New recipe 3']` → `New recipe 2`; `['New recipe','New recipe 2']` → `New recipe 3`.
  - `App.test.tsx`:
    - `new recipe from the first page opens it with the title selected` — click `+ New recipe` on the empty page → recipe list shows `['New recipe']`; `SOP title` input has value `New recipe`, is `document.activeElement`, `selectionStart === 0` and `selectionEnd === 10`; `No steps yet.` shown; `Start step-by-step` disabled.
    - `a second new recipe gets the next number` — click it again (from the list) → list `['New recipe','New recipe 2']`, open title `New recipe 2`.
    - `new recipe closes an open step editor` — import Bread, open `Edit step 1`, click `+ New recipe` → no `Title` field (`queryByLabelText('Title')` null), open title `New recipe`.
    - `new recipe is remembered` — click it, `cleanup()`, render again → list `['New recipe']`.

- [ ] **Step 2: Run to see them fail**
  Run: `npx vitest run src/lib/library.test.ts src/components/App.test.tsx`
  Expected: FAIL — `uniqueTitle` not exported; no `+ New recipe` button.

- [ ] **Step 3: Implement** `uniqueTitle`; in App a `createRecipe()` that closes the editor, dispatches `add(newRecipe({ title: uniqueTitle(library.recipes), steps: [] }))`, sets view `list`, and focuses + selects the `SOP title` input after render (a ref flag consumed in an effect on `library.openId`); pass `onNew` to `RecipeList`; render the button on the empty page next to the copy; a README line under "Recipe library".

- [ ] **Step 4: Run everything**
  Run: `npx vitest run && npx tsc -p . && npm run build`
  Expected: all PASS, no type errors, build succeeds.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/library.ts src/lib/library.test.ts src/components/RecipeList.tsx src/components/App.tsx src/components/App.test.tsx src/styles.css README.md
  git commit -m "feat: + New recipe button"
  ```
