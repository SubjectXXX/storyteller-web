import type { ReactElement } from 'react';
import { useParams, Link } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';

/**
 * `/play/:adventureId?` is a PUBLIC route (`router/index.tsx` wraps it without
 * `<AuthGate>`), and the API has no public read surface for a live play turn:
 * `GET /api/adventures/{id}` and `POST /api/adventures/{id}/turns` both sit
 * behind `auth:sanctum`. This page therefore fires no request at all.
 *
 * The S1 client operations it used to call were removed because their routes
 * never existed:
 *   - `GET/POST /api/scenarios/{slug}/play-turn` — not in `routes/api.php`.
 *   - `GET /api/scenarios/{slug}` called with an *adventure id* — the route
 *     exists but is keyed by scenario slug, so it could only ever 404.
 *
 * Anonymous visitors get an explicit "not available" state and a route to the
 * authenticated surface; signed-in players are sent to `/adventures/{id}`,
 * which is auth-gated and backed by the real `adventures.show` /
 * `adventures.turns.store` routes.
 *
 * TODO(S2-T01): drop this route once the redirect logic exclusively sends
 * players to `/adventures/:id`.
 */
export default function PlaySurfacePlaceholder(): ReactElement {
  const { adventureId } = useParams<{ adventureId?: string }>();
  const numericAdventureId = /^\d+$/.test(adventureId ?? '') ? adventureId : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Play surface"
        title={adventureId ? `Adventure ${adventureId}` : 'No adventure selected'}
        description="The offline play surface has been retired: it read from an API endpoint that does not exist. Live play is served by the authenticated adventure surface."
        actions={
          <>
            {numericAdventureId && (
              <Link to={`/adventures/${numericAdventureId}`}>
                <Button intent="primary">Open the live adventure</Button>
              </Link>
            )}
            <Link to="/scenarios">
              <Button intent="ghost">Browse scenarios</Button>
            </Link>
          </>
        }
      />

      <section style={{ marginTop: 'var(--space-6)' }}>
        <EmptyState
          title="This play surface is not available"
          description={
            numericAdventureId
              ? `Play for adventure #${numericAdventureId} is served by the authenticated surface. Sign in to continue that adventure.`
              : 'Pick a scenario to start an adventure, then sign in to play it.'
          }
        />
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--color-foreground-muted)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <Pill intent="muted" title="The API never shipped this endpoint">
            Endpoint not available
          </Pill>
          <span>Reading a play turn required an endpoint the API does not declare, so nothing is requested here.</span>
        </p>
      </section>
    </div>
  );
}
