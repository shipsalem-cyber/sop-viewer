import { sopReducer, type SopAction } from './sopReducer';
import type { Sop } from './types';

/** A recipe in the library: an imported Sop with a stable id. */
export type Recipe = Sop & { id: string };
export type Library = { recipes: Recipe[]; openId: string | null };

export const emptyLibrary: Library = { recipes: [], openId: null };

export type LibraryAction =
  | { type: 'add'; recipe: Recipe }
  | { type: 'replace'; id: string; sop: Sop }
  | { type: 'open'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'edit'; action: SopAction };

export function newRecipe(sop: Sop): Recipe {
  return { ...sop, id: crypto.randomUUID() };
}

const byTitle = (a: Recipe, b: Recipe) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

export function sortedRecipes(recipes: Recipe[], query = ''): Recipe[] {
  const q = query.trim().toLowerCase();
  return recipes.filter((r) => r.title.toLowerCase().includes(q)).sort(byTitle);
}

export function findByTitle(recipes: Recipe[], title: string): Recipe | undefined {
  const t = title.trim().toLowerCase();
  return recipes.find((r) => r.title.trim().toLowerCase() === t);
}

export function openRecipe(lib: Library): Recipe | null {
  return lib.recipes.find((r) => r.id === lib.openId) ?? null;
}

export function libraryReducer(state: Library, action: LibraryAction): Library {
  switch (action.type) {
    case 'add':
      return { recipes: [...state.recipes, action.recipe], openId: action.recipe.id };
    case 'replace':
      if (!state.recipes.some((r) => r.id === action.id)) return state;
      return {
        recipes: state.recipes.map((r) => (r.id === action.id ? { ...action.sop, id: r.id } : r)),
        openId: action.id,
      };
    case 'open':
      return state.recipes.some((r) => r.id === action.id) ? { ...state, openId: action.id } : state;
    case 'remove': {
      const recipes = state.recipes.filter((r) => r.id !== action.id);
      if (state.openId !== action.id) return { ...state, recipes };
      const order = sortedRecipes(state.recipes);
      const at = order.findIndex((r) => r.id === action.id);
      const next = order[at + 1] ?? order[at - 1] ?? null;
      return { recipes, openId: next?.id ?? null };
    }
    case 'clear':
      return emptyLibrary;
    case 'edit': {
      const open = openRecipe(state);
      if (!open || action.action.type === 'load') return state;
      const edited = sopReducer(open, action.action);
      if (!edited || edited === open) return state;
      return { ...state, recipes: state.recipes.map((r) => (r.id === open.id ? { ...edited, id: open.id } : r)) };
    }
  }
}
