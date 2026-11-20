import type { Step } from './types';

/** 1-based number for each step; null for ingredients. */
export function stepNumbers(items: Step[]): (number | null)[] {
  let n = 0;
  return items.map((s) => (s.kind === 'step' ? ++n : null));
}

export function stepCount(items: Step[]): number {
  return items.filter((s) => s.kind === 'step').length;
}

export type StepScreen = { step: Step; stepNo: number; needs: Step[] };

/**
 * One screen per step for step-by-step mode. Each screen lists the ingredients
 * placed since the previous step; ingredients after the last step join the last screen.
 */
export function stepScreens(items: Step[]): StepScreen[] {
  const screens: StepScreen[] = [];
  let pending: Step[] = [];
  for (const item of items) {
    if (item.kind === 'ingredient') pending.push(item);
    else {
      screens.push({ step: item, stepNo: screens.length + 1, needs: pending });
      pending = [];
    }
  }
  if (pending.length && screens.length) {
    const last = screens[screens.length - 1];
    last.needs = [...last.needs, ...pending];
  }
  return screens;
}
