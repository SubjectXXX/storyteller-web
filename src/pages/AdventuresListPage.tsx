import type { CSSProperties, ReactElement } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { EmptyState } from '@/ui/EmptyState';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useAdventures } from '@/hooks/useAdventures';
import {
  ADVENTURE_LIST_FIXTURE,
  type AdventureResource,
  type AdventureStatus,
} from '@/fixtures/data';

/**
 * `AdventuresListPage` — the player's "My adventures" surface.
 *
 * The HomePage's secondary action and the top-nav "My adventures" link
 * both point here. The page lists every adventure the signed-in user
 * owns, newest first, with a status pill, current branch, and a
 * per-row link into the adventure detail view.
 *
 * Empty + error states both surface a CTA back to /scenarios so a
 * brand-new user has a way out without using the back button.
 */
const STATUS_INTENT: Record<AdventureStatus, 'success' | 'muted' | 'danger'> = {
  active: 'success',
  completed: 'muted',
  abandoned: 'danger',
};

const STATUS_LABEL: Record<AdventureStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  abandoned: 'Abandoned',
};

const rowStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3) var(--space-4)',
  background: 'var(--color-surface)',
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 'var(--space-3)',
  alignItems: 'center',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 'var(--text-lg)',
  fontWeight: 'var(--weight-semibold)',
  color: 'var(--color-foreground)',
  textDecoration: 'none',
};

const metaStyle: CSSProperties = {
  color: 'var(--color-foreground-muted)',
  fontSize: 'var(--text-sm)',
};

const stampStyle: CSSProperties = {
  color: 'var(--color-foreground-subtle)',
  fontSize: 'var(--text-xs)',
};

export default function AdventuresListPage(): ReactElement {
  const { data, isLoading, error } = useAdventures();
  // Fall back to the S1 fixture list when the API is unreachable so the
  // page is never blank during local dev — matches ScenarioLibraryPage.
  const list: ReadonlyArray<AdventureResource> = data ?? ADVENTURE_LIST_FIXTURE;

  // Newest first; null last_played_at (never opened) sorts last so the
  // most recently touched adventure is always at the top.
  const sorted = [...list].sort((a, b) => {
    const at = a.last_played_at ? Date.parse(a.last_played_at) : 0;
    const bt = b.last_played_at ? Date.parse(b.last_played_at) : 0;
    return bt - at;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Your adventures"
        description="Pick up an in-progress story, revisit a finished run, or start something new."
        actions={
          <Link to="/scenarios">
            <Button intent="primary">Browse scenarios</Button>
          </Link>
        }
      />

      {isLoading ? (
        <LoadingPanel label="Loading your adventures" intent="page" />
      ) : error ? (
        <div data-testid="adventures-error">
          <EmptyState
            title="Could not load your adventures"
            description="The API is unreachable. Try again, or browse the scenario library to start a new run."
            action={
              <Link to="/scenarios">
                <Button intent="primary">Browse scenarios</Button>
              </Link>
            }
          />
        </div>
      ) : sorted.length === 0 ? (
        <div data-testid="adventures-empty">
          <EmptyState
            title="No adventures yet"
            description="Pick a scenario to start your first adventure. Your progress will live here."
            action={
              <Link to="/scenarios">
                <Button intent="primary">Browse scenarios</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <ul
          aria-label="Adventures"
          style={{
            display: 'grid',
            gap: 'var(--space-3)',
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {sorted.map((adventure) => (
            <li key={adventure.id} data-testid="adventure-row" style={rowStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <Link to={`/adventures/${adventure.id}`} style={titleStyle}>
                  {adventure.title}
                </Link>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Pill
                    intent={STATUS_INTENT[adventure.status]}
                    title={`Status: ${adventure.status}`}
                  >
                    {STATUS_LABEL[adventure.status]}
                  </Pill>
                  <span style={metaStyle}>
                    Branch {adventure.current_branch.name} · depth {adventure.current_branch.depth}
                  </span>
                  {adventure.last_played_at && (
                    <span style={stampStyle}>
                      · Last played{' '}
                      {new Date(adventure.last_played_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Link to={`/adventures/${adventure.id}`}>
                <Button intent="secondary" size="sm">
                  Open
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
