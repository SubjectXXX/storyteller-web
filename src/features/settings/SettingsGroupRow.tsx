/**
 * `<SettingsGroupRow>` — the single row renderer for a player settings group.
 *
 * Both settings surfaces render from here so the Inherited / Locked / Reset
 * affordance required by `AGENTS.md` is implemented exactly once:
 *
 *   - `<UserSettingsPage>`      — GLOBAL scope, one row per catalogue entry.
 *   - `<AdventureSettingsDrawer>` — per-adventure scope, one row per resolved
 *     group from `AdventureSettingsResource.groups`, which may carry a
 *     server-side lock the catalogue does not know about.
 *
 * The row is honest about state: a locked group renders its control
 * `disabled` plus the server's `locked_reason`, never an editable control
 * that silently discards the player's click.
 */
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Button } from '@/ui/Button';
import { Pill, type PillIntent } from '@/ui/Pill';
import {
  coerceSettingValue,
  displayValue,
  isUserWritable,
  type PlayerSettingsGroupDefinition,
  type SettingValue,
} from './settingsGroups';

export interface SettingsGroupRowProps {
  readonly group: PlayerSettingsGroupDefinition;
  readonly value: SettingValue;
  /** True when `value` still matches the catalogue default. */
  readonly inherited: boolean;
  /** Server- or scope-imposed lock. A locked row is not editable. */
  readonly locked: boolean;
  readonly lockedReason?: string | null;
  /** State pill shown next to the control (e.g. the resolution source). */
  readonly stateLabel?: string;
  readonly stateIntent?: PillIntent;
  /** Extra actions rendered before the control — the drawer's Override / Inherit. */
  readonly actions?: ReactNode;
  /** The drawer's control only becomes editable once the row is overridden. */
  readonly controlEditable?: boolean;
  readonly onChange: (value: SettingValue) => void;
  readonly onReset: () => void;
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
  flexWrap: 'wrap',
};

const labelStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
  maxWidth: '44ch',
};

const controlStack: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  flexWrap: 'wrap',
};

const actionStack: CSSProperties = {
  display: 'inline-flex',
  gap: 'var(--space-1)',
};

const controlStyle: CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  color: 'var(--color-foreground)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-base)',
  minHeight: 'var(--control-touch-min)',
  minWidth: 160,
};

const hintStyle: CSSProperties = {
  color: 'var(--color-foreground-muted)',
  fontSize: 'var(--text-xs)',
};

export function SettingsGroupRow({
  group,
  value,
  inherited,
  locked,
  lockedReason,
  stateLabel,
  stateIntent,
  actions,
  controlEditable = true,
  onChange,
  onReset,
}: SettingsGroupRowProps): ReactElement {
  // A row is editable when the caller allows it, no lock applies, and the
  // group is user-writable under the resolver's scope rules. A scenario-scoped
  // key always resolves from the scenario default, so it is locked even when
  // the server did not flag it.
  const scopeLocked = !isUserWritable(group);
  const isLocked = locked || scopeLocked;
  const editable = controlEditable && !isLocked;
  const isKeywordList = group.id === 'content_warnings';

  return (
    <li
      style={rowStyle}
      aria-label={group.label}
      data-testid={`setting-row-${group.id}`}
      data-group-id={group.id}
      data-inherited={inherited ? 'true' : 'false'}
      data-locked={isLocked ? 'true' : 'false'}
      data-editable={editable ? 'true' : 'false'}
    >
      <span style={labelStack}>
        <span style={{ fontWeight: 'var(--weight-medium)' }}>{group.label}</span>
        <span style={hintStyle}>{group.description}</span>
        {isLocked && (
          <span data-testid={`setting-locked-${group.id}`} style={hintStyle}>
            {lockedReason ??
              (scopeLocked
                ? 'Set by the scenario. Your default does not apply to this group.'
                : 'Locked by the scenario. This value cannot be changed.')}
          </span>
        )}
      </span>

      <span style={controlStack}>
        {inherited ? (
          <Pill intent="muted" title="Currently using the inherited default">
            Inherited
          </Pill>
        ) : (
          <Pill intent="info" title="Overridden from the inherited default">
            Custom
          </Pill>
        )}
        {isLocked && (
          <Pill intent="warning" title="This group is locked">
            Locked
          </Pill>
        )}
        {stateLabel && (
          <Pill intent={stateIntent ?? 'neutral'} title={`Resolution source: ${stateLabel}`}>
            {stateLabel}
          </Pill>
        )}

        {actions && <span style={actionStack}>{actions}</span>}

        {group.options ? (
          <select
            aria-label={group.label}
            value={displayValue(group, value)}
            disabled={!editable}
            onChange={(event) => onChange(coerceSettingValue(group, event.target.value))}
            style={controlStyle}
            data-testid={`setting-${group.id}`}
          >
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : isKeywordList ? (
          <input
            type="text"
            aria-label={group.label}
            value={displayValue(group, value)}
            disabled={!editable}
            placeholder="violence, grief"
            onChange={(event) => onChange(coerceSettingValue(group, event.target.value))}
            style={controlStyle}
            data-testid={`setting-${group.id}`}
          />
        ) : (
          <input
            type="checkbox"
            aria-label={group.label}
            checked={Boolean(value)}
            disabled={!editable}
            onChange={(event) => onChange(coerceSettingValue(group, event.target.checked))}
            data-testid={`setting-${group.id}`}
          />
        )}

        <Button
          intent="ghost"
          size="sm"
          onClick={onReset}
          disabled={!editable || inherited}
          aria-label={`Reset ${group.label} to the inherited default`}
          data-testid={`setting-reset-${group.id}`}
        >
          Reset
        </Button>
      </span>
    </li>
  );
}
