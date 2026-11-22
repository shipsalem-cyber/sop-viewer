import { emptyLibrary, type Library, type Recipe } from './library';

export const STORAGE_KEY = 'sop-viewer.library';
const VERSION = 1;

export type LoadResult = { library: Library; problem: 'corrupt' | 'unavailable' | null };

const defaultStorage = () => window.localStorage;

const isString = (v: unknown): v is string => typeof v === 'string';
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isStep(v: unknown): boolean {
  return (
    isObject(v) &&
    isString(v.id) && isString(v.title) && isString(v.description) && isString(v.duration) &&
    (v.kind === 'step' || v.kind === 'ingredient')
  );
}

function isRecipe(v: unknown): v is Recipe {
  return isObject(v) && isString(v.id) && isString(v.title) && Array.isArray(v.steps) && v.steps.every(isStep);
}

/** Parses saved text into a library, or null when it isn't a library this version understands. */
function parse(raw: string): Library | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(data) || data.version !== VERSION || !Array.isArray(data.recipes) || !data.recipes.every(isRecipe)) {
    return null;
  }
  const recipes: Recipe[] = data.recipes.map((r) => ({
    id: r.id,
    title: r.title,
    steps: r.steps.map(({ id, kind, title, description, duration }) => ({ id, kind, title, description, duration })),
  }));
  const openId = recipes.some((r) => r.id === data.openId) ? (data.openId as string) : recipes[0]?.id ?? null;
  return { recipes, openId };
}

export function loadLibrary(getStorage: () => Storage = defaultStorage): LoadResult {
  let storage: Storage;
  let raw: string | null;
  try {
    storage = getStorage();
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { library: emptyLibrary, problem: 'unavailable' };
  }
  if (raw === null) return { library: emptyLibrary, problem: null };
  const library = parse(raw);
  if (library) return { library, problem: null };
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing more to do: the bad data stays, but we start empty either way.
  }
  return { library: emptyLibrary, problem: 'corrupt' };
}

/** Saves the library; returns false when this device won't store it (private window, full, blocked). */
export function saveLibrary(library: Library, getStorage: () => Storage = defaultStorage): boolean {
  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, ...library }));
    return true;
  } catch {
    return false;
  }
}
