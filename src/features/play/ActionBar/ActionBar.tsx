/**
 * `<ActionBar>` — the always-visible bottom row of the player HUD.
 *
 * Two rows, neither of which ever scrolls:
 *   Row 1  action-mode segmented control (left) + turn actions (right)
 *   Row 2  the composer
 *
 * Data-honesty notes, because this is production code:
 *   - The mode selector (DO / SAY / STORY / SEE / ASK / FAST FORWARD) is
 *     **local UI state only**. It is not sent to the API and the
 *     `SubmitTurnRequest` payload is untouched — there is no backend
 *     field for it. It is exposed purely as `aria-pressed` + the
 *     `data-action-mode` attribute so the HUD is inspectable.
 *   - Undo / Redo / Retry are the real `useUndoBranch` / `useRedoBranch`
 *     / `useRetryBranch` mutations and keep their `canUndo` / `canRedo`
 *     / `canRetry` + `isPending` disabled logic.
 *   - "Describe", "Continue" and the "Fast forward" mode segment have
 *     **no** backend behaviour in this app yet, so they render fully
 *     formed but `disabled`, each carrying a `title` and an
 *     `aria-describedby` sentence that says why. Nothing here is faked:
 *     no handler, no optimistic state, no `aria-pressed` on a control
 *     that cannot be pressed. See `<InertButton>`.
 */
import {
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactElement,
} from 'react';
import {
  Eye,
  Hand,
  MessageSquare,
  FastForward,
  BookOpen,
  HelpCircle,
  Play,
  Undo2,
  Redo2,
  RotateCcw,
  Wand2,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/ui/Button';
import { HUD_ACTION_BAR_HEIGHT } from '@/features/play/hudLayout';

export type ActionMode = 'do' | 'say' | 'story' | 'see' | 'ask';

interface ModeDescriptor {
  readonly id: ActionMode;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly hint: string;
}

/** Presenter-only modes. `data-action-mode` on the group is the source of truth. */
const MODES: ReadonlyArray<ModeDescriptor> = [
  { id: 'do', label: 'Do', icon: Hand, hint: 'Act in the scene' },
  { id: 'say', label: 'Say', icon: MessageSquare, hint: 'Speak to someone' },
  { id: 'story', label: 'Story', icon: BookOpen, hint: 'Add backstory' },
  { id: 'see', label: 'See', icon: Eye, hint: 'Look around' },
  { id: 'ask', label: 'Ask', icon: HelpCircle, hint: 'Ask the game master' },
];

const NOT_WIRED_TITLE =
  'Not wired yet: this action has no backend behaviour in the current API, so it is disabled rather than faked.';

/** Ids of the visually hidden descriptions shared by the unwired
 *  buttons. Each control gets its own so a screen-reader user hears the
 *  reason attached to the control they just tabbed to, rather than one
 *  orphaned sentence. */
const NOT_WIRED_HINT_IDS = {
  describe: 'action-bar-describe-hint',
  continue: 'action-bar-continue-hint',
  fastForward: 'action-bar-fast-forward-hint',
} as const;

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

/**
 * `<InertButton>` — a control that is *visible and complete* but has no
 * backend behaviour yet.
 *
 * Design contract: it is styled exactly like its live neighbours
 * (`intent` / `size` are passed straight through, so height, border,
 * radius, padding and font all match the Undo / Redo / Retry buttons),
 * it carries its icon and its label, and it sits where the design puts
 * it. Nothing is stubbed: no `onClick`, no `aria-pressed`, no optimistic
 * state.
 *
 * Behaviour contract:
 *   - genuinely `disabled`, so it is skipped by Tab and inert to
 *     pointer / keyboard activation — it is never a focusable control
 *     that silently swallows a click;
 *   - the plain-language reason is on the wrapper `title` (hover
 *     tooltip) and on a visually hidden node wired through
 *     `aria-describedby`.
 *
 * The wrapper exists because a `disabled` element does not reliably fire
 * pointer events, so a `title` on the button itself would not show; the
 * span around it still does. `Button` has no `title` prop, so the
 * tooltip cannot simply move onto the control.
 */
function InertButton({
  label,
  icon: Icon,
  reason,
  hintId,
  intent = 'ghost',
  testId,
}: {
  readonly label: string;
  readonly icon?: LucideIcon;
  readonly reason: string;
  readonly hintId: string;
  readonly intent?: 'secondary' | 'ghost';
  readonly testId?: string;
}): ReactElement {
  return (
    <span title={reason} style={{ display: 'inline-flex' }}>
      <Button
        intent={intent}
        size="sm"
        disabled
        aria-label={label}
        aria-describedby={hintId}
        data-testid={testId}
      >
        {Icon !== undefined && <Icon size={14} strokeWidth={1.75} aria-hidden="true" />}
        {label}
      </Button>
      <span id={hintId} style={visuallyHiddenStyle}>
        {reason}
      </span>
    </span>
  );
}

export interface ActionBarProps {
  /** Controlled composer text. The page owns the state, as it did before. */
  readonly value: string;
  readonly onValueChange: (next: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly isSubmitting: boolean;
  /** Existing rule: no chosen option AND no free text ⇒ submit disabled. */
  readonly isSubmitDisabled: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onRetry: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canRetry: boolean;
  readonly isBranchOpsPending: boolean;
}

const barStyle: CSSProperties = {
  flex: `0 0 ${HUD_ACTION_BAR_HEIGHT}`,
  height: HUD_ACTION_BAR_HEIGHT,
  maxHeight: HUD_ACTION_BAR_HEIGHT,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  padding: 'var(--space-3) var(--space-4)',
  borderTop: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  overflow: 'hidden',
};

const controlsRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  flexWrap: 'wrap',
};

const segmentedStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: '2px',
  padding: '2px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
};

const segmentBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  minHeight: 'var(--control-touch-min)',
  padding: 'var(--space-1) var(--space-3)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--weight-medium)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  background: 'transparent',
  color: 'var(--color-foreground-muted)',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-sm)',
  whiteSpace: 'nowrap',
};

const segmentActiveStyle: CSSProperties = {
  ...segmentBaseStyle,
  background: 'var(--color-primary)',
  color: 'var(--color-primary-foreground)',
  borderColor: 'var(--color-primary)',
};

const segmentIdleStyle: CSSProperties = {
  ...segmentBaseStyle,
  borderColor: 'var(--color-border)',
};

const formStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gridTemplateRows: 'auto auto',
  columnGap: 'var(--space-3)',
  rowGap: 'var(--space-1)',
  alignItems: 'center',
};

const labelStyle: CSSProperties = {
  gridColumn: '1 / -1',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--weight-medium)',
  color: 'var(--color-foreground-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const textareaStyle: CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-2) var(--space-3)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-foreground)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-base)',
  resize: 'none',
  minHeight: 'calc(var(--control-touch-min) + var(--space-4))',
};

const helpStyle: CSSProperties = {
  gridColumn: '1 / -1',
  color: 'var(--color-foreground-subtle)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
};

export function ActionBar({
  value,
  onValueChange,
  onSubmit,
  isSubmitting,
  isSubmitDisabled,
  onUndo,
  onRedo,
  onRetry,
  canUndo,
  canRedo,
  canRetry,
  isBranchOpsPending,
}: ActionBarProps): ReactElement {
  // Local UI state only — see the module header.
  const [mode, setMode] = useState<ActionMode>('do');
  const opsPending = isBranchOpsPending;

  return (
    <div data-testid="adventure-action-bar" style={barStyle}>
      <div style={controlsRowStyle}>
        <div
          role="group"
          aria-label="Action mode"
          data-action-mode={mode}
          style={segmentedStyle}
        >
          {MODES.map((entry) => {
            const active = entry.id === mode;
            const Icon = entry.icon;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                title={entry.hint}
                onClick={() => setMode(entry.id)}
                style={active ? segmentActiveStyle : segmentIdleStyle}
                data-testid={`action-mode-${entry.id}`}
              >
                <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                <span>{entry.label}</span>
              </button>
            );
          })}
          {/* Presentational twin of the other mode segments: same
              segment geometry and icon, `disabled` so it is skipped by
              Tab and cannot be pressed, with the reason exposed. */}
          <span title={NOT_WIRED_TITLE} style={{ display: 'inline-flex' }}>
            <button
              type="button"
              disabled
              aria-describedby={NOT_WIRED_HINT_IDS.fastForward}
              style={{ ...segmentIdleStyle, opacity: 0.5, cursor: 'not-allowed' }}
              data-testid="action-mode-fast-forward"
            >
              <FastForward size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>Fast forward</span>
            </button>
            <span id={NOT_WIRED_HINT_IDS.fastForward} style={visuallyHiddenStyle}>
              {NOT_WIRED_TITLE}
            </span>
          </span>
        </div>

        <div
          role="group"
          aria-label="Turn actions"
          style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}
        >
          <Button
            intent="secondary"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo || opsPending}
            aria-label="Undo the last turn in this branch"
          >
            <Undo2 size={14} strokeWidth={1.75} aria-hidden="true" />
            Undo
          </Button>
          <Button
            intent="secondary"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo || opsPending}
            aria-label="Redo the next turn in this branch"
          >
            <Redo2 size={14} strokeWidth={1.75} aria-hidden="true" />
            Redo
          </Button>
          <Button
            intent="secondary"
            size="sm"
            onClick={onRetry}
            disabled={!canRetry || opsPending}
            aria-label="Retry the current branch from the active turn"
          >
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
            Retry
          </Button>
          {/* `Button` has no `title` prop, so the "not wired"
              explanation rides on a wrapper that owns the tooltip and is
              wired to the button through `aria-describedby`. */}
          <InertButton
            label="Describe"
            icon={Wand2}
            reason={NOT_WIRED_TITLE}
            hintId={NOT_WIRED_HINT_IDS.describe}
            intent="secondary"
            testId="action-describe"
          />
          <InertButton
            label="Continue"
            icon={Play}
            reason={NOT_WIRED_TITLE}
            hintId={NOT_WIRED_HINT_IDS.continue}
            intent="secondary"
            testId="action-continue"
          />
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        style={formStyle}
        aria-describedby="composer-help"
        data-testid="adventure-composer"
      >
        <label htmlFor="composer" style={labelStyle}>
          Say or do something
        </label>
        <textarea
          id="composer"
          name="composer"
          rows={2}
          placeholder="What do you do? (e.g. examine the lock, climb the wall, draw sword)…"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          maxLength={2000}
          style={textareaStyle}
        />
        <Button intent="primary" type="submit" disabled={isSubmitting || isSubmitDisabled}>
          <Send size={16} strokeWidth={1.75} aria-hidden="true" />
          {isSubmitting ? 'Sending…' : 'Send'}
        </Button>
        <span id="composer-help" style={helpStyle}>
          Submitting a turn requires a chosen option or free text. We attach an idempotency key so
          retries do not duplicate your turn.
        </span>
      </form>
    </div>
  );
}
