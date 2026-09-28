import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pill } from './Pill';

describe('Pill', () => {
  it('hugs its label so a column flex parent cannot stretch it', () => {
    render(
      <Pill intent="muted" title="Local-dev top-up">
        Local top-up
      </Pill>,
    );
    const pill = screen.getByText('Local top-up');
    expect(pill.style.width).toBe('fit-content');
  });
});
