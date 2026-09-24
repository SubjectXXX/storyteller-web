/**
 * `<ScenarioDetailPage>` — renders a single published scenario by `slug`.
 *
 * The api exposes `GET /api/scenarios/{slug}` so we hit it directly. When
 * that endpoint is offline (no api worker) the page falls back to the
 * `SCENARIO_RESOURCE_FIXTURES` list and filters client-side by `slug` —
 * this matches the S1 contract the rest of the SPA already uses.
 *
 * The page intentionally mirrors the fields the api actually returns
 * (see `application/api/app/Http/Resources/ScenarioResource.php`) — no
 * synthetic `length_estimate_minutes` etc. unless the api provides them.
 */
import type { CSSProperties, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useApiClient } from '@/api-client';
import { ApiError } from '@/api-client';
import { SCENARIO_RESOURCE_FIXTURES, type ScenarioResource } from '@/fixtures/data';
import { useStartAdventure } from '@/hooks/useAdventures';

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  color: 'var(--color-foreground-muted)',
  fontSize: 'var(--text-sm)',
  marginBottom: 'var(--space-3)',
  textDecoration: 'none',
};

const coverStyle: CSSProperties = {
  height: 220,
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-storyline-mystery)',
  marginBottom: 'var(--space-4)',
};

const metaRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 'var(--space-3)',
};

const tagRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-1)',
  flexWrap: 'wrap',
};

const proseStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 'var(--text-lg)',
  lineHeight: 1.55,
  color: 'var(--color-foreground)',
  margin: 0,
};

const actionRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-3)',
  alignItems: 'center',
  marginTop: 'var(--space-5)',
  flexWrap: 'wrap',
};

const errorPanelStyle: CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  border: '1px solid var(--color-danger)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-danger)',
  background: 'var(--color-surface-muted)',
  fontSize: 'var(--text-sm)',
};

export default function ScenarioDetailPage(): ReactElement {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const api = useApiClient();
  const startAdventure = useStartAdventure();
  const [startingSlug, setStartingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scenario, setScenario] = useState<ScenarioResource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const live = await api.getScenario(slug);
        if (cancelled) return;
        setScenario(live);
      } catch (err) {
        // The api endpoint may not be live (S1 fixture shell). Fall back to
        // the local fixture list so the detail page is still reachable in
        // offline builds.
        if (cancelled) return;
        const fixture = SCENARIO_RESOURCE_FIXTURES.find((s) => s.slug === slug);
        if (fixture) {
          setScenario(fixture);
        } else if (err instanceof ApiError && err.status === 404) {
          setError('Scenario not found.');
        } else {
          setError(err instanceof Error ? err.message : 'Could not load scenario.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, slug]);

  const handleStart = async () => {
    if (!scenario) return;
    setError(null);
    setStartingSlug(scenario.slug);
    try {
      const adventure = await startAdventure.mutateAsync({ scenario_slug: scenario.slug });
      navigate(`/adventures/${adventure.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start adventure.');
      setStartingSlug(null);
    }
  };

  if (loading) {
    return (
      <div>
        <Link to="/scenarios" style={backLinkStyle}>← Back to library</Link>
        <PageHeader eyebrow="Scenario" title="Loading scenario" />
        <LoadingPanel label="Loading scenario" intent="inline" />
      </div>
    );
  }

  if (error && !scenario) {
    return (
      <div>
        <Link to="/scenarios" style={backLinkStyle}>← Back to library</Link>
        <PageHeader eyebrow="Scenario" title="Scenario unavailable" />
        <p role="alert" style={errorPanelStyle}>{error}</p>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div>
        <Link to="/scenarios" style={backLinkStyle}>← Back to library</Link>
        <PageHeader eyebrow="Scenario" title="Not found" />
      </div>
    );
  }

  return (
    <div>
      <Link to="/scenarios" style={backLinkStyle} aria-label="Back to scenario library">
        ← Back to library
      </Link>
      <div aria-hidden style={coverStyle} data-testid={`scenario-detail-cover-${scenario.slug}`} />
      <PageHeader
        eyebrow="Scenario"
        title={scenario.title}
        description={scenario.is_featured ? 'Featured scenario' : undefined}
      />
      <div style={metaRowStyle}>
        <Pill intent="info" title={`Latest published version`}>
          v{scenario.latest_version ?? '—'}
        </Pill>
        {scenario.is_published ? (
          <Pill intent="success">Published</Pill>
        ) : (
          <Pill intent="warning">Draft</Pill>
        )}
      </div>
      <p style={proseStyle}>{scenario.blurb}</p>
      {scenario.tags.length > 0 && (
        <div style={{ ...tagRowStyle, marginTop: 'var(--space-4)' }} aria-label="Scenario tags">
          {scenario.tags.map((tag) => (
            <span
              key={tag}
              title={`Tag: ${tag}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: '2px var(--space-2)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-muted)',
                color: 'var(--color-foreground-muted)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" style={{ ...errorPanelStyle, marginTop: 'var(--space-3)' }}>
          {error}
        </p>
      )}
      <div style={actionRowStyle}>
        <Button
          intent="primary"
          onClick={() => void handleStart()}
          disabled={startingSlug === scenario.slug}
          aria-label={`Start adventure on ${scenario.title}`}
        >
          {startingSlug === scenario.slug ? 'Starting…' : 'Start adventure'}
        </Button>
        <Link
          to="/scenarios"
          style={{
            color: 'var(--color-foreground-muted)',
            fontSize: 'var(--text-sm)',
            textDecoration: 'underline',
          }}
        >
          Back to library
        </Link>
      </div>
    </div>
  );
}
