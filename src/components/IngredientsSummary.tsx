import type { Step } from '../lib/types';

/** Read-only list of every ingredient in the recipe, wherever it sits among the steps. */
export function IngredientsSummary({ items }: { items: Step[] }) {
  const ingredients = items.filter((s) => s.kind === 'ingredient');
  if (ingredients.length === 0) return null;
  return (
    <section className="ingredients-summary" aria-label="Ingredients">
      <h2>Ingredients</h2>
      <ul>
        {ingredients.map((s) => (
          <li key={s.id}>{s.description.trim() ? `${s.title} — ${s.description}` : s.title}</li>
        ))}
      </ul>
    </section>
  );
}
