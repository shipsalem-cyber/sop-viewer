import { fireEvent, render, screen } from '@testing-library/react';
import { DoneAlert } from './DoneAlert';

test('renders message as alert and dismisses', () => {
  const onDismiss = vi.fn();
  render(<DoneAlert message="Step 2 — Rest is done" onDismiss={onDismiss} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Step 2 — Rest is done');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
