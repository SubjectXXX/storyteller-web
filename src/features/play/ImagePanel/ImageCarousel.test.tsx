import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IMAGE_CAROUSEL_FIXTURE } from '@/api-client';
import { ImageCarousel } from './ImageCarousel';

describe('ImageCarousel', () => {
  it('renders one figure per asset with an aria-label', () => {
    render(<ImageCarousel assets={IMAGE_CAROUSEL_FIXTURE} />);
    const scroller = screen.getByTestId('image-carousel');
    const slides = within(scroller).getAllByRole('figure');
    expect(slides).toHaveLength(IMAGE_CAROUSEL_FIXTURE.length);
    for (const [index, asset] of IMAGE_CAROUSEL_FIXTURE.entries()) {
      expect(slides[index]).toHaveAttribute(
        'aria-label',
        `${asset.alt} (${index + 1} of ${IMAGE_CAROUSEL_FIXTURE.length})`,
      );
    }
  });

  it('renders an empty state when there are no assets', () => {
    render(<ImageCarousel assets={[]} />);
    expect(screen.getByText(/no images yet/i)).toBeInTheDocument();
  });

  it('responds to ArrowRight keyboard navigation by moving focus', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel assets={IMAGE_CAROUSEL_FIXTURE} />);
    const scroller = screen.getByTestId('image-carousel');
    const slides = within(scroller).getAllByRole('figure');
    // The scroller itself receives focus first.
    await user.click(scroller);
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(slides[1]);
  });

  it('responds to ArrowLeft to move focus to the previous slide', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel assets={IMAGE_CAROUSEL_FIXTURE} />);
    const scroller = screen.getByTestId('image-carousel');
    const slides = within(scroller).getAllByRole('figure');
    slides[2]?.focus();
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(slides[1]);
  });

  it('clamps to the first slide on ArrowLeft from the start', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel assets={IMAGE_CAROUSEL_FIXTURE} />);
    const scroller = screen.getByTestId('image-carousel');
    const slides = within(scroller).getAllByRole('figure');
    slides[0]?.focus();
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(slides[0]);
  });

  it('clamps to the last slide on ArrowRight from the end', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel assets={IMAGE_CAROUSEL_FIXTURE} />);
    const scroller = screen.getByTestId('image-carousel');
    const slides = within(scroller).getAllByRole('figure');
    const last = slides[slides.length - 1]!;
    last.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(last);
  });

  it('responds to Home/End keys', async () => {
    const user = userEvent.setup();
    render(<ImageCarousel assets={IMAGE_CAROUSEL_FIXTURE} />);
    const scroller = screen.getByTestId('image-carousel');
    const slides = within(scroller).getAllByRole('figure');
    await user.click(slides[1]!);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(slides[slides.length - 1]);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(slides[0]);
  });

  it('surfaces an aria-label on the section root', () => {
    render(<ImageCarousel assets={IMAGE_CAROUSEL_FIXTURE} title="My gallery" />);
    expect(screen.getByRole('region', { name: /my gallery/i })).toBeInTheDocument();
  });
});