import { act, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';

async function openStepMode() {
  render(<App />);
  const file = new File([JSON.stringify([{ Title: 'Mix', Duration: '2 s' }, { Title: 'Rest', Duration: '1 s' }])], 'Bread.json');
  const input = screen.getByLabelText('Import Excel/JSON');
  await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
  await screen.findByText('Mix');
  fireEvent.click(screen.getByRole('button', { name: /Start step-by-step/ }));
  vi.useFakeTimers();
}

beforeEach(() => { document.title = 'SOP Viewer'; });
afterEach(() => vi.useRealTimers());

test('timer end shows alert; dismiss clears it and restores title', async () => {
  await openStepMode();
  fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
  act(() => { vi.advanceTimersByTime(2000); });
  expect(screen.getByRole('alert')).toHaveTextContent('Step 1 — Mix is done');
  act(() => { vi.advanceTimersByTime(1000); });
  expect(document.title).toBe('⏰ Done');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(document.title).toBe('SOP Viewer');
});

test('leaving step mode clears the alert', async () => {
  await openStepMode();
  fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
  act(() => { vi.advanceTimersByTime(2000); });
  fireEvent.click(screen.getByRole('button', { name: /Back to list/ }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(document.title).toBe('SOP Viewer');
});

test('moving to next step clears the previous alert', async () => {
  await openStepMode();
  fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
  act(() => { vi.advanceTimersByTime(2000); });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.queryByRole('alert')).toBeNull();
  act(() => { vi.advanceTimersByTime(1000); });
  expect(screen.getByRole('alert')).toHaveTextContent('Step 2 — Rest is done');
});

test('importing a new file while the alarm rings stops it', async () => {
  await openStepMode();
  fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
  act(() => { vi.advanceTimersByTime(3000); });
  expect(document.title).toBe('⏰ Done');
  vi.useRealTimers();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const file = new File([JSON.stringify([{ Title: 'Other' }])], 'Other.json');
  await act(async () => { fireEvent.change(screen.getByLabelText('Import Excel/JSON'), { target: { files: [file] } }); });
  await screen.findByText('Other');
  expect(document.title).toBe('SOP Viewer');
  expect(screen.queryByRole('alert')).toBeNull();
});
