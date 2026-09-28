/**
 * Shared HUD layout metrics for the desktop player view.
 *
 * The player surface is a fixed three-row frame (top bar / scrollable
 * body / bottom action bar) that must fit the viewport at any height,
 * so the row heights are named constants rather than magic numbers
 * repeated across `PageShell`, `TopNav`, `ContextRail` and
 * `ActionBar`.
 *
 * Colours and type come exclusively from the design-system tokens
 * (`--color-*`, `--font-*`); nothing here introduces a new value.
 */

/** Row 1 — the fixed top bar (design target: 56–60px). */
export const HUD_TOP_BAR_HEIGHT = '56px';

/** Row 3 — the always-visible bottom action bar (design target: ~132px). */
export const HUD_ACTION_BAR_HEIGHT = '132px';

/** Row 2, right column — the fixed-width context rail. */
export const HUD_RAIL_WIDTH = '352px';

/**
 * The story column is the only vertically scrolling region in the body.
 * `68ch` is the comfortable reading measure from the approved design
 * (inside the requested 65–70ch band) for the serif narration.
 */
export const HUD_STORY_MEASURE = '68ch';

/**
 * How close (in px) to the bottom of the story column still counts as
 * "the player is following the story". Used by the scroll-to-bottom
 * effect so a player reading history is never yanked.
 */
export const HUD_SCROLL_STICKY_PX = 160;
