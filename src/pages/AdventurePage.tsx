import type { CSSProperties, ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { ApiError } from '@/api-client';
import {
  useAdventure,
  useCreateBranch,
  useSubmitTurn,
} from '@/hooks/useAdventures';
import { TURN_FIXTURE, type SuggestedChoice } from '@/fixtures/data';

/**
 * Generates a stable v4 UUID for the idempotency key. We rely on
 * `crypto.randomUUID` (browsers + happy-dom) and fall back to a Math.random
 * fallback so older test environments still produce unique strings.
 */
function makeIdempotencyKey(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `idem-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

const CHOICE_INTENT: Record<string, 'primary' | 'secondary' | 'ghost'> = {
  bold: 'primary',
  cautious: 'secondary',
  playful: 'ghost',
};

export default function AdventurePage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const adventureId = useMemo(() => {
    const parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [id]);

  if (adventureId === undefined) {
    return <Navigate to="/not-a-real-page" replace />;
  }

  return <AdventureSurface adventureId={adventureId} />;
}

function AdventureSurface({ adventureId }: { adventureId: number }): ReactElement {
  const navigate = useNavigate();
  const adventureQuery = useAdventure(adventureId);
  const submitTurn = useSubmitTurn(adventureId);
  const createBranch = useCreateBranch(adventureId);

  const [freeText, setFreeText] = useState('');
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [lastTurnId, setLastTurnId] = useState<number | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  // Refetch the adventure on window focus so a refresh / re-tab picks up the
  // latest branch version before the player submits another turn.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onFocus = () => {
      void adventureQuery.refetch();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [adventureQuery]);

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setDuplicateNotice(null);
      if (!adventureQuery.data) return;
      const branch = adventureQuery.data.current_branch;
      try {
        const turn = await submitTurn.mutateAsync({
          branch_id: branch.id,
          choice_id: selectedChoiceId,
          free_text: freeText.length > 0 ? freeText : null,
          idempotency_key: makeIdempotencyKey(),
          client_version: branch.version,
        });
        setLastTurnId(turn.id);
        setFreeText('');
        setSelectedChoiceId(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409 && err.code === 'version_conflict') {
          // Pull the authoritative branch version before allowing another try.
          await adventureQuery.refetch();
        }
      }
    },
    [adventureQuery, submitTurn, selectedChoiceId, freeText],
  );

  const onFork = useCallback(async () => {
    if (!adventureQuery.data) return;
    const branch = adventureQuery.data.current_branch;
    if (!lastTurnId) return;
    try {
      const branchRes = await createBranch.mutateAsync({
        from_branch_id: branch.id,
        from_turn_id: lastTurnId,
      });
      setDuplicateNotice(`Forked branch “${branchRes.name}”.`);
    } catch (err) {
      setDuplicateNotice(
        err instanceof Error ? err.message : 'Could not fork the branch.',
      );
    }
  }, [adventureQuery, createBranch, lastTurnId]);

  // Render the API error state if the adventure cannot be loaded.
  if (adventureQuery.error) {
    if (adventureQuery.error instanceof ApiError && adventureQuery.error.status === 404) {
      return <Navigate to="/not-a-real-page" replace />;
    }
    return (
      <div>
        <PageHeader eyebrow="Adventure" title="Could not load this adventure" />
        <p role="alert" style={errorPanel}>
          {adventureQuery.error.message}
        </p>
        <Button intent="secondary" onClick={() => void navigate('/scenarios')}>
          Back to library
        </Button>
      </div>
    );
  }

  if (adventureQuery.isLoading || !adventureQuery.data) {
    return <LoadingPanel label="Loading your adventure" intent="page" />;
  }

  const adventure = adventureQuery.data;
  const choices: ReadonlyArray<SuggestedChoice> = TURN_FIXTURE.suggested_choices;
  const isSubmitting = submitTurn.isPending;
  const conflictError =
    submitTurn.error instanceof ApiError && submitTurn.error.status === 409;

  return (
    <div>
      <PageHeader
        eyebrow={`Adventure #${adventure.id} · ${adventure.status}`}
        title={adventure.title}
        description={`Branch ${adventure.current_branch.name} (depth ${adventure.current_branch.depth}, version ${adventure.current_branch.version}).`}
        actions={
          <>
            <Link to="/scenarios">
              <Button intent="ghost">Library</Button>
            </Link>
            <Button intent="secondary" disabled={!lastTurnId || createBranch.isPending} onClick={() => void onFork()}>
              {createBranch.isPending ? 'Forking…' : 'Fork branch'}
            </Button>
          </>
        }
      />

      {duplicateNotice && (
        <p role="status" aria-live="polite" style={noticeStyle}>
          {duplicateNotice}
        </p>
      )}

      <article style={cardStyle} aria-live="polite">
        <Pill intent="muted" title={`Sequence #${TURN_FIXTURE.sequence_number}`}>
          Turn #{TURN_FIXTURE.sequence_number}
        </Pill>
        <p className="prose" style={{ margin: 0 }}>
          {TURN_FIXTURE.narration}
        </p>

        <div
          aria-label="Suggested choices"
          style={{
            display: 'grid',
            gap: 'var(--space-2)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {choices.map((choice) => {
            const intent =
              selectedChoiceId === choice.id
                ? 'primary'
                : (CHOICE_INTENT[choice.id.split('-')[1] ?? ''] ?? 'secondary');
            return (
              <Button
                key={choice.id}
                intent={intent}
                onClick={() => setSelectedChoiceId(choice.id)}
                aria-pressed={selectedChoiceId === choice.id}
              >
                {choice.label}
              </Button>
            );
          })}
        </div>
      </article>

      {conflictError && (
        <p role="alert" style={errorPanel}>
          {submitTurn.error?.message ?? 'The branch was updated elsewhere. Pulling the latest version…'}
        </p>
      )}
      {submitTurn.error && !conflictError && (
        <p role="alert" style={errorPanel}>
          {submitTurn.error.message}
        </p>
      )}

      <section style={{ marginTop: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-serif)' }}>Composer</h2>
        <form
          onSubmit={(event) => void onSubmit(event)}
          style={composerStyle}
          aria-describedby="composer-help"
        >
          <label htmlFor="composer" style={{ fontWeight: 'var(--weight-medium)' }}>
            Say or do something
          </label>
          <textarea
            id="composer"
            name="composer"
            rows={3}
            placeholder="Describe what you do…"
            value={freeText}
            onChange={(event) => setFreeText(event.target.value)}
            maxLength={2000}
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
          <span id="composer-help" style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
            Submitting a turn requires a chosen option or free text. We attach an idempotency
            key so retries do not duplicate your turn.
          </span>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              intent="primary"
              type="submit"
              disabled={isSubmitting || (!selectedChoiceId && freeText.trim().length === 0)}
            >
              {isSubmitting ? 'Submitting…' : 'Submit turn'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-5) var(--space-6)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
};

const composerStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-3)',
  background: 'var(--color-surface-muted)',
  padding: 'var(--space-4)',
  borderRadius: 'var(--radius-md)',
  marginTop: 'var(--space-3)',
};

const errorPanel: CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  border: '1px solid var(--color-danger)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-danger)',
  fontSize: 'var(--text-sm)',
  margin: 'var(--space-3) 0',
};

const noticeStyle: CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  border: '1px solid var(--color-info)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-foreground)',
  fontSize: 'var(--text-sm)',
  margin: '0 0 var(--space-3) 0',
};
