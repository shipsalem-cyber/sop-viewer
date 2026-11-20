import { stepCount, stepNumbers, stepScreens } from './recipe';
import type { Step } from './types';

const I = (t: string): Step => ({ id: t, kind: 'ingredient', title: t, description: '', duration: '' });
const S = (t: string): Step => ({ id: t, kind: 'step', title: t, description: '', duration: '' });

test('stepNumbers', () => {
  expect(stepNumbers([I('a'), S('b'), I('c'), S('d')])).toEqual([null, 1, null, 2]);
  expect(stepCount([I('a'), S('b')])).toBe(1);
});

// Review Focus 5
test('stepScreens groups ingredients onto the next step; trailing ones onto the last', () => {
  const screens = stepScreens([I('coffee'), S('grind'), I('water'), S('brew'), I('cup')]);
  expect(screens.map((s) => [s.stepNo, s.step.title, s.needs.map((n) => n.title)])).toEqual([
    [1, 'grind', ['coffee']], [2, 'brew', ['water', 'cup']]]);
  expect(stepScreens([I('x')])).toEqual([]);
});
