/** A row in a recipe: a timed step, or an ingredient (title = name, description = amount). */
export type StepKind = 'step' | 'ingredient';
export type Step = { id: string; kind: StepKind; title: string; description: string; duration: string };
export type Sop = { title: string; steps: Step[] };
export type ImportResult = { sop: Sop; ignoredColumns: string[] };

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export function newStepId(): string {
  return crypto.randomUUID();
}
