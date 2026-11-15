import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SopAction } from '../lib/sopReducer';
import type { Step } from '../lib/types';
import { StepRow } from './StepRow';

type Props = {
  steps: Step[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  dispatch: (a: SopAction) => void;
};

export function StepList({ steps, editingId, setEditingId, dispatch }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      dispatch({ type: 'moveStep', fromId: String(active.id), toId: String(over.id) });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ol className="step-list">
          {steps.map((step, i) => (
            <StepRow
              key={step.id}
              step={step}
              index={i}
              editing={editingId === step.id}
              onToggleEdit={() => setEditingId(editingId === step.id ? null : step.id)}
              onChange={(patch) => dispatch({ type: 'updateStep', id: step.id, patch })}
              onDelete={() => {
                if (window.confirm(`Delete step ${i + 1}?`)) {
                  dispatch({ type: 'deleteStep', id: step.id });
                  setEditingId(null);
                }
              }}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
