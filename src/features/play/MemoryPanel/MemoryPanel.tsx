/**
 * `<MemoryPanel>` — Stage 5 placeholder.
 *
 * Tries `GET /api/adventures/{id}/recap` via the supplied `recapQuery`. On
 * success it renders the recap turns; on a 404 (the Stage 5 worker hasn't
 * shipped the endpoint yet) it shows an `EmptyState` promising the recap
 * lands with Stage 5.
 */
import type { ReactElement } from 'react';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { EmptyState } from '@/ui/EmptyState';
import { LoadingPanel } from '@/components/LoadingPanel';
import type { RecapResource } from '@/api-client';

export interface MemoryPanelProps {
  readonly recap: RecapResource | undefined;
  readonly isLoading: boolean;
  readonly error: { readonly message: string; readonly status?: number } | null;
  readonly title?: string;
}

export function MemoryPanel({
  recap,
  isLoading,
  error,
  title = 'Recap',
}: MemoryPanelProps): ReactElement {
  if (isLoading) {
    return (
      <Card title={title}>
        <LoadingPanel label="Loading recap" intent="inline" />
      </Card>
    );
  }
  if (recap && recap.turns.length > 0) {
    return (
      <Card
        title={title}
        subtitle={
          <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
            Last refreshed {new Date(recap.generated_at).toLocaleString()}
          </span>
        }
      >
        <ul
          aria-label="Recap turns"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gap: 'var(--space-2)',
          }}
        >
          {recap.turns.map((turn) => (
            <li
              key={turn.turn_id}
              style={{
                display: 'flex',
                gap: 'var(--space-2)',
                alignItems: 'baseline',
                padding: 'var(--space-2) 0',
                borderBottom: '1px dashed var(--color-border)',
              }}
            >
              <Pill intent="muted" title={`Sequence #${turn.sequence_number}`}>
                #{turn.sequence_number}
              </Pill>
              <span style={{ fontSize: 'var(--text-sm)' }}>{turn.headline}</span>
            </li>
          ))}
        </ul>
      </Card>
    );
  }
  return (
    <Card title={title}>
      <EmptyState
        title="Recap arrives in Stage 5"
        description={
          error
            ? `(${error.message}) Memory extraction is the Stage 5 milestone; the API worker will surface recent beats here.`
            : 'Memory extraction is the Stage 5 milestone; the API worker will surface recent beats here.'
        }
      />
    </Card>
  );
}