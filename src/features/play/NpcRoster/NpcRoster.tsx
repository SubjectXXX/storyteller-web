/**
 * `<NpcRoster>` — list every NPC the active branch has surfaced, with a
 * relationship indicator (ally/rival/family/neutral/unknown) drawn from
 * `relationships[]`.
 */
import type { CSSProperties, ReactElement } from 'react';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { EmptyState } from '@/ui/EmptyState';
import { LoadingPanel } from '@/components/LoadingPanel';
import type { NpcRelationship, NpcRelationshipKind, NpcResource } from '@/api-client';

export interface NpcRosterProps {
  readonly npcs: ReadonlyArray<NpcResource> | undefined;
  readonly isLoading: boolean;
  readonly error: { readonly message: string } | null;
  readonly title?: string;
}

const RELATIONSHIP_INTENT: Record<NpcRelationshipKind, 'success' | 'danger' | 'info' | 'muted' | 'warning'> = {
  ally: 'success',
  rival: 'danger',
  family: 'info',
  neutral: 'muted',
  unknown: 'warning',
};

const RELATIONSHIP_LABEL: Record<NpcRelationshipKind, string> = {
  ally: 'Ally',
  rival: 'Rival',
  family: 'Family',
  neutral: 'Neutral',
  unknown: 'Unknown',
};

function RelationshipDots({ relationships }: { relationships: ReadonlyArray<NpcRelationship> }): ReactElement {
  if (relationships.length === 0) {
    return (
      <span aria-label="No relationships recorded" style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
        —
      </span>
    );
  }
  return (
    <ul
      aria-label="Relationships"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-1)',
        listStyle: 'none',
        padding: 0,
        margin: 0,
      }}
    >
      {relationships.map((rel, idx) => (
        <li key={`${rel.target_npc_id}-${idx}`}>
          <Pill
            intent={RELATIONSHIP_INTENT[rel.kind]}
            title={`${RELATIONSHIP_LABEL[rel.kind]} of ${rel.target_name} (affinity ${rel.affinity})`}
          >
            {RELATIONSHIP_LABEL[rel.kind]} · {rel.target_name}
          </Pill>
        </li>
      ))}
    </ul>
  );
}

function NpcRow({ npc }: { npc: NpcResource }): ReactElement {
  return (
    <li
      data-testid={`npc-${npc.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        padding: 'var(--space-3)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface)',
      }}
    >
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)' }}>{npc.name}</span>
        <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>{npc.role}</span>
      </span>
      {npc.location && (
        <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>{npc.location}</span>
      )}
      <RelationshipDots relationships={npc.relationships} />
      {!npc.alive && (
        <span style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)' }}>Deceased</span>
      )}
    </li>
  );
}

const listStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-2)',
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

export function NpcRoster({ npcs, isLoading, error, title = 'NPCs' }: NpcRosterProps): ReactElement {
  if (isLoading) {
    return (
      <Card title={title}>
        <LoadingPanel label="Loading NPCs" intent="inline" />
      </Card>
    );
  }
  if (error) {
    return (
      <Card title={title}>
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
          {error.message}
        </p>
      </Card>
    );
  }
  if (!npcs || npcs.length === 0) {
    return (
      <Card title={title}>
        <EmptyState title="No NPCs in this branch" description="The active branch has not surfaced any NPCs yet." />
      </Card>
    );
  }
  return (
    <Card title={title} subtitle={`${npcs.length} character${npcs.length === 1 ? '' : 's'}`}>
      <ul aria-label="NPC roster" style={listStyle}>
        {npcs.map((npc) => (
          <NpcRow key={npc.id} npc={npc} />
        ))}
      </ul>
    </Card>
  );
}