import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { NavLink as RouterNavLink, useParams } from 'react-router';
import { Sun } from 'lucide-react';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { useAuth } from '@/auth/useAuth';
import { useAdventures, useAdventureStream } from '@/hooks/useAdventures';
import { useWallet } from '@/hooks/useWallet';
import { HUD_TOP_BAR_HEIGHT } from '@/features/play/hudLayout';

export interface TopNavProps {
  /**
   * `default` renders exactly the navigation that shipped before the
   * player HUD: sticky, wrapping link list, footer-facing margins.
   * `hud` pins the bar to a fixed row height, drops `position: sticky`
   * (the HUD frame never scrolls) and enables the extra HUD chips.
   */
  readonly variant?: 'default' | 'hud';
  /**
   * Adventure / scenario title shown as a pill next to the wordmark in
   * the HUD variant. When omitted the bar falls back to the active
   * adventure it already resolves from `useAdventures()`.
   */
  readonly adventureTitle?: string;
  /**
   * Credit balance for the HUD credits chip. When omitted the bar falls
   * back to `GET /api/wallet` — but only in the `hud` variant, so no
   * other route starts issuing that request.
   */
  readonly credits?: number;
}

/**
 * Id of the visually hidden explanation that rides with the pending
 * in-world clock chip. `Pill` takes a `title` (a hover tooltip, which is
 * not reliably announced), so the same sentence is also exposed as real
 * text for assistive tech through `aria-describedby`.
 */
const HUD_CLOCK_HINT_ID = 'hud-clock-chip-hint';

/**
 * Plain-language reason the clock chip has no numbers in it.
 *
 * There is no in-world clock on the API at all: the only `ClockTick` the
 * client knows about is a dice / suspicion counter
 * (`hooks/useDiceClock.ts`), and no endpoint returns a time-of-day or a
 * day number. The chip therefore renders the design's shape with
 * em-dash placeholders instead of a fabricated — and certainly not
 * live-updating — clock. No request is made and no timer is started.
 */
const HUD_CLOCK_REASON =
  'The in-world clock is not available from the API yet: no endpoint returns a time of day or a day number, so this chip is a placeholder and does not tick.';

const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const item: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
};

/**
 * `<HudClockChip>` — the design's sun / time / day chip, rendered in the
 * pending state.
 *
 * Shape follows the approved design: a small sun glyph, a monospace
 * time, a separator, and the day number, all inside the same rounded
 * chip treatment (and the same tokens) as the credits chip beside it, so
 * the top bar keeps the right visual weight. Every value is an em-dash
 * placeholder. It is inert: not a button, not focusable, no request, no
 * ticking.
 */
function HudClockChip(): ReactElement {
  return (
    <span
      style={item}
      title={HUD_CLOCK_REASON}
      data-testid="hud-clock-chip"
      aria-describedby={HUD_CLOCK_HINT_ID}
    >
      <Pill intent="muted" title={HUD_CLOCK_REASON}>
        <Sun size={12} strokeWidth={1.75} aria-hidden="true" />
        <span style={{ fontFamily: 'var(--font-mono)' }}>&mdash;:&mdash;</span>
        <span aria-hidden="true">&nbsp;&middot;&nbsp;</span>
        <span>Morning &middot; Day &mdash;</span>
      </Pill>
      <span id={HUD_CLOCK_HINT_ID} style={visuallyHiddenStyle}>
        {HUD_CLOCK_REASON}
      </span>
    </span>
  );
}

/**
 * Top navigation surfacing the primary destinations a player uses in the
 * S2 vertical slice: scenarios, adventures, settings, wallet, referrals,
 * plus authentication affordances (sign in / sign out) and a quick link
 * back to the player's active adventure.
 *
 * When the player is on `/adventures/:id` and the SSE stream is open, the
 * nav surfaces a "Streaming…" pill so they can see at a glance that the
 * LLM is mid-turn.
 *
 * The `hud` variant adds three HUD-only affordances:
 *   - the adventure-name pill (route params + `useAdventures`),
 *   - the credits chip (`useWallet`, enabled only in the HUD variant),
 *   - the in-world clock chip, which has **no** data source: it renders
 *     the design's shape with placeholder dashes and a stated reason
 *     (see `HudClockChip`). It issues no request.
 */
