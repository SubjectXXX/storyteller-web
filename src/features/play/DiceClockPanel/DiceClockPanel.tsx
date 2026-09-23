/**
 * `<DiceClockPanel>` — read-only display of the latest mechanic event.
 *
 * The parent hands it the resolved `MechanicEvent` from `useDiceClock`.
 * Dice rolls render the formula and per-die totals; clocks render a
 * progress bar from `from` to `to`. When there is no event yet we render an
 * EmptyState so the panel is never blank.
 */
import type { CSSProperties, ReactElement } from 'react';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { EmptyState } from '@/ui/EmptyState';
import type { ClockTick, DiceRoll, MechanicEvent } from '@/hooks';

export interface DiceClockPanelProps {
  readonly event: MechanicEvent | null;
  readonly title?: string;
}

function DiceRow({ roll }: { roll: DiceRoll }): ReactElement {
  const successIntent =
    roll.success === 'pass' ? 'success' : roll.success === 'fail' ? 'danger' : roll.success === 'mixed' ? 'warning' : 'muted';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)' }}>Dice roll</span>
        <span aria-hidden style={{ fontSize: 'var(--text-xs)', color: 'var(--color-foreground-muted)' }}>
          {roll.formula}
        </span>
      </span>
      <span style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
        {roll.rolls.map((value, idx) => (
          <Pill key={idx} intent="muted" title={`Die ${idx + 1}`}>
            {value}
          </Pill>
        ))}
        {roll.modifier !== 0 && (
          <Pill intent="muted" title="Modifier">{roll.modifier >= 0 ? `+${roll.modifier}` : roll.modifier}</Pill>
        )}
        <Pill intent="info" title="Total">{roll.total}</Pill>
        {roll.success && (
          <Pill intent={successIntent} title="Outcome">
            {roll.success}
          </Pill>
        )}
      </span>
      {roll.reason && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-foreground-muted)' }}>{roll.reason}</span>
      )}
    </div>
  );
}

function ClockRow({ tick }: { tick: ClockTick }): ReactElement {
  const ratio = tick.max > 0 ? Math.min(1, tick.to / tick.max) : 1;
  const trackStyle: CSSProperties = {
    position: 'relative',
    height: 8,
    background: 'var(--color-surface-muted)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    marginTop: 'var(--space-1)',
  };
  const fillStyle: CSSProperties = {
    height: '100%',
    width: `${Math.round(ratio * 100)}%`,
    background: 'var(--color-info)',
    borderRadius: 'var(--radius-sm)',
    transition: 'width 200ms ease-out',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)' }}>Clock: {tick.label}</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-foreground-muted)' }}>
          {tick.from} → {tick.to} / {tick.max}
        </span>
      </span>
      <div role="presentation" style={trackStyle}>
        <div style={fillStyle} />
      </div>
      {tick.reason && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-foreground-muted)' }}>{tick.reason}</span>
      )}
    </div>
  );
}

export function DiceClockPanel({ event, title = 'Mechanics' }: DiceClockPanelProps): ReactElement {
  if (!event) {
    return (
      <Card title={title}>
        <EmptyState
          title="No mechanics yet"
          description="Dice and clock ticks surface here as the engine applies them to your turns."
        />
      </Card>
    );
  }
  return (
    <Card title={title}>
      {event.kind === 'dice' ? <DiceRow roll={event} /> : <ClockRow tick={event} />}
    </Card>
  );
}