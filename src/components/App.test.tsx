import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  return { user, upload: (f: File | File[]) => user.upload(input(), f) };
}

afterEach(() => vi.restoreAllMocks());

test('shows empty state before import', () => {
  setup();
  expect(screen.getByText(/drop files anywhere/i)).toBeInTheDocument();
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
  expect(screen.getByText('Bread.json: These columns will not be included in downloads: Image')).toBeInTheDocument();
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

// Ingredients
const mixed = [
  { Type: 'Ingredient', Title: 'Coffee', Description: '18 g' },
  { Type: 'Step', Step: 1, Title: 'Grind', Duration: '30 sec' },
  { Type: 'Ingredient', Title: 'Water', Description: '250 ml' },
  { Type: 'Step', Step: 2, Title: 'Brew', Duration: '3 min' },
];

test('ingredient rows show without numbers; steps numbered 1..n', async () => {
  const { upload } = setup();
  await upload(jsonFile(mixed, 'Pour-over.json'));
  expect(rowTitles()).toEqual(['Coffee', 'Grind', 'Water', 'Brew']);
  expect(screen.getByRole('button', { name: 'Edit ingredient 2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit step 2' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit step 3' })).toBeNull();
  expect(screen.getByText('Total: 3m 30s')).toBeInTheDocument();
});

test('ingredients summary lists name and amount', async () => {
  const { upload } = setup();
  await upload(jsonFile(mixed, 'Pour-over.json'));
  const box = screen.getByRole('region', { name: 'Ingredients' });
  expect(within(box).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Coffee — 18 g', 'Water — 250 ml']);
});

test('no ingredients summary without ingredients', async () => {
  const { upload } = setup();
  await upload(jsonFile(three));
  expect(screen.queryByRole('region', { name: 'Ingredients' })).toBeNull();
});

test('add ingredient opens Name/Amount editor without Duration', async () => {
  const { user, upload } = setup();
  await upload(jsonFile(three));
  await user.click(screen.getByRole('button', { name: '+ Add ingredient' }));
  expect(screen.getByLabelText('Name')).toHaveValue('New ingredient');
  expect(screen.getByLabelText('Amount')).toBeInTheDocument();
  expect(screen.queryByLabelText('Duration')).toBeNull();
});

test('switching a step to ingredient renumbers', async () => {
  const { user, upload } = setup();
  await upload(jsonFile(three));
  await user.click(screen.getByRole('button', { name: 'Edit step 1' }));
  await user.click(screen.getByRole('radio', { name: 'Ingredient' }));
  expect(screen.getByRole('button', { name: 'Edit ingredient 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit step 2' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit step 3' })).toBeNull();
});

// Review Focus 4
test('ingredients only: step-by-step disabled, download works', async () => {
  const spy = vi.spyOn(exportSop, 'downloadFile').mockImplementation(() => {});
  const { user, upload } = setup();
  await upload(jsonFile([{ Type: 'Ingredient', Title: 'Salt', Description: '1 tsp' }]));
  expect(screen.getByRole('button', { name: /Start step-by-step/ })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: /Download/ }));
  await user.click(screen.getByRole('menuitem', { name: 'JSON' }));
  expect(JSON.parse(spy.mock.calls[0][0] as string)[0]).toMatchObject({ Type: 'Ingredient', Title: 'Salt' });
});

test('unrecognised Type values are flagged in the notice', async () => {
  const { upload } = setup();
  await upload(jsonFile([{ Type: 'Prep', Title: 'A' }, { Type: 'Cook', Title: 'B' }]));
  expect(screen.getByText('Bread.json: Type values not recognised (treated as Step): Prep, Cook')).toBeInTheDocument();
});

test('empty-state hint lists the Type column', () => {
  setup();
  expect(screen.getByText('Columns: Type · Step · Title · Description · Duration')).toBeInTheDocument();
});

// ---- Recipe library ----

const recipeTitles = () =>
  within(screen.getByRole('list', { name: 'Recipe list' })).queryAllByRole('button').map((b) => b.textContent);
const openTitle = () => (screen.getByLabelText('SOP title') as HTMLInputElement).value;
const bread = (stepTitle = 'Mix') => jsonFile([{ Title: stepTitle }], 'Bread.json');
const coffee = () => jsonFile([{ Title: 'Brew' }], 'Coffee.json');

test('importing two files lists both A–Z and opens the first imported', async () => {
  const { upload } = setup();
  await upload([coffee(), bread()]);
  expect(recipeTitles()).toEqual(['Bread', 'Coffee']);
  expect(openTitle()).toBe('Coffee');
  expect(screen.getByRole('heading', { name: 'Recipes (2)' })).toBeInTheDocument();
});

test('a later import adds instead of replacing', async () => {
  const confirm = vi.spyOn(window, 'confirm');
  const { upload } = setup();
  await upload(bread());
  await upload(coffee());
  expect(recipeTitles()).toEqual(['Bread', 'Coffee']);
  expect(confirm).not.toHaveBeenCalled();
});

test('same title asks to replace; Cancel keeps the current one', async () => {
  const { upload } = setup();
  await upload(bread('Mix'));
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await upload(bread('Knead'));
  expect(confirm).toHaveBeenCalledWith('Replace "Bread"? OK replaces it, Cancel keeps the current one.');
  expect(rowTitles()).toEqual(['Mix']);
  confirm.mockReturnValue(true);
  await upload(bread('Knead'));
  expect(rowTitles()).toEqual(['Knead']);
  expect(recipeTitles()).toEqual(['Bread']);
});

test('same title twice in one drop asks once', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const { upload } = setup();
  await upload([bread('Mix'), bread('Knead')]);
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(recipeTitles()).toEqual(['Bread']);
  expect(rowTitles()).toEqual(['Knead']);
});

test('one bad file does not block the others', async () => {
  const { upload } = setup();
  await upload([bread(), new File(['a,b'], 'notes.csv')]);
  expect(recipeTitles()).toEqual(['Bread']);
  expect(screen.getByRole('alert').textContent).toMatch(/^Couldn't import: notes\.csv — /);
});

test('edits survive switching and reload', async () => {
  const { user, upload } = setup();
  await upload([bread(), coffee()]);
  await user.click(screen.getByRole('button', { name: 'Bread' }));
  await user.click(screen.getByRole('button', { name: 'Edit step 1' }));
  const title = screen.getByLabelText('Title');
  await user.clear(title);
  await user.type(title, 'Proof');
  await user.click(screen.getByRole('button', { name: 'Coffee' }));
  expect(rowTitles()).toEqual(['Brew']);
  await user.click(screen.getByRole('button', { name: 'Bread' }));
  expect(rowTitles()).toEqual(['Proof']);

  cleanup();
  render(<App />);
  expect(openTitle()).toBe('Bread');
  expect(rowTitles()).toEqual(['Proof']);
  expect(recipeTitles()).toEqual(['Bread', 'Coffee']);
});

test('search filters the list', async () => {
  const { user, upload } = setup();
  await upload([bread(), coffee()]);
  await user.type(screen.getByLabelText('Search recipes'), 'co');
  expect(recipeTitles()).toEqual(['Coffee']);
});

test('remove recipe confirms and opens the next', async () => {
  const { user, upload } = setup();
  await upload([coffee(), bread()]);
  await user.click(screen.getByRole('button', { name: 'Bread' }));
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  await user.click(screen.getByRole('button', { name: 'Remove recipe' }));
  expect(confirm).toHaveBeenCalledWith('Remove "Bread" from this device?');
  expect(recipeTitles()).toEqual(['Coffee']);
  expect(openTitle()).toBe('Coffee');
});

test('clear all confirms and returns to the empty state', async () => {
  const { user, upload } = setup();
  await upload([coffee(), bread()]);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  await user.click(screen.getByRole('button', { name: 'Clear all' }));
  expect(confirm).toHaveBeenCalledWith("Remove all 2 recipes from this device? This can't be undone.");
  expect(screen.getByText(/drop files anywhere/i)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('sop-viewer.library')!).recipes).toEqual([]);
});

test('step-by-step hides the library controls and ignores dropped files', async () => {
  const { user, upload } = setup();
  await upload(bread());
  await user.click(screen.getByRole('button', { name: /Start step-by-step/ }));
  expect(screen.queryByRole('navigation', { name: 'Recipes' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Import Excel/JSON')).not.toBeInTheDocument();

  const drop = new Event('drop', { cancelable: true });
  Object.defineProperty(drop, 'dataTransfer', { value: { types: ['Files'], files: [coffee()] } });
  fireEvent(window, drop);
  expect(drop.defaultPrevented).toBe(true);

  await user.click(screen.getByRole('button', { name: '✕ Back to list' }));
  expect(recipeTitles()).toEqual(['Bread']);
  expect(screen.getByLabelText('Import Excel/JSON')).toBeInTheDocument();
});

test('save failure shows once', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
  const { user, upload } = setup();
  await upload(bread());
  await user.type(screen.getByLabelText('SOP title'), 'ab');
  expect(screen.getAllByText("Recipes won't be remembered on this device.")).toHaveLength(1);
});

test('corrupt saved data shows notice', () => {
  localStorage.setItem('sop-viewer.library', '{oops');
  setup();
  expect(screen.getByText("Saved recipes couldn't be read and were cleared.")).toBeInTheDocument();
  expect(screen.getByText(/drop files anywhere/i)).toBeInTheDocument();
});

test('empty state offers example downloads', async () => {
  const spy = vi.spyOn(exportSop, 'downloadFile').mockImplementation(() => {});
  const { user } = setup();
  expect(screen.getByText('Import one or more Excel or JSON files')).toBeInTheDocument();
  expect(screen.getByText('Not sure how to set up a file? Download an example:')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Download Pour-over Coffee as Excel' }));
  expect(spy.mock.calls[0].slice(1)).toEqual(['Pour-over Coffee.xlsx', exportSop.XLSX_MIME]);
  await user.click(screen.getByRole('button', { name: 'Download Sourdough as JSON' }));
  expect(spy.mock.calls[1].slice(1)).toEqual(['Sourdough.json', 'application/json']);
  expect(screen.getByText(/drop files anywhere/i)).toBeInTheDocument();
});
