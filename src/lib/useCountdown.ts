import { useCallback, useEffect, useRef, useState } from 'react';

const TICK_MS = 250;

export type Countdown = {
  remaining: number;
  running: boolean;
  ended: boolean;
  start(seconds: number): void;
  pause(): void;
  resume(): void;
  reset(seconds: number): void;
  stop(): void;
};

/**
 * Countdown measured against the wall clock (an end timestamp), so it stays
 * accurate when the browser throttles timers in a background tab.
 */
export function useCountdown(onEnd: () => void): Countdown {
  const [state, setState] = useState({ remaining: 0, running: false, ended: false });
  const endAt = useRef(0);
  const leftMs = useRef(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const clear = () => {
    if (interval.current !== null) clearInterval(interval.current);
    interval.current = null;
  };

  const tick = useCallback(() => {
    const ms = Math.max(0, endAt.current - Date.now());
    if (ms === 0) {
      clear();
      leftMs.current = 0;
      setState({ remaining: 0, running: false, ended: true });
      onEndRef.current();
    } else {
      setState((s) => ({ ...s, remaining: Math.ceil(ms / 1000) }));
    }
  }, []);

  const run = useCallback((ms: number) => {
    clear();
    endAt.current = Date.now() + ms;
    setState({ remaining: Math.ceil(ms / 1000), running: true, ended: false });
    interval.current = setInterval(tick, TICK_MS);
  }, [tick]);

  const start = useCallback((seconds: number) => run(seconds * 1000), [run]);

  const pause = useCallback(() => {
    if (interval.current === null) return;
    clear();
    leftMs.current = Math.max(0, endAt.current - Date.now());
    setState((s) => ({ ...s, remaining: Math.ceil(leftMs.current / 1000), running: false }));
  }, []);

  const resume = useCallback(() => {
    if (interval.current === null && leftMs.current > 0) run(leftMs.current);
  }, [run]);

  const reset = useCallback((seconds: number) => {
    clear();
    leftMs.current = seconds * 1000;
    setState({ remaining: seconds, running: false, ended: false });
  }, []);

  const stop = useCallback(() => {
    clear();
    leftMs.current = 0;
    setState({ remaining: 0, running: false, ended: false });
  }, []);

  useEffect(() => clear, []);

  return { ...state, start, pause, resume, reset, stop };
}
