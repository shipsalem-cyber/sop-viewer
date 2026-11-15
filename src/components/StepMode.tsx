import { useEffect, useState } from 'react';
import { formatClock, parseDuration } from '../lib/duration';
import type { Sop, Step } from '../lib/types';
import { useCountdown } from '../lib/useCountdown';

type Props = {
  sop: Sop;
  onExit(): void;
  onTimerStart?(): void;
  onTimerEnd?(step: Step, index: number): void;
};

export function StepMode({ sop, onExit, onTimerStart, onTimerEnd }: Props) {
  const [index, setIndex] = useState(0);
  const step = sop.steps[index];
  const seconds = step ? parseDuration(step.duration) : null;
  const timer = useCountdown(() => onTimerEnd?.(sop.steps[index], index));

  // First step: show its timer, but wait for the user to press Start.
  useEffect(() => {
    if (seconds !== null) timer.reset(seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (i: number) => {
    const next = sop.steps[i];
    if (!next) return;
    setIndex(i);
    const secs = parseDuration(next.duration);
    if (secs === null) timer.stop();
    else {
      timer.start(secs);
      onTimerStart?.();
    }
  };

  const startOrResume = () => {
    if (seconds === null) return;
    if (timer.remaining > 0 && timer.remaining < seconds) timer.resume();
    else timer.start(seconds);
    onTimerStart?.();
  };

  if (!step) return null;
  const total = sop.steps.length;
  const fresh = !timer.running && !timer.ended && timer.remaining === seconds;

  return (
    <main className="step-mode">
      <div className="step-mode-top">
        <button className="btn" onClick={() => { timer.stop(); onExit(); }}>✕ Back to list</button>
        <span className="muted">{sop.title}</span>
      </div>

      <progress className="step-progress" max={total} value={index + 1} aria-hidden="true" />

      <h2 className="step-mode-title">Step {index + 1} of {total} — {step.title}</h2>
      {step.description && <p className="step-mode-desc">{step.description}</p>}

      {seconds !== null ? (
        <div className={`timer${timer.ended ? ' timer-ended' : ''}`}>
          <span className="clock" data-testid="clock" aria-live="off">{formatClock(timer.remaining)}</span>
          <div className="timer-buttons">
            {timer.running ? (
              <button className="btn" onClick={timer.pause}>Pause</button>
            ) : timer.ended ? null : (
              <button className="btn btn-primary" onClick={startOrResume}>{fresh ? 'Start timer' : 'Resume'}</button>
            )}
            {!fresh && <button className="btn" onClick={() => timer.reset(seconds)}>Reset</button>}
          </div>
        </div>
      ) : (
        step.duration && <p className="muted">{step.duration}</p>
      )}

      <nav className="step-nav">
        <button className="btn btn-lg" disabled={index === 0} onClick={() => goTo(index - 1)} aria-label="Back">◀ Back</button>
        <button className="btn btn-lg btn-primary" disabled={index === total - 1} onClick={() => goTo(index + 1)} aria-label="Next">Next ▶</button>
      </nav>
    </main>
  );
}
