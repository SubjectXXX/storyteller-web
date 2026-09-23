import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
import { IMAGE_CAROUSEL_FIXTURE } from '@/api-client';
import { ImageCarousel } from './ImageCarousel';

expect.extend({ toHaveNoViolations });

describe('ImageCarousel accessibility', () => {
  it('passes axe when populated', async () => {
    const { container } = render(<ImageCarousel assets={IMAGE_CAROUSEL_FIXTURE} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes axe when empty', async () => {
    const { container } = render(<ImageCarousel assets={[]} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});