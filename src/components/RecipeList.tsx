import { useState } from 'react';
import { sortedRecipes, type Recipe } from '../lib/library';

type Props = {
  recipes: Recipe[];
  openId: string | null;
  onOpen(id: string): void;
  onNew(): void;
  onRemove(): void;
  onClearAll(): void;
};

/** The library sidebar: count, search, A–Z list, Remove recipe and Clear all. Collapses behind a toggle on phones. */
export function RecipeList({ recipes, openId, onOpen, onNew, onRemove, onClearAll }: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const shown = sortedRecipes(recipes, query);
  const heading = `Recipes (${recipes.length})`;

  return (
    <nav aria-label="Recipes" className={`recipe-list${expanded ? ' expanded' : ''}`}>
      <button className="btn recipe-toggle" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
        {heading} ▾
      </button>
      <div className="recipe-panel">
        <h2>{heading}</h2>
        <button className="btn" onClick={() => { onNew(); setExpanded(false); }}>+ New recipe</button>
        <input
          type="search"
          className="recipe-search"
          aria-label="Search recipes"
          placeholder="🔍 search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul aria-label="Recipe list">
          {shown.map((r) => (
            <li key={r.id}>
              <button
                className="recipe-item"
                aria-current={r.id === openId ? 'true' : undefined}
                onClick={() => { onOpen(r.id); setExpanded(false); }}
              >
                {r.title || 'Untitled'}
              </button>
            </li>
          ))}
        </ul>
        {shown.length === 0 && <p className="muted small">No recipes match “{query}”.</p>}
        <div className="recipe-actions">
          <button className="btn" disabled={!openId} onClick={onRemove}>Remove recipe</button>
          <button className="btn" onClick={onClearAll}>Clear all</button>
        </div>
      </div>
    </nav>
  );
}
