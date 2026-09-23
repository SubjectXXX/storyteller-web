import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useAuth } from '@/auth/useAuth';
import { useScenarios } from '@/hooks';
import { useAdventures } from '@/hooks/useAdventures';
import { useAiStatus, AI_STATUS_FALLBACK } from '@/hooks/useAiStatus';
import {
  ADVENTURE_LIST_FIXTURE,
  SCENARIO_FIXTURES,
  SCENARIO_RESOURCE_FIXTURES,
  type ScenarioFixture,
  type ScenarioResource,
} from '@/fixtures/data';

export default function HomePage(): ReactElement {
  const { data, isLoading, error } = useScenarios();
  const { token } = useAuth();
  const adventuresQuery = useAdventures();
  const aiStatusQuery = useAiStatus();
  const featured: ScenarioResource | undefined =
    (data && data[0]) ?? SCENARIO_RESOURCE_FIXTURES[0];

  // Local-fallback list for the "browse scenarios" rail. While the API is
  // unreachable we still surface the legacy fixtures so the home page has
  // something to render.
  const fixtureRail: ReadonlyArray<ScenarioFixture> = SCENARIO_FIXTURES;

  const activeAdventures =
    adventuresQuery.data && adventuresQuery.data.length > 0
      ? adventuresQuery.data
      : token === null
        ? []
        : ADVENTURE_LIST_FIXTURE;
  const continueAdventure = activeAdventures.find((a) => a.status === 'active');

  // The AI status pill always renders, even when the API is offline.
  // We derive the visible text from `data ?? AI_STATUS_FALLBACK` so the
  // UI stays consistent across loading / error / success states.
  const ai = aiStatusQuery.data ?? AI_STATUS_FALLBACK;
  const providerLabel =
    ai.provider === 'unknown'
      ? 'Provider: unknown'
      : ai.provider === 'lmstudio'
        ? `Provider: LM Studio (${ai.model})`
        : `Provider: ${ai.provider}`;
  const providerIntent =
    ai.provider === 'unknown'
      ? 'muted'
      : ai.reachable
        ? 'success'
        : 'warning';

  return (
    <div>
      <PageHeader
        eyebrow="Welcome"
        title="Welcome, traveler"
        description="Pick a scenario to read through its synopsis, or jump straight into play to walk through the surfaces we are polishing for S2."
        actions={
          <>
            <Pill
              intent={providerIntent}
              title={
                ai.reachable
                  ? `Provider reachable at ${ai.base_url || 'a configured endpoint'}`
                  : 'Provider not reachable; the API will use the offline fixture.'
              }
              data-testid="ai-provider-pill"
            >
              {providerLabel}
            </Pill>
            <Link to="/scenarios">
              <Button intent="primary">Browse scenarios</Button>
            </Link>
            <Link to="/adventures">
              <Button intent="secondary">My adventures</Button>
            </Link>
          </>
        }
      />

      {continueAdventure && (
        <section
          aria-labelledby="continue"
          data-testid="continue-adventure"
          style={{
            display: 'grid',
            gap: 'var(--space-3)',
            border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4) var(--space-5)',
            background: 'var(--color-surface)',
            marginBottom: 'var(--space-5)',
          }}
        >
          <h2
            id="continue"
            style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', margin: 0 }}
          >
            Continue your adventure
          </h2>
          <p style={{ margin: 0 }}>
            <strong>{continueAdventure.title}</strong>
            <Pill intent="muted" title={`Status: ${continueAdventure.status}`}>
              {continueAdventure.status}
            </Pill>
            <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
              {' '}branch {continueAdventure.current_branch.name} · depth{' '}
              {continueAdventure.current_branch.depth}
            </span>
          </p>
          <div>
            <Link to={`/adventures/${continueAdventure.id}`}>
              <Button intent="primary">Resume</Button>
            </Link>
          </div>
        </section>
      )}

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
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              color: 'var(--color-foreground-muted)',
            }}
          >
            No featured scenario right now. Browse the library to pick one.
          </p>
        ) : (
          <article
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
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
                background: 'var(--color-storyline-mystery)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)' }}>
                {featured.title}
              </h3>
              <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
                {featured.length_estimate_minutes
                  ? `${featured.length_estimate_minutes} min · version ${featured.latest_version}`
                  : `Version ${featured.latest_version}`}
              </p>
              <p className="prose" style={{ margin: 0 }}>{featured.blurb}</p>
              <div>
                <Link to={`/scenarios#${featured.slug}`}>
                  <Button intent="ghost">View scenario</Button>
                </Link>
              </div>
            </div>
          </article>
        )}
      </section>

      <section aria-labelledby="rail" style={{ marginTop: 'var(--space-6)' }}>
        <h2 id="rail" style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)' }}>
          Quick picks
        </h2>
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 'var(--space-3)',
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {fixtureRail.slice(0, 4).map((scenario: ScenarioFixture) => (
            <li
              key={scenario.id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              <strong style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)' }}>
                {scenario.title}
              </strong>
              <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
                {scenario.synopsis}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
