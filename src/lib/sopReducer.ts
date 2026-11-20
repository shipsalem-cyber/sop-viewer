import { arrayMove } from '@dnd-kit/sortable';
import { parseDuration } from './duration';
import { newStepId, type Sop, type Step } from './types';

export type SopAction =
  | { type: 'load'; sop: Sop }
  | { type: 'setTitle'; title: string }
  | { type: 'updateStep'; id: string; patch: Partial<Omit<Step, 'id'>> }
  | { type: 'addStep' }
  | { type: 'deleteStep'; id: string }
  | { type: 'moveStep'; fromId: string; toId: string };

export function sopReducer(state: Sop | null, action: SopAction): Sop | null {
  if (action.type === 'load') return action.sop;
  if (!state) return null;

  switch (action.type) {
    case 'setTitle':
      return { ...state, title: action.title };
    case 'updateStep':
      return {
        ...state,
        steps: state.steps.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      };
    case 'addStep':
      return {
        ...state,
        steps: [...state.steps, { id: newStepId(), kind: 'step', title: 'New step', description: '', duration: '' }],
      };
    case 'deleteStep':
      return { ...state, steps: state.steps.filter((s) => s.id !== action.id) };
    case 'moveStep': {
      const from = state.steps.findIndex((s) => s.id === action.fromId);
      const to = state.steps.findIndex((s) => s.id === action.toId);
      if (from < 0 || to < 0 || from === to) return state;
      return { ...state, steps: arrayMove(state.steps, from, to) };
    }
  }
}

export function totalSeconds(sop: Sop): number {
  return sop.steps.reduce((sum, s) => sum + (parseDuration(s.duration) ?? 0), 0);
}