export function TopNav({
  variant = 'default',
  adventureTitle,
  credits,
}: TopNavProps = {}): ReactElement {
  const { token, user, signOut } = useAuth();
  const adventuresQuery = useAdventures();
  const params = useParams<{ id: string }>();
  const isHud = variant === 'hud';
  const activeAdventureId = (() => {
    const parsed = Number(params.id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  })();
  const activeStream = useAdventureStream(activeAdventureId, { enabled: activeAdventureId !== undefined });
  // `enabled: false` keeps the hook call unconditional (Rules of Hooks)
  // while guaranteeing the wallet request only ever fires on the HUD
  // route — every other page renders byte-for-byte as it did before.
  const walletQuery = useWallet({ enabled: isHud && token !== null });
  const activeAdventure =
    adventuresQuery.data?.find((a) => a.status === 'active') ?? null;
  const isStreaming = activeStream.streaming;

  // HUD name chip: prefer the caller-supplied title, else the adventure
  // this route points at, else the player's active adventure.
  const hudTitle =
    adventureTitle ??
    (activeAdventureId !== undefined
      ? (adventuresQuery.data?.find((a) => a.id === activeAdventureId)?.title ??
        activeAdventure?.title)
      : activeAdventure?.title) ??
    undefined;
  // HUD credits chip: explicit prop wins, otherwise the wallet balance.
  const hudCredits = credits ?? (isHud ? walletQuery.data?.balance : undefined);

  // The AuthContext.signOut() already routes to /login on completion,
  // so the click handler only needs to fire-and-forget.
  const handleSignOut = () => {
    void signOut();
  };

  return (
    <nav
      aria-label="Primary"
      style={{
        borderBottom: '1px solid var(--color-border)',
        padding: isHud ? 'var(--space-2) var(--space-4)' : 'var(--space-3) var(--space-4)',
        display: 'flex',
        gap: 'var(--space-4)',
        alignItems: 'center',
        background: 'var(--color-surface)',
        ...(isHud
          ? {
              // Fixed HUD row: the bar is a sibling of the scroll regions,
              // never a sticky overlay, so it can never be scrolled away.
              position: 'static' as const,
              flex: '0 0 auto',
              height: HUD_TOP_BAR_HEIGHT,
              minHeight: HUD_TOP_BAR_HEIGHT,
              overflowX: 'auto',
            }
          : {
              position: 'sticky' as const,
              top: 0,
              zIndex: 'var(--z-sticky)',
              backdropFilter: 'saturate(180%) blur(8px)',
            }),
      }}
    >
      <RouterNavLink
        to="/"
        end
        style={({ isActive }) => ({
          ...brandLink,
          color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)',
        })}
      >
        Storyteller
      </RouterNavLink>
      {isHud && hudTitle !== undefined && (
        <Pill intent="muted" title={`Current adventure: ${hudTitle}`}>
          {hudTitle}
        </Pill>
      )}
      <ul
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          flexWrap: isHud ? 'nowrap' : 'wrap',
        }}
      >
        <Item to="/scenarios">Scenarios</Item>
        <Item to="/settings">Settings</Item>
        <Item to="/wallet">Wallet</Item>
        <Item to="/referrals">Referrals</Item>
        <Item to="/story-seed-preview">Story seed</Item>
        {user?.is_admin === true && (
          <li>
            <a
              href="/admin/"
              style={{ ...navLink, color: 'var(--color-primary)' }}
              data-testid="admin-link"
              aria-label="Open the Storyteller administration console"
            >
              Admin
            </a>
          </li>
        )}
        {activeAdventure && (
          <Item
            to={`/adventures/${activeAdventure.id}`}
            data-testid="continue-adventure-link"
          >
            Continue adventure
          </Item>
        )}
        {isStreaming && (
          <li>
            <Pill
              intent="info"
              title="The adventure stream is open."
              data-testid="streaming-pill"
            >
              Streaming…
            </Pill>
          </li>
        )}
      </ul>
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          gap: 'var(--space-2)',
          alignItems: 'center',
        }}
      >
        {isHud && hudCredits !== undefined && (
          <Pill intent="neutral" title={`Credit balance: ${hudCredits} credits`}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{hudCredits}</span>
            <span>cr</span>
          </Pill>
        )}
        {/* Design order: credits, then the sun / time / day clock chip.
            Placeholder-only — see `HudClockChip` for why. */}
        {isHud && <HudClockChip />}
        {token !== null && user ? (
          <>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-foreground-muted)' }}>
              Hi, {user.name}
            </span>
            <Button intent="ghost" size="sm" onClick={() => void handleSignOut()} aria-label="Sign out">
              Sign out
            </Button>
          </>
        ) : (
          <RouterNavLink to="/login" style={signinLink}>
            Sign in
          </RouterNavLink>
        )}
      </div>
    </nav>
  );
}

function Item({
  to,
  children,
  ...rest
}: {
  to: string;
  children: ReactNode;
  readonly 'data-testid'?: string;
}): ReactElement {
  return (
    <li>
      <RouterNavLink
        to={to}
        style={({ isActive }) => ({
          ...navLink,
          color: isActive ? 'var(--color-primary)' : 'var(--color-foreground-muted)',
          background: isActive ? 'var(--color-surface-muted)' : 'transparent',
        })}
        {...rest}
      >
        {children}
      </RouterNavLink>
    </li>
  );
}

const brandLink: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontWeight: 'var(--weight-semibold)',
  fontSize: 'var(--text-lg)',
  textDecoration: 'none',
  letterSpacing: '-0.01em',
};

const navLink: CSSProperties = {
  fontSize: 'var(--text-sm)',
  textDecoration: 'none',
  padding: 'var(--space-1) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  fontWeight: 'var(--weight-medium)',
  minHeight: 'var(--control-touch-min)',
  display: 'inline-flex',
  alignItems: 'center',
};

const signinLink: CSSProperties = {
  ...navLink,
  color: 'var(--color-primary)',
  textDecoration: 'none',
};
