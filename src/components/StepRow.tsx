import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useId } from 'react';
import { parseDuration } from '../lib/duration';
import type { Step } from '../lib/types';

type Props = {
  step: Step;
  index: number;
  editing: boolean;
  onToggleEdit: () => void;
  onChange: (patch: Partial<Omit<Step, 'id'>>) => void;
  onDelete: () => void;
};

export function StepRow({ step, index, editing, onToggleEdit, onChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });
  const id = useId();
  const untimed = step.duration.trim() !== '' && parseDuration(step.duration) === null;

  return (
    <li
      ref={setNodeRef}
      className={`step-row${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="step-line">
        <button
          ref={setActivatorNodeRef}
          className="drag-handle"
          aria-label={`Drag step ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          ☰
        </button>
        <span className="step-no">{index + 1}</span>
        <span className="step-title" data-testid="step-title">{step.title}</span>
        <span className="step-duration">{step.duration}</span>
        <button
          className="icon-btn"
          aria-label={`Edit step ${index + 1}`}
          aria-expanded={editing}
          onClick={onToggleEdit}
        >
          ✎
        </button>
      </div>
      {editing && (
        <div className="step-editor">
          <label htmlFor={`${id}-t`}>Title</label>
          <input id={`${id}-t`} value={step.title} onChange={(e) => onChange({ title: e.target.value })} autoFocus />
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
          <div className="editor-actions">
            <button className="btn btn-danger" onClick={onDelete}>Delete step</button>
            <button className="btn" onClick={onToggleEdit}>Done</button>
          </div>
        </div>
      )}
    </li>
  );
}
