import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { StepMode } from './StepMode';
import type { Sop } from '../lib/types';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const sop: Sop = { title: 'Bread', steps: [
  { id: 'a', kind: 'step', title: 'Mix', description: 'Mix it\nwell', duration: '10 s' },
  { id: 'b', kind: 'step', title: 'Rest', description: '', duration: '30 s' },
  { id: 'c', kind: 'step', title: 'Note', description: 'Just a note', duration: '' }] };

const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const click = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }));
const clock = () => screen.queryByTestId('clock')?.textContent;

function setup() {
  const props = { onExit: vi.fn(), onTimerStart: vi.fn(), onTimerEnd: vi.fn() };
  render(<StepMode sop={sop} {...props} />);
  return props;
}

test('first step shows timer but does not start it', () => {
  setup();
  expect(screen.getByRole('heading')).toHaveTextContent('Step 1 of 3 — Mix');
  expect(screen.getByText(/Mix it/)).toBeInTheDocument();
  expect(clock()).toBe('0:10');
  tick(5000);
  expect(clock()).toBe('0:10');
  expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
});

test('Start timer runs it and reports start', () => {
  const p = setup();
  click('Start timer');
  expect(p.onTimerStart).toHaveBeenCalledTimes(1);
  tick(3000);
  expect(clock()).toBe('0:07');
});

test('Next stops current timer and auto-starts next', () => {
  const p = setup();
  click('Start timer');
  tick(3000);
  click('Next');
  expect(screen.getByRole('heading')).toHaveTextContent('Step 2 of 3 — Rest');
  expect(clock()).toBe('0:30');
  expect(p.onTimerStart).toHaveBeenCalledTimes(2);
  tick(1000);
  expect(clock()).toBe('0:29');
  tick(10000);
  expect(p.onTimerEnd).not.toHaveBeenCalledWith(sop.steps[0], 0);
});

test('timer end reports step and stays on it', () => {
  const p = setup();
  click('Next');
  tick(30000);
  expect(p.onTimerEnd).toHaveBeenCalledTimes(1);
  expect(p.onTimerEnd).toHaveBeenCalledWith(sop.steps[1], 1);
  expect(screen.getByRole('heading')).toHaveTextContent('Step 2 of 3');
  expect(clock()).toBe('0:00');
});

test('step without duration has no clock; Back restarts previous', () => {
  setup();
  click('Next');
  click('Next');
  expect(screen.getByRole('heading')).toHaveTextContent('Step 3 of 3 — Note');
  expect(clock()).toBeUndefined();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  click('Back');
  expect(clock()).toBe('0:30');
  tick(1000);
  expect(clock()).toBe('0:29');
});

test('unparseable duration text is shown without clock', () => {
  render(<StepMode sop={{ title: 'x', steps: [{ id: 'a', kind: 'step', title: 'A', description: '', duration: 'about an hour' }] }} onExit={() => {}} />);
  expect(screen.getByText('about an hour')).toBeInTheDocument();
  expect(clock()).toBeUndefined();
});

test('pause and reset', () => {
  setup();
  click('Start timer');
  tick(2000);
  click('Pause');
  tick(5000);
  expect(clock()).toBe('0:08');
  click('Reset');
  expect(clock()).toBe('0:10');
  expect(screen.getByRole('button', { name: 'Start timer' })).toBeInTheDocument();
});

test('Back to list stops timer and exits', () => {
  const p = setup();
  click('Next');
  click(/Back to list/);
  expect(p.onExit).toHaveBeenCalledTimes(1);
  tick(60000);
  expect(p.onTimerEnd).not.toHaveBeenCalled();
});

test('first step shows full time under StrictMode', () => {
  render(<StrictMode><StepMode sop={sop} onExit={() => {}} /></StrictMode>);
  expect(clock()).toBe('0:10');
  expect(screen.getByRole('button', { name: 'Start timer' })).toBeInTheDocument();
});

test('zero duration has no timer and never rings', () => {
  const onTimerEnd = vi.fn();
  render(<StepMode sop={{ title: 'x', steps: [
    { id: 'a', kind: 'step', title: 'A', description: '', duration: '' },
    { id: 'b', kind: 'step', title: 'B', description: '', duration: '0 min' }] }} onExit={() => {}} onTimerEnd={onTimerEnd} />);
  click('Next');
  expect(clock()).toBeUndefined();
  tick(2000);
  expect(onTimerEnd).not.toHaveBeenCalled();
});
