/**
 * `<ImageCarousel>` — horizontal scroll-snap gallery of every image the
 * Stage 6 visual worker has produced for the active adventure. The
 * carousel is read-only and renders nothing when the list is empty.
 *
 * Accessibility:
 *  - the carousel is keyboard-navigable: left/right arrows move the
 *    focused slide by one, Home/End jump to the ends. Focus
 *    indicators ride on the underlying scroll-snap so a focused
 *    thumbnail is always visible.
 *  - each slide exposes an `aria-label` derived from the image alt
 *    text so screen readers announce the asset rather than the URL.
 *  - the surrounding `<section>` carries an `aria-roledescription`
 *    of "carousel" so the assistive tech announces the role
 *    correctly.
 */
import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import type { ImageAsset } from '@/api-client';
import { EmptyState } from '@/ui/EmptyState';

export interface ImageCarouselProps {
  readonly assets: ReadonlyArray<ImageAsset>;
  readonly title?: string;
  /**
   * Optional id surfaced on the section element so panels can target
   * it from integration tests.
   */
  readonly sectionId?: string;
}

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  width: '100%',
};

const scrollerStyle: CSSProperties = {
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: 'minmax(220px, 1fr)',
  gap: 'var(--space-3)',
  overflowX: 'auto',
  scrollSnapType: 'x mandatory',
  padding: 'var(--space-2)',
  // Make sure focus rings are not clipped by the scroll container.
  scrollPadding: 'var(--space-2)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
};

const slideStyle: CSSProperties = {
  scrollSnapAlign: 'start',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
  padding: 'var(--space-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  minHeight: 'var(--control-touch-min)',
};

const figureStyle: CSSProperties = {
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
};

const imgStyle: CSSProperties = {
  width: '100%',
  height: 'auto',
  borderRadius: 'var(--radius-sm)',
  display: 'block',
  background: 'var(--color-surface-muted)',
};

const captionStyle: CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-foreground-muted)',
  fontFamily: 'var(--font-sans)',
};

/**
 * Move keyboard focus to the slide at `index` (0-based). The
 * implementation scrolls the slide into view via `scrollIntoView`
 * so a focused slide on the right edge becomes visible.
 */
function focusSlide(scroller: HTMLDivElement | null, index: number): void {
  if (!scroller) return;
  const slides = scroller.querySelectorAll<HTMLElement>('[data-image-slide]');
  const target = slides.item(index);
  if (target) {
    target.scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'smooth' });
    target.focus();
  }
}

export function ImageCarousel({
  assets,
  title = 'Image gallery',
  sectionId,
}: ImageCarouselProps): ReactElement {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const slides = scroller.querySelectorAll<HTMLElement>('[data-image-slide]');
    if (slides.length === 0) return;
    const focused = slides.item(Array.from(slides).indexOf(document.activeElement as HTMLElement));
    const currentIndex = focused ? Array.from(slides).indexOf(focused) : 0;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = Math.min(slides.length - 1, currentIndex + 1);
    } else if (event.key === 'ArrowLeft') {
      nextIndex = Math.max(0, currentIndex - 1);
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = slides.length - 1;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      focusSlide(scroller, nextIndex);
    }
  }, []);

  // Reset scroll position when the assets array reference changes so
  // navigating to a new adventure starts at the first image.
  useEffect(() => {
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [assets]);

  if (assets.length === 0) {
    return (
      <EmptyState
        title="No images yet"
        description="The visual worker has not generated any artwork for this adventure. Generate one from the latest turn to see it here."
      />
    );
  }

  return (
    <section
      id={sectionId}
      data-testid="image-carousel"
      aria-roledescription="carousel"
      aria-label={title}
      style={sectionStyle}
    >
      <div
        ref={scrollerRef}
        role="group"
        aria-label={`${title} — use left/right arrow keys to navigate`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={scrollerStyle}
      >
        {assets.map((asset, index) => (
          <figure
            key={asset.id}
            data-image-slide
            data-testid={`image-slide-${index}`}
            tabIndex={0}
            aria-label={`${asset.alt} (${index + 1} of ${assets.length})`}
            aria-roledescription="slide"
            style={slideStyle}
          >
            <img
              src={asset.url}
              alt={asset.alt}
              width={asset.width}
              height={asset.height}
              loading="lazy"
              style={imgStyle}
              draggable={false}
            />
            <figcaption style={captionStyle} aria-hidden>
              {asset.width}×{asset.height}
            </figcaption>
          </figure>
        ))}
      </div>
      <p style={captionStyle} aria-live="polite">
        Showing {assets.length} image{assets.length === 1 ? '' : 's'}
      </p>
    </section>
  );
}