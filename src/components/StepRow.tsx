import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useId } from 'react';
import { parseDuration } from '../lib/duration';
import type { Step, StepKind } from '../lib/types';

type Props = {
  step: Step;
  /** 1-based number among steps (null for ingredients). */
  stepNo: number | null;
  /** 1-based number among ingredients (null for steps). */
  ingredientNo: number | null;
  editing: boolean;
  onToggleEdit: () => void;
  onChange: (patch: Partial<Omit<Step, 'id'>>) => void;
  onDelete: () => void;
};

export function StepRow({ step, stepNo, ingredientNo, editing, onToggleEdit, onChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });
  const id = useId();
  const isIngredient = step.kind === 'ingredient';
  const label = isIngredient ? `ingredient ${ingredientNo}` : `step ${stepNo}`;
  const untimed = !isIngredient && step.duration.trim() !== '' && parseDuration(step.duration) === null;

  return (
    <li
      ref={setNodeRef}
      className={`step-row${isIngredient ? ' ingredient' : ''}${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="step-line">
        <button
          ref={setActivatorNodeRef}
          className="drag-handle"
          aria-label={`Drag ${label}`}
          {...attributes}
          {...listeners}
        >
          ☰
        </button>
        <span className="step-no" aria-hidden={isIngredient}>{isIngredient ? '🧂' : stepNo}</span>
        <span className="step-title" data-testid="step-title">{step.title}</span>
        <span className="step-duration">{isIngredient ? step.description : step.duration}</span>
        <button className="icon-btn" aria-label={`Edit ${label}`} aria-expanded={editing} onClick={onToggleEdit}>
          ✎
        </button>
      </div>
      {editing && (
        <div className="step-editor">
          <fieldset className="kind-switch">
            <legend>Type</legend>
            {(['step', 'ingredient'] as StepKind[]).map((k) => (
              <label key={k}>
                <input
                  type="radio"
                  name={`${id}-kind`}
                  checked={step.kind === k}
                  onChange={() => onChange({ kind: k })}
                />
                {k === 'step' ? 'Step' : 'Ingredient'}
              </label>
            ))}
          </fieldset>

          <label htmlFor={`${id}-t`}>{isIngredient ? 'Name' : 'Title'}</label>
          <input id={`${id}-t`} value={step.title} onChange={(e) => onChange({ title: e.target.value })} autoFocus />

          {isIngredient ? (
            <>
              <label htmlFor={`${id}-d`}>Amount</label>
              <input
                id={`${id}-d`}
                value={step.description}
                placeholder="e.g. 18 g, ground"
                onChange={(e) => onChange({ description: e.target.value })}
              />
            </>
          ) : (
            <>
              <label htmlFor={`${id}-d`}>Description</label>
              <textarea
                id={`${id}-d`}
                rows={4}
                value={step.description}
                onChange={(e) => onChange({ description: e.target.value })}
              />
              <label htmlFor={`${id}-u`}>Duration</label>
              <div className="duration-field">
                <input
                  id={`${id}-u`}
                  value={step.duration}
                  placeholder="e.g. 45 sec, 10 min, 1h 30m"
                  onChange={(e) => onChange({ duration: e.target.value })}
                />
                {untimed && <span className="hint">won't be timed</span>}
              </div>
            </>
          )}

          <div className="editor-actions">
            <button className="btn btn-danger" onClick={onDelete}>
              {isIngredient ? 'Delete ingredient' : 'Delete step'}
            </button>
            <button className="btn" onClick={onToggleEdit}>Done</button>
          </div>
        </div>
      )}
    </li>
  );
}
