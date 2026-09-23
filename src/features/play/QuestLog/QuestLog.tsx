/**
 * `<QuestLog>` — quest list derived from the scenario manifest. The server
 * surfaces quests on `ScenarioResource` (or — until that lands — as
 * `scenario.quests`). The component is defensive: if no quests are
 * available it renders an `EmptyState` and exposes the appropriate
 * `data-testid` for tests.
 */
import type { CSSProperties, ReactElement } from 'react';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { EmptyState } from '@/ui/EmptyState';

export type QuestStatus = 'active' | 'completed' | 'failed' | 'hidden';

export interface Quest {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: QuestStatus;
  readonly reward?: string | null;
}

export interface QuestLogProps {
  readonly quests: ReadonlyArray<Quest> | undefined;
  readonly title?: string;
}

const statusIntent: Record<QuestStatus, 'info' | 'success' | 'danger' | 'muted'> = {
  active: 'info',
  completed: 'success',
  failed: 'danger',
  hidden: 'muted',
};

const statusLabel: Record<QuestStatus, string> = {
  active: 'Active',
  completed: 'Done',
  failed: 'Failed',
  hidden: 'Hidden',
};

const listStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-2)',
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

export function QuestLog({ quests, title = 'Quests' }: QuestLogProps): ReactElement {
  if (!quests || quests.length === 0) {
    return (
      <Card title={title}>
        <EmptyState
          title="No quests logged"
          description="The scenario manifest does not declare quests yet. The Story Seed editor ships quests in a later milestone."
        />
      </Card>
    );
  }
  return (
    <Card title={title} subtitle={`${quests.length} quest${quests.length === 1 ? '' : 's'}`}>
      <ul aria-label="Quest log" style={listStyle}>
        {quests.map((q) => (
          <li
            key={q.id}
            data-testid={`quest-${q.id}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
              padding: 'var(--space-2) var(--space-3)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
            }}
          >
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <span style={{ fontWeight: 'var(--weight-medium)' }}>{q.title}</span>
              <Pill intent={statusIntent[q.status]} title={`Quest status: ${statusLabel[q.status]}`}>
                {statusLabel[q.status]}
              </Pill>
            </span>
            {q.description && (
              <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
                {q.description}
              </span>
            )}
            {q.reward && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-foreground-muted)' }}>
                Reward: {q.reward}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}