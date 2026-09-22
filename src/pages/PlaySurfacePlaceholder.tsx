import type { CSSProperties, ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { PLAY_FIXTURE, findScenario, type ChoiceFixture } from '@/fixtures/data';

const CHOICE_INTENT: Record<ChoiceFixture['tone'], 'primary' | 'secondary' | 'ghost'> = {
  bold: 'primary',
  cautious: 'secondary',
  playful: 'ghost',
};

export default function PlaySurfacePlaceholder(): ReactElement {
  const { adventureId } = useParams<{ adventureId?: string }>();
  const scenario = adventureId ? findScenario(adventureId) : undefined;

  const [history, setHistory] = useState<readonly ChoiceFixture[]>([]);
  const lastChoice = history[history.length - 1];

  const handleChoice = (choice: ChoiceFixture) => {
    setHistory((prev) => [...prev, choice]);
  };

  const reset = () => setHistory([]);

  const scenarioLabel = useMemo(() => {
    if (!scenario) return 'Sample scenario';
    return scenario.title;
  }, [scenario]);

  return (
    <div>
      <PageHeader
        eyebrow={`Chapter ${PLAY_FIXTURE.chapter} \u00b7 ${PLAY_FIXTURE.beat}`}
        title={scenarioLabel}
        description="The full timeline, composer, and inventory land in S2. This is the Stage S1 fixture: choose a beat to advance the conversation and verify the keyboard / screen reader flow."
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

      <article
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
        aria-live="polite"
      >
        <p className="prose" style={{ margin: 0 }}>
          {PLAY_FIXTURE.narrative}
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
                \u2014 {c.tone}
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
          {PLAY_FIXTURE.choices.map((choice) => {
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
            placeholder="Describe what you do\u2026"
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
              Composer \u00b7 S2
            </Pill>
            <Button intent="primary" disabled aria-label="Disabled until Stage S2 ships">
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
