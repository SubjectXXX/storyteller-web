/**
 * Vitest setup — environment repairs that every spec needs.
 *
 * Why this file exists
 * --------------------
 * Node 22+ exposes a built-in `localStorage` global backed by the
 * `--localstorage-file` flag. Without that flag the getter exists but
 * returns `undefined`, and because it is defined on `globalThis` it
 * SHADOWS the `localStorage` happy-dom installs for the `happy-dom`
 * environment. Specs that touch the session token store then die with:
 *
 *   TypeError: Cannot read properties of undefined (reading 'removeItem')
 *
 * or read back `null` where a token was expected. This file re-installs a
 * working in-memory Storage when the ambient global is unusable, and is a
 * no-op on Node builds without the built-in.
 *
 * It is deliberately separate from `src/test/setup.axe.ts`, which imports
 * `vitest-axe`. That package is declared in package.json but is not
 * actually installed, so importing it would break every suite in the repo
 * rather than just the accessibility ones. Wiring the two together is left
 * to whoever fixes that dependency.
 */

/** Minimal in-memory `Storage` used only when the ambient one is broken. */
function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();

  return {
    get length(): number {
      return entries.size;
    },
    key(index: number): string | null {
      return [...entries.keys()][index] ?? null;
    },
    getItem(key: string): string | null {
      return entries.has(key) ? (entries.get(key) as string) : null;
    },
    setItem(key: string, value: string): void {
      entries.set(String(key), String(value));
    },
    removeItem(key: string): void {
      entries.delete(key);
    },
    clear(): void {
      entries.clear();
    },
  } as Storage;
}

/** True when the ambient `localStorage` is present and actually usable. */
function isUsable(storage: unknown): storage is Storage {
  if (storage === null || typeof storage !== 'object') {
    return false;
  }

  try {
    const candidate = storage as Storage;
    candidate.setItem('__probe__', '1');
    candidate.removeItem('__probe__');
    return typeof candidate.getItem === 'function';
  } catch {
    return false;
  }
}

if (!isUsable(globalThis.localStorage)) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}

// Each spec must start from a clean token store, or a token written by one
// spec leaks into the next and makes auth assertions order-dependent.
if (typeof beforeEach === 'function') {
  beforeEach(() => {
    globalThis.localStorage?.clear();
  });
}
