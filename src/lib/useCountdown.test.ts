import { act, renderHook } from '@testing-library/react';
import { useCountdown } from './useCountdown';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

test('counts down and calls onEnd once', () => {
  const onEnd = vi.fn();
  const { result } = renderHook(() => useCountdown(onEnd));
  act(() => result.current.start(5));
  expect(result.current.running).toBe(true);
  expect(result.current.remaining).toBe(5);
  tick(2000);
  expect(result.current.remaining).toBe(3);
  tick(3000);
  expect(result.current.ended).toBe(true);
  expect(result.current.running).toBe(false);
  expect(result.current.remaining).toBe(0);
  tick(5000);
  expect(onEnd).toHaveBeenCalledTimes(1);
});

test('pause holds remaining, resume continues', () => {
  const { result } = renderHook(() => useCountdown(() => {}));
  act(() => result.current.start(5));
  tick(2000);
  act(() => result.current.pause());
  tick(10000);
  expect(result.current.remaining).toBe(3);
  expect(result.current.running).toBe(false);
  act(() => result.current.resume());
  tick(1000);
  expect(result.current.remaining).toBe(2);
});

test('reset sets remaining without running', () => {
  const { result } = renderHook(() => useCountdown(() => {}));
  act(() => result.current.start(5));
  tick(1000);
  act(() => result.current.reset(30));
  expect(result.current).toMatchObject({ remaining: 30, running: false, ended: false });
  tick(5000);
  expect(result.current.remaining).toBe(30);
});

test('stop prevents onEnd', () => {
  const onEnd = vi.fn();
  const { result } = renderHook(() => useCountdown(onEnd));
  act(() => result.current.start(2));
  act(() => result.current.stop());
  tick(5000);
  expect(onEnd).not.toHaveBeenCalled();
  expect(result.current.running).toBe(false);
});

test('background throttling: ends on wall-clock time', () => {
  const onEnd = vi.fn();
  const { result } = renderHook(() => useCountdown(onEnd));
  act(() => result.current.start(1800));
  vi.setSystemTime(Date.now() + 1800_000);
  tick(250);
  expect(result.current.ended).toBe(true);
  expect(onEnd).toHaveBeenCalledTimes(1);
});

test('fires end on time even if the repeating tick never runs (background throttling)', () => {
  const onEnd = vi.fn();
  const spy = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 0 as unknown as ReturnType<typeof setInterval>);
  const { result } = renderHook(() => useCountdown(onEnd));
  act(() => result.current.start(10));
  tick(10_000);
  spy.mockRestore();
  expect(onEnd).toHaveBeenCalledTimes(1);
  expect(result.current.ended).toBe(true);
});
