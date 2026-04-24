import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getExtensionStorageValue,
  removeExtensionStorageValue,
  setExtensionStorageValue,
} from './extension-storage';

describe('extension-storage fallback', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
      },
      configurable: true,
      writable: true,
    });

    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
      storage: {
        local: {
          get: vi.fn(async () => {
            throw new Error('Access to storage is not allowed from this context.');
          }),
          set: vi.fn(async () => {
            throw new Error('Access to storage is not allowed from this context.');
          }),
          remove: vi.fn(async () => {
            throw new Error('Access to storage is not allowed from this context.');
          }),
        },
      },
    };
  });

  it('does not fall back to page localStorage when extension storage access is denied', async () => {
<<<<<<<< HEAD:archive/ts-legacy/apps/hypercode-extension/pages/content/src/stores/extension-storage.test.ts
    localStorage.setItem('hypercode-key', 'legacy-value');

    await expect(getExtensionStorageValue('hypercode-key')).resolves.toBeNull();

    await setExtensionStorageValue('hypercode-key', 'next-value');
    expect(localStorage.getItem('hypercode-key')).toBe('legacy-value');

    await removeExtensionStorageValue('hypercode-key');
    expect(localStorage.getItem('hypercode-key')).toBe('legacy-value');
========
    localStorage.setItem('borg-key', 'legacy-value');

    await expect(getExtensionStorageValue('borg-key')).resolves.toBeNull();

    await setExtensionStorageValue('borg-key', 'next-value');
    expect(localStorage.getItem('borg-key')).toBe('legacy-value');

    await removeExtensionStorageValue('borg-key');
    expect(localStorage.getItem('borg-key')).toBe('legacy-value');
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/borg-extension/pages/content/src/stores/extension-storage.test.ts

    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('falls back to localStorage when extension storage is unavailable entirely', async () => {
    delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome;
<<<<<<<< HEAD:archive/ts-legacy/apps/hypercode-extension/pages/content/src/stores/extension-storage.test.ts
    localStorage.setItem('hypercode-key', 'legacy-value');

    await expect(getExtensionStorageValue('hypercode-key')).resolves.toBe('legacy-value');

    await setExtensionStorageValue('hypercode-key', 'next-value');
    expect(localStorage.getItem('hypercode-key')).toBe('next-value');

    await removeExtensionStorageValue('hypercode-key');
    expect(localStorage.getItem('hypercode-key')).toBeNull();
========
    localStorage.setItem('borg-key', 'legacy-value');

    await expect(getExtensionStorageValue('borg-key')).resolves.toBe('legacy-value');

    await setExtensionStorageValue('borg-key', 'next-value');
    expect(localStorage.getItem('borg-key')).toBe('next-value');

    await removeExtensionStorageValue('borg-key');
    expect(localStorage.getItem('borg-key')).toBeNull();
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/borg-extension/pages/content/src/stores/extension-storage.test.ts

    expect(console.warn).not.toHaveBeenCalled();
  });
});
