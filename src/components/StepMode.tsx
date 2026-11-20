import { useEffect, useState } from 'react';
import { formatClock, parseDuration } from '../lib/duration';
import { stepScreens } from '../lib/recipe';
import type { Sop, Step } from '../lib/types';
import { useCountdown } from '../lib/useCountdown';

/** Seconds to time this step for, or null when it has no usable (positive) duration. */
function timedSeconds(duration: string): number | null {
  const s = parseDuration(duration);
  return s !== null && s > 0 ? s : null;
}

type Props = {
  sop: Sop;
  onExit(): void;
  onTimerStart?(): void;
  onTimerEnd?(step: Step, index: number): void;
};

export function StepMode({ sop, onExit, onTimerStart, onTimerEnd }: Props) {
  const screens = stepScreens(sop.steps);
  const [index, setIndex] = useState(0);
  const screen = screens[index];
  const step = screen?.step;
  const seconds = step ? timedSeconds(step.duration) : null;
  // index is the position among steps, so "Step {index + 1}" messages match the screen.
  const timer = useCountdown(() => { if (screens[index]) onTimerEnd?.(screens[index].step, index); });

  // First step: show its timer, but wait for the user to press Start.
  useEffect(() => {
    if (seconds !== null) timer.reset(seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (i: number) => {
    const next = screens[i]?.step;
    if (!next) return;
    setIndex(i);
    const secs = timedSeconds(next.duration);
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

  if (!screen || !step) return null;
  const total = screens.length;
  const fresh = !timer.running && !timer.ended && timer.remaining === seconds;

  return (
    <main className="step-mode">
      <div className="step-mode-top">
        <button className="btn" onClick={() => { timer.stop(); onExit(); }}>✕ Back to list</button>
        <span className="muted">{sop.title}</span>
      </div>

      <progress className="step-progress" max={total} value={index + 1} aria-hidden="true" />

      <h2 className="step-mode-title">Step {index + 1} of {total} — {step.title}</h2>
      {screen.needs.length > 0 && (
        <section className="needs" aria-label="You'll need">
          <h3>You'll need</h3>
          <ul>
            {screen.needs.map((n) => (
              <li key={n.id}>{n.description.trim() ? `${n.title} — ${n.description}` : n.title}</li>
            ))}
          </ul>
        </section>
      )}
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
