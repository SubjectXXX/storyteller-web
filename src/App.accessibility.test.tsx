import axe from 'axe-core';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(cleanup);

describe.each(['/', '/setup', '/play', '/settings', '/wallet'])('axe fixture route %s', (route) => {
  it('has no detectable accessibility violations', async () => {
    window.history.replaceState({}, '', route);
    const { container } = render(<App />);
    const results = await axe.run(container, { rules: { region: { enabled: false }, 'color-contrast': { enabled: false } } });
    expect(results.violations, results.violations.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
  });
});
