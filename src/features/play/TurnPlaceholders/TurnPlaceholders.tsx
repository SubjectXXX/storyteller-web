/**
 * `<TurnPlaceholders>` — the inert turn-history slots in the story column.
 *
 * Why this exists
 * ---------------
 * There is no `GET /api/adventures/{id}/turns` (or any equivalent)
 * endpoint, so the API can only ever hand the client the single live
 * turn. Without help, the story column renders exactly one card and stops
 * reading like a timeline. These entries give the column the shape of a
 * real scrollback so the layout can be judged now, before the endpoint
 * ships.
 *
 * Honesty rules (production code, not a mock-up)
 * ---------------------------------------------
 *   - No prose. No dialogue, no character names, no invented narration.
 *     A player scanning this column must never be able to mistake a
 *     placeholder for something that happened to them, so every entry
 *     carries the same neutral "not yet available" label and nothing
 *     else. The only content is the label.
 *   - No interaction. Plain `<div>`s: not focusable, not clickable, no
 *     handlers, no `role="button"`, no `tabIndex`.
 *   - No requests. Purely static; the component takes no props and calls
 *     no hooks.
 *
 * Accessibility
 * -------------
 * The surrounding markup does NOT announce this state anywhere else, so
 * the entries are *not* `aria-hidden`. They are `<li>` items inside a
 * labelled `<ul>`, which gives every entry a real accessible name
 * (its label) while keeping the group describable as a whole.
 *
 * Styling
 * -------
 * Same border / radius / padding as a real timeline card, on
 * `var(--color-surface-muted)` at reduced opacity, so the shape is
 * visible but clearly inert. Colours and type come only from the design
 * tokens; nothing here introduces a new value.
 */
import type { CSSProperties, ReactElement } from 'react';
import { Ellipsis, Hourglass } from 'lucide-react';

/** Ids are stable (not `useId`) so tests and assistive tech see a
 *  predictable string; there is one such list per page. */
const PAST_LIST_ID = 'story-turn-placeholders';
const NEXT_ID = 'story-turn-placeholder-next';

const PLACEHOLDER_LABEL = 'Earlier turn \u2014 not yet available';

const pendingReason =
  'Turn history is not available yet: the API exposes only the live turn, so earlier turns cannot be loaded.';

const listStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
};

/**
 * Card geometry mirrors `cardStyle` in `AdventurePage` (the live
 * Game Master card) so the placeholders sit in the same visual rhythm
 * as real entries; only the fill and the opacity mark them as pending.
 */
const cardStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-4) var(--space-5)',
  background: 'var(--color-surface-muted)',
  opacity: 0.55,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
};

/** Skeleton rules stand in for the prose a real entry would hold. They
 *  are decorative, so they are hidden from assistive tech. */
const skeletonLineStyle: CSSProperties = {
  height: 'var(--space-2)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-border)',
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--weight-medium)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-foreground-muted)',
};

function PlaceholderCard({ width }: { readonly width: string }): ReactElement {
  return (
    <div style={cardStyle}>
      <span style={labelRowStyle}>
        <Hourglass size={12} strokeWidth={1.75} aria-hidden="true" />
        {PLACEHOLDER_LABEL}
      </span>
      <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <span style={{ ...skeletonLineStyle, width }} />
        <span style={{ ...skeletonLineStyle, width: '70%' }} />
      </span>
    </div>
  );
}

export interface TurnPlaceholdersProps {
  /**
   * How many "earlier turn" slots to draw above the live turn. Two to
   * four is the useful band: enough to make the story column overflow
   * and prove it is the scrolling region, few enough that the live turn
   * is not pushed off screen.
   */
  readonly count?: number;
}

export function TurnPlaceholders({ count = 3 }: TurnPlaceholdersProps): ReactElement {
  // A negative or non-integer `count` would render nothing useful, and
  // `Array.from` needs a non-negative length; clamp rather than throw.
  const slots = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const widths = ['92%', '84%', '88%', '78%'];

  return (
    <ul
      id={PAST_LIST_ID}
      aria-label="Earlier turns"
      title={pendingReason}
      data-testid="turn-history-placeholders"
      style={listStyle}
    >
      {Array.from({ length: slots }, (_, index) => (
        <li key={index} data-testid="turn-history-placeholder">
          <PlaceholderCard width={widths[index % widths.length] ?? '85%'} />
        </li>
      ))}
    </ul>
  );
}

const pendingNextStyle: CSSProperties = {
  ...labelRowStyle,
  justifyContent: 'center',
  padding: 'var(--space-3)',
  border: '1px dashed var(--color-border)',
  borderRadius: 'var(--radius-md)',
  textTransform: 'none',
  letterSpacing: '0',
};

/**
 * `<NextTurnPending>` — the trailing edge of the timeline. Rendered below
 * the visual so the column reads "… history, this turn, next turn".
 *
 * Also inert: a plain `<p>`, so it is not focusable, not clickable and
 * carries no handler. It states that nothing has been submitted rather
 * than implying a turn is being generated.
 */
export function NextTurnPending(): ReactElement {
  return (
    <p id={NEXT_ID} title={pendingReason} data-testid="turn-next-pending" style={pendingNextStyle}>
      <Ellipsis size={12} strokeWidth={1.75} aria-hidden="true" />
      Next turn pending &mdash; nothing has been submitted yet
    </p>
  );
}
