export type Step = { id: string; title: string; description: string; duration: string };
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
