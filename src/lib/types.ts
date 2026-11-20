/** A row in a recipe: a timed step, or an ingredient (title = name, description = amount). */
export type StepKind = 'step' | 'ingredient';
export type Step = { id: string; kind: StepKind; title: string; description: string; duration: string };
export type Sop = { title: string; steps: Step[] };
/** unknownTypes: Type values that were neither Ingredient nor Step (imported as steps). */
export type ImportResult = { sop: Sop; ignoredColumns: string[]; unknownTypes: string[] };

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export function newStepId(): string {
  return crypto.randomUUID();
}
