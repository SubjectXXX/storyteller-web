/**
 * `<Typewriter>` — animated text reveal that respects the player's
 * `prefers-reduced-motion` setting from `useSettings()`.
 *
 * The component is a thin wrapper over the user's text buffer: it
 * accepts the full text and renders it one character (or chunk) at a
 * time. When `prefersReducedMotion` is true, the entire text renders in
 * one frame so screen-reader users and motion-sensitive players see the
 * final state immediately.
 *
 * The component is presentation-only: it does not own the source text
 * (parents pass it via `text`) and it does not call `onComplete`. Pages
 * that need to know when the reveal finishes can derive that from
 * `text.length === displayedLength`.
 */
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';

export interface TypewriterProps {
  /**
   * The full text to reveal. When this changes the component restarts
   * the reveal from the first character (i.e. a new turn replaces the
   * previous narration cleanly).
   */
  readonly text: string;
  /** Characters per tick. Defaults to 1 (per-character reveal). */
  readonly charsPerTick?: number;
  /** Milliseconds between ticks. Defaults to 18. */
  readonly intervalMs?: number;
  /**
   * Override the reduced-motion check. When `true` the component skips
   * the animation and renders the full text immediately. Defaults to
   * reading `settings.reduced_motion`.
   */
  readonly forceInstant?: boolean;
  /** Optional aria-label override. Defaults to the text content. */
  readonly ariaLabel?: string;
  /**
   * Element used to render the reveal. Defaults to `<span>` so the
   * component can be dropped inline; pages that need a block element
   * can pass `"p"` or `"div"`.
   */
  readonly as?: 'span' | 'p' | 'div';
}

export function Typewriter({
  text,
  charsPerTick = 1,
  intervalMs = 18,
  forceInstant,
  ariaLabel,
  as = 'span',
}: TypewriterProps): ReactElement {
  const settingsQuery = useSettings();
  const reducedMotion = forceInstant ?? settingsQuery.data?.reduced_motion ?? false;
  const [displayedLength, setDisplayedLength] = useState<number>(
    reducedMotion ? text.length : 0,
  );

  // Track the previous text so we can detect a "new turn" reset. We
  // intentionally use a ref instead of state to avoid forcing a second
  // render when the text prop changes.
  const lastTextRef = useRef<string>(text);

  useEffect(() => {
    if (text !== lastTextRef.current) {
      lastTextRef.current = text;
      // Reset the reveal whenever the source text changes. Without this
      // a longer text appended to a shorter one would skip characters.
      if (reducedMotion) {
        setDisplayedLength(text.length);
        return;
      }
      setDisplayedLength(0);
    }

    if (reducedMotion) {
      setDisplayedLength(text.length);
      return undefined;
    }

    if (displayedLength >= text.length) {
      return undefined;
    }

    const id = window.setInterval(() => {
      setDisplayedLength((prev) => {
        if (prev >= text.length) {
          window.clearInterval(id);
          return prev;
        }
        return Math.min(prev + Math.max(1, charsPerTick), text.length);
      });
    }, Math.max(1, intervalMs));
    return () => window.clearInterval(id);
  }, [text, displayedLength, charsPerTick, intervalMs, reducedMotion]);

  const display = text.slice(0, displayedLength);
  const isComplete = displayedLength >= text.length;

  // Keep the un-revealed portion in the DOM (visually hidden) so screen
  // readers can still announce the full text and copy-paste works.
  const remaining = text.slice(displayedLength);

  const Tag = as;
  return (
    <Tag
      aria-label={ariaLabel ?? text}
      aria-busy={!isComplete}
      data-testid="typewriter"
      data-complete={isComplete}
    >
      {display}
      {remaining.length > 0 && (
        <span aria-hidden style={{ visibility: 'hidden' }}>
          {remaining}
        </span>
      )}
    </Tag>
  );
}
