import type { CSSProperties, ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { usePlayTurn, useScenario } from '@/hooks';
import { PLAY_FIXTURE, type ChoiceFixture } from '@/fixtures/data';

// TODO(S2-T01): The full timeline now lives on `/api/adventures/:id` (see
// `AdventurePage`). Remove this file once the route map no longer falls back
// to `/play/:adventureId` and the redirect logic in `router/index.tsx`
// exclusively sends players to `/adventures/:id`. The placeholder remains so
// unknown adventure IDs (legacy deep links) still render something readable
// while the S2 cutover is in flight.

const CHOICE_INTENT: Record<ChoiceFixture['tone'], 'primary' | 'secondary' | 'ghost'> = {
  bold: 'primary',
  cautious: 'secondary',
  playful: 'ghost',
};

export default function PlaySurfacePlaceholder(): ReactElement {
  const { adventureId } = useParams<{ adventureId?: string }>();

  // Legacy S1 contract: `/api/scenarios/:id` and `/api/scenarios/:id/play-turn`.
  // The api-client falls back to fixtures when the API is unreachable so the
  // placeholder keeps working in dev.
  // TODO(S2-T01): replace with `/api/adventures/:id` once the cutover lands.
  const scenarioQuery = useScenario(adventureId);
  const turnQuery = usePlayTurn(adventureId);

  const [history, setHistory] = useState<readonly ChoiceFixture[]>([]);
  const lastChoice = history[history.length - 1];

  const handleChoice = (choice: ChoiceFixture) => {
    setHistory((prev) => [...prev, choice]);
  };

  const reset = () => setHistory([]);

  const scenarioLabel = useMemo(() => {
    if (scenarioQuery.data) return scenarioQuery.data.title;
    if (adventureId) return `Scenario ${adventureId}`;
    return 'Sample scenario';
  }, [scenarioQuery.data, adventureId]);

  const turn = turnQuery.data ?? PLAY_FIXTURE;
  const isInitialLoading = scenarioQuery.isLoading || turnQuery.isLoading;

  return (
    <div>
      <PageHeader
        eyebrow={`Chapter ${turn.chapter} · ${turn.beat}`}
        title={scenarioLabel}
        description="Offline fallback for the live play surface. While the api is unreachable, choose a beat to step through the conversation and verify the keyboard / screen reader flow."
        actions={
          <>
            <Link to="/scenarios">
              <Button intent="ghost">Switch scenario</Button>
            </Link>
            {history.length > 0 && (
              <Button intent="secondary" onClick={reset}>
                Reset choices
              </Button>
            )}
          </>
        }
      />

      {isInitialLoading ? (
        <LoadingPanel label="Loading play turn" intent="inline" />
      ) : (
        <article
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-5) var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
          aria-live="polite"
        >
          <p className="prose" style={{ margin: 0 }}>
            {turn.narrative}
          </p>

          {history.length > 0 && (
            <ol
              aria-label="Choices you have made"
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--space-3)',
                margin: 0,
                padding: 'var(--space-3) 0 0 0',
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              {history.map((c, index) => (
                <li key={`${c.id}-${index}`} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-foreground-muted)' }}>
                  <strong style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-serif)' }}>
                    {index + 1}. {c.label}
                  </strong>{' '}
                  — {c.tone}
                </li>
              ))}
            </ol>
          )}

          <div
            aria-label="Available choices"
            style={{
              display: 'grid',
              gap: 'var(--space-2)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            {turn.choices.map((choice) => {
              const intent = lastChoice?.id === choice.id ? 'primary' : CHOICE_INTENT[choice.tone];
              return (
                <Button
                  key={choice.id}
                  intent={intent}
                  onClick={() => handleChoice(choice)}
                  aria-label={`Choose: ${choice.label} (${choice.tone})`}
                >
                  {choice.label}
                </Button>
              );
            })}
          </div>
        </article>
      )}

      <section style={{ marginTop: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-serif)' }}>Composer preview</h2>
        <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
          Free-form input is wired up here but the S2 timeline will own it. Disabled controls keep a readable reason.
        </p>
        <form
          onSubmit={(event) => event.preventDefault()}
          style={{
            display: 'grid',
            gap: 'var(--space-3)',
            background: 'var(--color-surface-muted)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginTop: 'var(--space-3)',
          }}
        >
          <label htmlFor="composer" style={{ fontWeight: 'var(--weight-medium)' }}>
            Say or do something
          </label>
          <textarea
            id="composer"
            name="composer"
            rows={3}
            placeholder="Describe what you do…"
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-surface)',
              color: 'var(--color-foreground)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-base)',
              resize: 'vertical',
              minHeight: 'calc(var(--control-touch-min) * 2)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill intent="muted" title="Disabled until S2">
              Composer · S2
            </Pill>
            <Button intent="primary" disabled aria-label="Disabled in this build">
              Send (S2)
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

const _styles: CSSProperties = {};
void _styles;
