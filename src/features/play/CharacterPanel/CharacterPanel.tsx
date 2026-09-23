/**
 * `<CharacterPanel>` — the player character's stats + traits for the active
 * branch. Collapsible; the closed summary always shows name + role, the
 * open body lists stats with their max bar and traits as pill rows.
 */
import type { CSSProperties, ReactElement } from 'react';
import { useId, useState } from 'react';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { EmptyState } from '@/ui/EmptyState';
import { LoadingPanel } from '@/components/LoadingPanel';
import type { CharacterResource, CharacterStat, CharacterTrait } from '@/api-client';

export interface CharacterPanelProps {
  readonly character: CharacterResource | undefined;
  readonly isLoading: boolean;
  readonly error: { readonly message: string } | null;
  readonly title?: string;
}

const statBarColor = (ratio: number): string => {
  if (ratio >= 0.7) return 'var(--color-success)';
  if (ratio >= 0.4) return 'var(--color-warning)';
  return 'var(--color-danger)';
};

function StatBar({ stat }: { stat: CharacterStat }): ReactElement {
  const ratio = stat.max && stat.max > 0 ? Math.min(1, stat.value / stat.max) : 1;
  const fillStyle: CSSProperties = {
    height: '100%',
    width: `${Math.round(ratio * 100)}%`,
    background: statBarColor(ratio),
    borderRadius: 'var(--radius-sm)',
    transition: 'width 200ms var(--motion-easing, ease-out)',
  };
  const trackStyle: CSSProperties = {
    position: 'relative',
    height: 6,
    background: 'var(--color-surface-muted)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    marginTop: 'var(--space-1)',
  };
  return (
    <li
      aria-label={`${stat.label} ${stat.value}${stat.max !== null ? ` of ${stat.max}` : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        padding: 'var(--space-2) var(--space-3)',
        background: 'var(--color-surface-muted)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <span
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
        }}
      >
        <span style={{ fontWeight: 'var(--weight-medium)' }}>{stat.label}</span>
        <span aria-hidden>
          {stat.value}
          {stat.max !== null ? `/${stat.max}` : ''}
        </span>
      </span>
      {stat.max !== null && (
        <div role="presentation" style={trackStyle}>
          <div style={fillStyle} />
        </div>
      )}
    </li>
  );
}

function TraitRow({ trait }: { trait: CharacterTrait }): ReactElement {
  return (
    <li
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        padding: 'var(--space-2) 0',
      }}
    >
      <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>
        {trait.label}
      </span>
      {trait.description && (
        <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
          {trait.description}
        </span>
      )}
    </li>
  );
}

export function CharacterPanel({
  character,
  isLoading,
  error,
  title = 'Character',
}: CharacterPanelProps): ReactElement {
  const [expanded, setOpen] = useState(true);
  const detailsId = useId();

  if (isLoading) {
    return (
      <Card title={title}>
        <LoadingPanel label="Loading character" intent="inline" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title={title}>
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
          Couldn’t load character: {error.message}
        </p>
      </Card>
    );
  }

  if (!character) {
    return (
      <Card title={title}>
        <EmptyState
          title="No character yet"
          description="The active scenario does not model characters, or no branch has been started."
        />
      </Card>
    );
  }

  return (
    <Card
      title={title}
      subtitle={
        <span style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'var(--weight-medium)' }}>{character.name}</span>
          <Pill intent="muted" title="Role">{character.role}</Pill>
        </span>
      }
      footer={
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setOpen((prev) => !prev)}
          style={{
            background: 'transparent',
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            padding: 0,
            alignSelf: 'flex-start',
          }}
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      }
    >
      {expanded && (
        <div id={detailsId} data-testid="character-details">
          {character.stats.length > 0 && (
            <ul
              aria-label="Stats"
              style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-1)' }}
            >
              {character.stats.map((stat) => (
                <StatBar key={stat.id} stat={stat} />
              ))}
            </ul>
          )}
          {character.traits.length > 0 && (
            <ul
              aria-label="Traits"
              style={{ listStyle: 'none', padding: 0, margin: 'var(--space-3) 0 0 0', display: 'grid' }}
            >
              {character.traits.map((trait) => (
                <TraitRow key={trait.id} trait={trait} />
              ))}
            </ul>
          )}
          {character.notes && (
            <p
              style={{
                marginTop: 'var(--space-3)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-foreground-muted)',
              }}
            >
              {character.notes}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}