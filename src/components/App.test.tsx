import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import * as exportSop from '../lib/exportSop';

const jsonFile = (rows: unknown, name = 'Bread.json') => new File([JSON.stringify(rows)], name, { type: 'application/json' });
const three = [
  { Step: 1, Title: 'Mix', Duration: '10 min' },
  { Step: 2, Title: 'Rest', Duration: '30 min' },
  { Step: 3, Title: 'Shape', Duration: '45 sec' },
];
const rowTitles = () => screen.queryAllByTestId('step-title').map((el) => el.textContent);

function setup() {
  const user = userEvent.setup({ applyAccept: false });
  render(<App />);
  const input = () => screen.getByLabelText('Import Excel/JSON') as HTMLInputElement;
  return { user, upload: (f: File) => user.upload(input(), f) };
}

afterEach(() => vi.restoreAllMocks());

test('shows empty state before import', () => {
  setup();
  expect(screen.getByText(/drop a file anywhere/i)).toBeInTheDocument();
});

test('importing JSON lists steps in order with total', async () => {
  const { upload } = setup();
  await upload(jsonFile(three));
  expect(rowTitles()).toEqual(['Mix', 'Rest', 'Shape']);
  expect(screen.getByText('Total: 40m 45s')).toBeInTheDocument();
  expect(screen.getByLabelText('SOP title')).toHaveValue('Bread');
});

test('ignored columns notice', async () => {
  const { upload } = setup();
  await upload(jsonFile([{ Title: 'A', Image: 'x.png' }]));
  expect(screen.getByText('These columns will not be included in downloads: Image')).toBeInTheDocument();
});

test('unsupported file keeps current SOP', async () => {
  const { upload } = setup();
  await upload(jsonFile(three));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await upload(new File(['a,b'], 'notes.csv'));
  expect(screen.getByRole('alert')).toHaveTextContent('Unsupported file type');
  expect(rowTitles()).toEqual(['Mix', 'Rest', 'Shape']);
});

test('malformed JSON shows error', async () => {
  const { upload } = setup();
  await upload(new File(['{oops'], 'x.json'));
  expect(screen.getByRole('alert')).toHaveTextContent("This JSON file couldn't be read.");
});

test('replace confirm: cancel keeps, ok replaces', async () => {
  const { upload } = setup();
  await upload(jsonFile(three));
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await upload(jsonFile([{ Title: 'Other' }], 'Other.json'));
  expect(confirm).toHaveBeenCalledWith('Replace the current SOP? Unsaved changes will be lost.');
  expect(rowTitles()).toEqual(['Mix', 'Rest', 'Shape']);
  confirm.mockReturnValue(true);
  await upload(jsonFile([{ Title: 'Other' }], 'Other.json'));
  expect(rowTitles()).toEqual(['Other']);
});

test('edit a step title', async () => {
  const { user, upload } = setup();
  await upload(jsonFile(three));
  await user.click(screen.getByRole('button', { name: 'Edit step 2' }));
  const title = screen.getByLabelText('Title');
  await user.clear(title);
  await user.type(title, 'Proof');
  expect(rowTitles()).toEqual(['Mix', 'Proof', 'Shape']);
});

test('unparseable duration hint', async () => {
  const { user, upload } = setup();
  await upload(jsonFile(three));
  await user.click(screen.getByRole('button', { name: 'Edit step 1' }));
  const d = screen.getByLabelText('Duration');
  await user.clear(d);
  await user.type(d, '5-10 min');
  expect(screen.getByText("won't be timed")).toBeInTheDocument();
});

test('add step opens its editor', async () => {
  const { user, upload } = setup();
  await upload(jsonFile(three));
  await user.click(screen.getByRole('button', { name: '+ Add step' }));
  expect(rowTitles()).toEqual(['Mix', 'Rest', 'Shape', 'New step']);
  expect(screen.getByLabelText('Title')).toHaveValue('New step');
});

test('deleting all steps disables step-by-step', async () => {
  const { user, upload } = setup();
  await upload(jsonFile([{ Title: 'Only' }]));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  expect(screen.getByRole('button', { name: /Start step-by-step/ })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Edit step 1' }));
  await user.click(screen.getByRole('button', { name: 'Delete step' }));
  expect(rowTitles()).toEqual([]);
  expect(screen.getByRole('button', { name: /Start step-by-step/ })).toBeDisabled();
});

test('download JSON', async () => {
  const spy = vi.spyOn(exportSop, 'downloadFile').mockImplementation(() => {});
  const { user, upload } = setup();
  await upload(jsonFile(three));
  await user.click(screen.getByRole('button', { name: /Download/ }));
  await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'JSON' }));
  expect(spy).toHaveBeenCalledTimes(1);
  const [text, name, mime] = spy.mock.calls[0];
  expect(name).toBe('Bread.json');
  expect(mime).toBe('application/json');
  expect(JSON.parse(text as string).map((r: { Title: string }) => r.Title)).toEqual(['Mix', 'Rest', 'Shape']);
});

test('download Excel', async () => {
  const spy = vi.spyOn(exportSop, 'downloadFile').mockImplementation(() => {});
  const { user, upload } = setup();
  await upload(jsonFile(three));
  await user.click(screen.getByRole('button', { name: /Download/ }));
  await user.click(screen.getByRole('menuitem', { name: 'Excel (.xlsx)' }));
  expect(spy.mock.calls[0][1]).toBe('Bread.xlsx');
});
