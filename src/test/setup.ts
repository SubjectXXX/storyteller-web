/**
 * Vitest setup — runs before every test file.
 *
 * Registers the `vitest-axe` matchers so every `expect(...).toHaveNoViolations()`
 * call resolves to a properly-typed matcher. The file is loaded via
 * `vite.config.ts > test.setupFiles` so individual tests can call
 * `expect(...)` directly without a per-file import.
 */
import { expect } from 'vitest';
// `vitest-axe/matchers` ships a `*.d.ts` that re-exports the matcher as
// a type only, so importing it through the package entry gives us a
// `cannot be used as a value` error in TS. The runtime value lives at
// `vitest-axe/dist/matchers.js`; import the runtime directly.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- vitest-axe matchers runtime lives in dist/matchers.js
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js';

expect.extend({ toHaveNoViolations });