type Perm = NotificationPermission;

function stubNotification(permission: Perm) {
  const created: { title: string; body?: string }[] = [];
  class FakeNotification {
    static permission: Perm = permission;
    static requestPermission = vi.fn(async () => FakeNotification.permission);
    constructor(title: string, opts?: { body?: string }) {
      created.push({ title, body: opts?.body });
    }
  }
  vi.stubGlobal('Notification', FakeNotification);
  return { FakeNotification, created };
}

// notify.ts keeps "already asked" state per page load, so load a fresh copy per test.
const load = async () => {
  vi.resetModules();
  return import('./notify');
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('requestPermissionOnce asks only once when undecided', async () => {
  const { FakeNotification } = stubNotification('default');
  const { requestPermissionOnce } = await load();
  requestPermissionOnce();
  requestPermissionOnce();
  expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
});

test('requestPermissionOnce does not ask when denied', async () => {
  const { FakeNotification } = stubNotification('denied');
  const { requestPermissionOnce } = await load();
  requestPermissionOnce();
  expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
});

test('requestPermissionOnce without Notification support does not throw', async () => {
  vi.stubGlobal('Notification', undefined);
  const { requestPermissionOnce, showSystemNotification } = await load();
  expect(() => requestPermissionOnce()).not.toThrow();
  expect(() => showSystemNotification('x')).not.toThrow();
});

test('showSystemNotification when granted', async () => {
  const { created } = stubNotification('granted');
  const { showSystemNotification } = await load();
  showSystemNotification('Step 1 — Mix is done');
  expect(created).toEqual([{ title: 'Timer done', body: 'Step 1 — Mix is done' }]);
});

test('showSystemNotification silent when denied', async () => {
  const { created } = stubNotification('denied');
  const { showSystemNotification } = await load();
  showSystemNotification('x');
  expect(created).toEqual([]);
});

test('startTitleFlash toggles and restores', async () => {
  vi.useFakeTimers();
  const { startTitleFlash } = await load();
  document.title = 'SOP Viewer';
  const stop = startTitleFlash('SOP Viewer');
  vi.advanceTimersByTime(1000);
  expect(document.title).toBe('⏰ Done');
  vi.advanceTimersByTime(1000);
  expect(document.title).toBe('SOP Viewer');
  vi.advanceTimersByTime(1000);
  stop();
  expect(document.title).toBe('SOP Viewer');
});

test('startAlarm without AudioContext is a no-op', async () => {
  vi.stubGlobal('AudioContext', undefined);
  const { startAlarm } = await load();
  const stop = startAlarm();
  expect(() => stop()).not.toThrow();
});

function stubAudio() {
  const made: { resume: ReturnType<typeof vi.fn>; suspend: ReturnType<typeof vi.fn> }[] = [];
  class FakeCtx {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    resume = vi.fn(async () => { this.state = 'running'; });
    suspend = vi.fn(async () => {});
    close = vi.fn(async () => {});
    constructor() { made.push(this); }
    createOscillator() { return { frequency: {}, connect: (n: unknown) => n, start() {}, stop() {} }; }
    createGain() {
      const g = { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n: unknown) => n };
      return g;
    }
  }
  vi.stubGlobal('AudioContext', FakeCtx);
  return made;
}

test('primeAudio unlocks one shared context that startAlarm reuses', async () => {
  const made = stubAudio();
  const { primeAudio, startAlarm } = await load();
  primeAudio();
  expect(made).toHaveLength(1);
  expect(made[0].resume).toHaveBeenCalled();
  const stop = startAlarm();
  expect(made).toHaveLength(1);
  stop();
});
