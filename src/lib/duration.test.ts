import { parseDuration, formatDuration, formatClock } from './duration';

test.each([
  ['45 sec', 45], ['30s', 30], ['45 seconds', 45],
  ['5 min', 300], ['5m', 300], ['10 minutes', 600],
  ['1h 30m', 5400], ['1 hr 15 min 20 sec', 4520], ['2 hours', 7200],
  ['1.5 h', 5400],
  ['01:30', 90], ['1:02:30', 3750],
  ['10', 600], ['  5 MIN ', 300],
] as const)('parseDuration(%j) = %i', (txt, secs) => expect(parseDuration(txt)).toBe(secs));

test.each(['', '   ', '5-10 min', 'about 1 hour', 'soon', '1:99'])(
  'parseDuration(%j) is null', (txt) => expect(parseDuration(txt)).toBeNull());

test('formatDuration', () => {
  expect(formatDuration(45)).toBe('45s');
  expect(formatDuration(90)).toBe('1m 30s');
  expect(formatDuration(600)).toBe('10m');
  expect(formatDuration(6300)).toBe('1h 45m');
  expect(formatDuration(4520)).toBe('1h 15m 20s');
  expect(formatDuration(0)).toBe('0s');
});

test('formatClock', () => {
  expect(formatClock(45)).toBe('0:45');
  expect(formatClock(1800)).toBe('30:00');
  expect(formatClock(3750)).toBe('1:02:30');
  expect(formatClock(-3)).toBe('0:00');
});
