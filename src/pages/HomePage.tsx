import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useScenarios } from '@/hooks';
import { SCENARIO_FIXTURES, type ScenarioFixture } from '@/fixtures/data';

export default function HomePage(): ReactElement {
  const { data, isLoading, error } = useScenarios();
  // Fixture fallback: when the API is unreachable, the wrapper fetcher
  // returns the S1 fixtures. The TODO(S2-T01) points at the upcoming
  // `/api/scenarios/featured` endpoint contract.
  const featured: ScenarioFixture | undefined =
    (data && data[0]) ?? SCENARIO_FIXTURES[0];

  return (
    <div>
      <PageHeader
        eyebrow="Stage 1 fixture shell"
        title="Welcome, traveler"
        description="Pick a scenario to read through its synopsis, or jump straight into play to walk through the surfaces we are polishing for S1."
        actions={
          <>
            <Link to="/scenarios">
              <Button intent="primary">Browse scenarios</Button>
            </Link>
            <Link to="/play">
              <Button intent="secondary">Open play surface</Button>
            </Link>
          </>
        }
      />

      <section aria-labelledby="featured" style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <h2 id="featured" style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)' }}>
          Featured this week
        </h2>
        {isLoading ? (
          <LoadingPanel label="Loading featured scenario" intent="inline" />
        ) : error || !featured ? (
          <p
            role="alert"
            style={{
              padding: 'var(--space-6)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              color: 'var(--color-foreground-muted)',
            }}
          >
            No featured scenario right now. Browse the library to pick one.
            {/* TODO(S2-T01): replace with `/api/scenarios/featured` contract. */}
          </p>
        ) : (
          <article
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4) var(--space-5)',
              background: 'var(--color-surface)',
              display: 'grid',
              gridTemplateColumns: 'minmax(160px, 200px) 1fr',
              gap: 'var(--space-5)',
            }}
          >
            <div
              aria-hidden
              style={{
                height: 160,
                borderRadius: 'var(--radius-md)',
                background: featured.coverAccent,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)' }}>{featured.title}</h3>
              <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
                by {featured.author} · {featured.chapters} chapters · {featured.durationMinutes} min
              </p>
              <p className="prose" style={{ margin: 0 }}>{featured.synopsis}</p>
              <div>
                <Link to={`/scenarios#${featured.id}`}>
                  <Button intent="ghost">View scenario</Button>
                </Link>
              </div>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
