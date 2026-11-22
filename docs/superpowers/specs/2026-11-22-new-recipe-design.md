# New Recipe Button — Short Design

Date: 2026-11-22
Status: Approved 2026-11-22
Builds on: `2026-11-22-recipe-library-design.md`

## Intent

Let someone create a recipe by typing it into the app, without preparing an
Excel/JSON file first. The editor already exists; what's missing is a way to
start from nothing.

## Approaches

1. **"+ New recipe" button that adds an empty recipe and opens it in the
   existing editor — chosen by the user.** Smallest change; one way of editing.
2. A separate "create recipe" page or guided form. Rejected for now: it would
   duplicate the editor; can be added later if needed.

## Design

- **Where:** at the top of the recipe list (next to search), and on the empty
  first page beside Import, so a device with no files can start.
- **What it does:** adds a recipe titled `New recipe` (no steps) and opens it;
  the title field gets focus with its text selected. If that title is taken
  (same comparison as the import duplicate check), use `New recipe 2`,
  `New recipe 3`, … *(my call — keeps the import Replace prompt unambiguous)*.
- **Then:** the normal list view — "No steps yet.", **+ Add step**,
  **+ Add ingredient**; **Start step-by-step** stays disabled until there's a
  step (unchanged rule).
- **Saving:** remembered on this device immediately like any recipe; Download
  turns it into a file.
- **While cooking:** hidden with the other library controls (unchanged rule).
- **Non-goals:** a guided form, templates, a separate page.

## Left to the builder

Button styling and exact placement within the list panel.
