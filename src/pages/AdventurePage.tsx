import type { CSSProperties, ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Archive, Image as ImageIcon } from 'lucide-react';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { PageHeader } from '@/ui/PageHeader';
import { LoadingPanel } from '@/components/LoadingPanel';
import { TokenMeter } from '@/components/TokenMeter';
import { Typewriter } from '@/components/Typewriter';
import { ApiError, type AdventureSettingsUpdateRequest } from '@/api-client';
import {
  useAdventure,
  useAdventureStream,
  useSubmitTurn,
} from '@/hooks/useAdventures';
import {
  useAdventureSettings,
  useAdventureSettingsEtag,
  useEffectiveSettings,
  useUpdateAdventureSettings,
} from '@/hooks/useAdventureSettings';
import { usePlayerSettings } from '@/hooks/usePlayerSettings';
import { useScenarioVersion } from '@/hooks/useScenarios';
import { useBranchTree, useBranchTreeAccessors } from '@/hooks/useBranchTree';
import { useRetryBranch, useUndoBranch, useRedoBranch } from '@/hooks/useBranchOps';
import { useCharacter } from '@/hooks/useCharacter';
import { useNpcRoster } from '@/hooks/useNpcRoster';
import { useDiceClock } from '@/hooks/useDiceClock';
import { useInventory } from '@/hooks/useInventory';
import { ContextRail } from '@/features/play/ContextRail/ContextRail';
import { ActionBar } from '@/features/play/ActionBar/ActionBar';
import { ImagePanel } from '@/features/play/ImagePanel/ImagePanel';
import { NextTurnPending, TurnPlaceholders } from '@/features/play/TurnPlaceholders/TurnPlaceholders';
import { AdventureSettingsDrawer } from '@/features/settings/AdventureSettingsDrawer';
import { HUD_SCROLL_STICKY_PX, HUD_STORY_MEASURE } from '@/features/play/hudLayout';
import { TURN_FIXTURE, type SuggestedChoice } from '@/fixtures/data';
import type { Quest } from '@/features/play/QuestLog/QuestLog';

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

/**
 * `current_branch.state` / `ScenarioVersion.starting_state` are free-form
 * records on the wire (`App\Http\Resources\AdventureResource`,
 * `ScenarioController::version`). Read a player-facing label out of one
 * value, accepting both the object form the seeders write
 * (`{name: 'Fen Alderwick'}`) and a bare string.
 */
function readStateLabel(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const name = (value as Record<string, unknown>).name;
    if (typeof name === 'string' && name.trim() !== '') return name;
  }
  return null;
}

function readStateLabels(value: unknown): ReadonlyArray<string> {
  if (!Array.isArray(value)) return [];
  const labels = value.map(readStateLabel);
  return labels.filter((label): label is string => label !== null);
}

// `data-testid` exposed to integration / viewport tests so the assertions
// can target a single canonical element rather than scraping the DOM.
export const ADVENTURE_PAGE_TESTIDS = {
  surface: 'adventure-surface',
  worldGrid: 'adventure-world-grid',
  liveRegion: 'adventure-live-region',
  settingsButton: 'open-adventure-settings',
} as const;

/** Id of the visually hidden explanation for the inert archive link. */
const ARCHIVE_UNAVAILABLE_HINT_ID = 'scene-archive-unavailable-hint';

/**
 * Why the archive affordance in the scene caption row is disabled.
 * `ImageAsset` is `{id, url, width, height, alt}` — there is no archive
 * route and no listing endpoint behind one, so the control is rendered
 * `disabled` rather than linked to a URL that would 404.
 */
const ARCHIVE_UNAVAILABLE_REASON =
  'The image archive does not exist yet: there is no archive route and no listing endpoint, so this link is disabled rather than pointing somewhere that would fail.';

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
  const stream = useAdventureStream(adventureId, {
    // Re-subscribe after the player submits a turn so the SSE endpoint
    // picks up the latest narration. We use `lastTurnId ?? 0` to mean
    // "start from the beginning of the active branch".
    sinceTurnId: 0,
  });

  // Stage 4 panel queries. Each is fault-tolerant: loading and error
  // states are rendered inline by the panels themselves, so the page
  // continues to render even when an individual endpoint is offline.
  const characterQuery = useCharacter(adventureId);
  const npcQuery = useNpcRoster(adventureId);
  // The recap is no longer fetched here: the "Memory & Lore" tab of the
  // context rail mounts <MemoryPanel>, which fetches the recap itself.
  // Keeping a second copy of this query here fired a redundant request on
  // every mount and left the result unreachable.
  const branchTreeQuery = useBranchTree(adventureId);
  // The branch tree is no longer *rendered* anywhere on the player view
  // (no tree, no fork, no branch card), but it is still the only
  // authoritative source of the `can_undo` / `can_redo` / `can_retry`
  // flags that gate the surviving Undo / Redo / Retry actions in the
  // bottom bar. `useBranchTreeAccessors` already reads them off the
  // active node, so the disabled logic is unchanged.
  const branchFlags = useBranchTreeAccessors(branchTreeQuery).flags;
  const adventureSettingsQuery = useAdventureSettings(adventureId);
  const playerSettingsQuery = usePlayerSettings();
  const retryBranch = useRetryBranch(adventureId);
  const undoBranch = useUndoBranch(adventureId);
  const redoBranch = useRedoBranch(adventureId);
  const updateAdventureSettings = useUpdateAdventureSettings(adventureId);

  // Mechanics / inventory / effective-settings hooks must be called
  // unconditionally (Rules of Hooks). They accept null/undefined input
  // so the page can render with the data once it arrives.
  const branchState = adventureQuery.data?.current_branch.state ?? null;
  const mechanicEvent = useDiceClock(stream.usage, branchState);
  const inventory = useInventory(branchState ?? undefined);
  const effectiveSettingsQuery = useEffectiveSettings(adventureId, undefined);
  // `scenario.quests` is not yet on the API; the QuestLog renders an
  // empty state until the seed worker ships quests. Memoised to a
  // stable empty array so the child reference does not change on
  // every render.
  const quests = useMemo<ReadonlyArray<Quest>>(() => [], []);

  // The opening `suggested_choices` exist on exactly one endpoint:
  // `GET /api/scenarios/{slug}/versions/{version}`. `GET /api/adventures/{id}`
  // carries the branch `state` but no choices, and the turn POST only
  // answers once the player has already taken a turn. Read straight off
  // the adventure query so the hook stays unconditional.
  const scenarioVersionQuery = useScenarioVersion(
    adventureQuery.data?.scenario_slug,
    adventureQuery.data?.scenario_version,
  );

  // Choice buttons, in the order the real sources are authoritative:
  //   1. the latest turn the API streamed (post-play suggestions),
  //   2. the scenario version's opening choices (pre-play),
  //   3. the offline fixture, and only when the API gave us neither.
  // Computed before the loading / error early-returns so `onSubmit` can
  // resolve the label of the option the player picked.
  const turnChoices = stream.liveSuggestedChoices;
  const openingChoices = scenarioVersionQuery.data?.suggested_choices ?? [];
  const hasRealChoices = turnChoices.length > 0 || openingChoices.length > 0;
  const choices: ReadonlyArray<SuggestedChoice> =
    turnChoices.length > 0
      ? turnChoices
      : openingChoices.length > 0
        ? openingChoices
        : TURN_FIXTURE.suggested_choices;

  const [freeText, setFreeText] = useState('');
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [lastTurnId, setLastTurnId] = useState<number | null>(null);
  /**
   * Verbatim text (or chosen-option label) of the turn the player last
   * submitted. Rendered in the story column's player-action card. This
   * is exactly what the player sent — nothing is reconstructed.
   */
  const [lastPlayerAction, setLastPlayerAction] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [settingsConflict, setSettingsConflict] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState<
    | {
        readonly theme?: 'light' | 'dark' | 'system';
        readonly narration_verbosity?: 'terse' | 'balanced' | 'rich';
      }
    | null
  >(null);

  // Latest ETag from the cached GET response. The drawer wires this into the
  // PUT so a stale write from another tab is rejected with 409 instead of
  // silently overwriting the other tab's changes.
  const adventureEtag = useAdventureSettingsEtag(adventureId);

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

  // Whenever the active branch changes (after a fresh fetch or a branch
  // op) reset the branch error banner so the next error replaces it.
  useEffect(() => {
    setBranchError(null);
  }, [adventureQuery.data?.current_branch.id]);

  // ---- Story-column scroll pinning -------------------------------------
  // The story column is the only vertically scrolling region. When a new
  // turn (or more of the current turn) arrives we follow it to the
  // bottom — but only while the player is already at (or near) the
  // bottom. A player who has scrolled up to re-read history is never
  // yanked back.
  const storyScrollRef = useRef<HTMLElement | null>(null);
  const followStoryRef = useRef(true);

  const onStoryScroll = useCallback(() => {
    const el = storyScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    followStoryRef.current = distanceFromBottom <= HUD_SCROLL_STICKY_PX;
  }, []);

  // Depends on the live turn id (a new turn, and therefore a new image
  // job, starts here) and on the narration length (this turn is still
  // streaming). `<ImagePanel>` owns its job/asset state internally, so
  // a brand new asset is only observable through the turn that
  // requested it.
  const liveTurnId = stream.liveTurnId ?? undefined;
  const narrationLength = stream.liveNarration.length;
  useEffect(() => {
    const el = storyScrollRef.current;
    if (!el || !followStoryRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [liveTurnId, narrationLength, adventureId]);

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!adventureQuery.data) return;
      const branch = adventureQuery.data.current_branch;
      // Echo the player's own words into the story column. Prefer the
      // free text; when only a suggested option was picked, use that
      // option's label so the card is never blank.
      const choiceLabel = selectedChoiceId
        ? (choices.find((c) => c.id === selectedChoiceId)?.label ?? null)
        : null;
      setLastPlayerAction(freeText.trim() !== '' ? freeText : choiceLabel);
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
    [adventureQuery, choices, submitTurn, selectedChoiceId, freeText],
  );

  const onRetry = useCallback(async () => {
    setBranchError(null);
    if (!adventureQuery.data || !lastTurnId) return;
    try {
      await retryBranch.mutateAsync({ turn_id: lastTurnId, name: null });
    } catch (err) {
      setBranchError(err instanceof Error ? err.message : 'Could not retry branch.');
    }
  }, [adventureQuery, retryBranch, lastTurnId]);

  const onUndo = useCallback(async () => {
    setBranchError(null);
    if (!adventureQuery.data) return;
    try {
      await undoBranch.mutateAsync({ turn_id: lastTurnId });
    } catch (err) {
      setBranchError(err instanceof Error ? err.message : 'Could not undo turn.');
    }
  }, [adventureQuery, undoBranch, lastTurnId]);

  const onRedo = useCallback(async () => {
    setBranchError(null);
    if (!adventureQuery.data) return;
    try {
      await redoBranch.mutateAsync({ turn_id: lastTurnId });
    } catch (err) {
      setBranchError(err instanceof Error ? err.message : 'Could not redo turn.');
    }
  }, [adventureQuery, redoBranch, lastTurnId]);

  const onSaveAdventureSettings = useCallback(
    async (body: AdventureSettingsUpdateRequest) => {
      setSettingsConflict(null);
      try {
        await updateAdventureSettings.mutateAsync({
          ...body,
          if_match: adventureEtag,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          // Optimistic-concurrency collision: another tab updated the
          // settings first. The hook already invalidated the cached GET
          // (see `useUpdateAdventureSettings.onError`) so the drawer
          // re-renders with the fresh server state; we just surface a
          // toast-equivalent so the player knows to retry.
          setSettingsConflict(
            err.message ||
              'Adventure settings changed in another tab. The drawer now shows the latest values — please retry.',
          );
          return;
        }
        if (!(err instanceof ApiError)) {
          // eslint-disable-next-line no-console -- intentional dev signal
          console.warn('[storyteller/web] save adventure settings failed', err);
        }
        throw err;
      }
    },
    [adventureEtag, updateAdventureSettings],
  );

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
  const isSubmitting = submitTurn.isPending;
  const conflictError =
    submitTurn.error instanceof ApiError && submitTurn.error.status === 409;

  // Narration comes from the stream. A branch that has not been played
  // has no turn to narrate yet, so we say so rather than dressing a
  // fixture beat up as the story; the fixture text is only reached when
  // the API returned no branch state and no scenario version at all.
  const hasLiveNarration = stream.liveNarration.length > 0;
  const stateSource =
    branchState !== null && Object.keys(branchState).length > 0
      ? branchState
      : (scenarioVersionQuery.data?.starting_state ?? null);
  const hasRealScenarioData = scenarioVersionQuery.data !== undefined || stateSource !== null;
  const showFixtureNarration = !hasLiveNarration && !hasRealScenarioData;
  const narration = hasLiveNarration ? stream.liveNarration : TURN_FIXTURE.narration;
  const isStreaming = stream.streaming;
  const streamInterrupted = stream.error !== null && !isStreaming;
  const sequenceNumber = stream.liveSequenceNumber;
  // The starting state is a free-form record on the wire, so the
  // player-facing fields are read defensively (see `readStateLabel`).
  // Pure derivation off already-rendered values — cheap enough to
  // recompute per render, same as `previewStyle` below.
  const startingState = {
    location: readStateLabel(stateSource?.location),
    character: readStateLabel(stateSource?.character),
    // `useInventory` already parsed the structured item shape; the raw
    // list covers the plain-string form the scenario seeders write.
    inventory:
      inventory.items.length > 0
        ? inventory.items.map((item) => item.name)
        : readStateLabels(stateSource?.inventory),
    npcs: readStateLabels(stateSource?.npcs),
  };

  const resolvedMechanicEvent = mechanicEvent;

  // Effective settings power the live typography preview: when the
  // player toggles theme / verbosity in the AdventureSettingsDrawer the
  // page picks up the change without waiting for a refetch.
  // Guard with `?.find` (not `data?.groups.find`) so a shape mismatch
  // (e.g. older API returning `data.settings` instead of `data.groups`)
  // can't crash the page with `.find on undefined`.
  const effectiveGroups = effectiveSettingsQuery.data?.groups;
  const resolvedTheme =
    livePreview?.theme ??
    effectiveGroups?.find((g) => g.id === 'theme')?.effective_value ??
    'system';
  const resolvedVerbosity =
    livePreview?.narration_verbosity ??
    effectiveGroups?.find((g) => g.id === 'narration_verbosity')?.effective_value ??
    'balanced';

  // Live typography preview: when the player toggles theme/verbosity in the
  // AdventureSettingsDrawer the article re-renders with the new palette
  // and line-height without waiting for the save mutation to settle.
  // Pure computation; cheap enough that we recompute per render.
  const previewStyle = buildTypographyPreviewStyle(resolvedTheme, resolvedVerbosity);

  // `scenario.quests` is not yet on the API; the QuestLog renders an
  // empty state until the seed worker ships quests. When the manifest
  // adds them we surface the first three as a static list so the panel
  // stays clickable.

  // ---- HUD frame -------------------------------------------------------
  // Row 2 of the frame: the scrolling story column + the pinned rail.
  // Row 3 (the action bar) and the settings drawer hang off the surface.
  const branchOpsPending =
    retryBranch.isPending || undoBranch.isPending || redoBranch.isPending;

  return (
    <div data-testid={ADVENTURE_PAGE_TESTIDS.surface} style={surfaceStyle}>
      <div style={bodyRowStyle}>
        <section
          aria-label="Story"
          data-testid="adventure-story-column"
          ref={storyScrollRef}
          onScroll={onStoryScroll}
          style={storyColumnStyle}
        >
          <div style={storyMeasureStyle}>
            <div style={storyHeaderStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={eyebrowStyle}>
                  Adventure #{adventure.id} · {adventure.status}
                </p>
                <h1 style={titleStyle}>{adventure.title}</h1>
              </div>
              <div style={storyHeaderActionsStyle}>
                {/* A plain router link rather than a <Button> inside a
                    <Link>: nesting interactive elements is an a11y error
                    and this keeps one focusable control per destination. */}
                <Link to="/scenarios" style={ghostLinkStyle}>
                  Library
                </Link>
                <Button
                  intent="ghost"
                  size="sm"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open per-adventure settings"
                  data-testid={ADVENTURE_PAGE_TESTIDS.settingsButton}
                >
                  Settings
                </Button>
              </div>
            </div>

            {branchError && (
              <p role="alert" data-testid="branch-error" style={errorPanel}>
                {branchError}
              </p>
            )}
            {streamInterrupted && stream.error && (
              <p role="alert" data-testid="stream-interrupted" style={errorPanel}>
                Stream interrupted: {stream.error.message}
              </p>
            )}
            {conflictError && (
              <p role="alert" style={errorPanel}>
                {submitTurn.error?.message ??
                  'The branch was updated elsewhere. Pulling the latest version\u2026'}
              </p>
            )}
            {submitTurn.error && !conflictError && (
              <p role="alert" style={errorPanel}>
                {submitTurn.error.message}
              </p>
            )}
            {settingsConflict && (
              <p role="alert" data-testid="settings-conflict" style={noticeStyle}>
                {settingsConflict}
                <Button
                  intent="ghost"
                  size="sm"
                  onClick={() => setSettingsConflict(null)}
                  aria-label="Dismiss settings conflict notice"
                >
                  Dismiss
                </Button>
              </p>
            )}

            {/* 1 — Session / prologue card. Built only from data the
                adventure and its scenario version actually carry; the
                adventure resource has no `description` field, so none
                is invented here. */}
            <Card
              title="Session"
              tone="muted"
              subtitle={
                <span style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <Pill intent="neutral" title="Scenario slug">
                    {adventure.scenario_slug}
                  </Pill>
                  <Pill intent="muted" title="Scenario version">
                    v{adventure.scenario_version}
                  </Pill>
                  {scenarioVersionQuery.data?.manifest.length_estimate_minutes != null && (
                    <Pill intent="muted" title="Estimated session length">
                      ~{scenarioVersionQuery.data.manifest.length_estimate_minutes} min
                    </Pill>
                  )}
                </span>
              }
            >
              {(startingState.location !== null ||
                startingState.character !== null ||
                startingState.inventory.length > 0 ||
                startingState.npcs.length > 0) && (
                <section
                  aria-label="Starting state"
                  data-testid={ADVENTURE_PAGE_TESTIDS.worldGrid}
                  style={worldGridStyle}
                >
                  {startingState.location !== null && (
                    <div style={stateCardStyle}>
                      <h2 style={stateHeadingStyle}>Location</h2>
                      <Pill intent="neutral" title={startingState.location}>
                        {startingState.location}
                      </Pill>
                    </div>
                  )}
                  {startingState.character !== null && (
                    <div style={stateCardStyle}>
                      <h2 style={stateHeadingStyle}>You are</h2>
                      <Pill intent="muted" title={startingState.character}>
                        {startingState.character}
                      </Pill>
                    </div>
                  )}
                  {startingState.inventory.length > 0 && (
                    <div style={stateCardStyle}>
                      <h2 style={stateHeadingStyle}>Carrying</h2>
                      <ul style={stateListStyle}>
                        {startingState.inventory.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {startingState.npcs.length > 0 && (
                    <div style={stateCardStyle}>
                      <h2 style={stateHeadingStyle}>People</h2>
                      <ul style={stateListStyle}>
                        {startingState.npcs.map((npc) => (
                          <li key={npc}>{npc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}
              {(scenarioVersionQuery.data?.manifest.content_warnings.length ?? 0) > 0 && (
                <p style={contentWarningStyle}>
                  Content warnings:{' '}
                  {scenarioVersionQuery.data?.manifest.content_warnings.join(', ')}
                </p>
              )}
            </Card>

            {/* 1.5 — Inert earlier-turn slots. There is no turns
                endpoint, so the column would otherwise hold a single
                card and stop reading as a timeline. These are
                placeholders only: no prose, not focusable, no request.
                See `<TurnPlaceholders>`. */}
            <TurnPlaceholders count={3} />

            {/* 2 — Game Master card: the live narration beat. */}
            <article
              data-testid={ADVENTURE_PAGE_TESTIDS.liveRegion}
              style={{ ...cardStyle, ...previewStyle }}
              aria-live="polite"
            >
              <div style={metaRowStyle}>
                <Pill intent="neutral" title="Who is narrating this turn">
                  Game Master
                </Pill>
                <Pill
                  intent="muted"
                  title={
                    sequenceNumber === null
                      ? 'This branch has no turns yet'
                      : `Sequence #${sequenceNumber}`
                  }
                >
                  {sequenceNumber === null ? 'No turn yet' : `Turn #${sequenceNumber}`}
                </Pill>
                {isStreaming && (
                  <Pill intent="info" title="Live stream is open">
                    Streaming…
                  </Pill>
                )}
                <Pill intent="muted" title={`Theme: ${resolvedTheme}`}>
                  Theme: {String(resolvedTheme)}
                </Pill>
                <Pill intent="muted" title={`Narration verbosity: ${String(resolvedVerbosity)}`}>
                  Verbosity: {String(resolvedVerbosity)}
                </Pill>
              </div>
              <div className="prose" style={{ margin: 0, minHeight: '4lh' }}>
                {isStreaming || hasLiveNarration ? (
                  <Typewriter
                    text={hasLiveNarration ? narration : ''}
                    key={`turn-${liveTurnId ?? 'pending'}`}
                    ariaLabel={
                      sequenceNumber === null ? 'Narration' : `Turn ${sequenceNumber} narration`
                    }
                  />
                ) : showFixtureNarration ? (
                  narration
                ) : (
                  'No narration yet — this branch has no turns. Pick one of the opening choices or describe what you do.'
                )}
              </div>
              <TokenMeter usage={stream.usage} />

              {(showFixtureNarration || !hasRealChoices) && (
                <p role="status" data-testid="fixture-fallback" style={noticeStyle}>
                  Offline fixture copy — the API returned no turn narration and no scenario choices
                  for this branch.
                </p>
              )}

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
                  // The API's choices carry a `description`; Button has no
                  // `title` prop, so the hint rides along as a described-by
                  // caption instead of being dropped.
                  const hintId = `choice-hint-${choice.id}`;
                  return (
                    <div key={choice.id} style={{ display: 'grid', gap: 'var(--space-1)' }}>
                      <Button
                        intent={intent}
                        onClick={() => setSelectedChoiceId(choice.id)}
                        aria-pressed={selectedChoiceId === choice.id}
                        aria-describedby={choice.description ? hintId : undefined}
                      >
                        {choice.label}
                      </Button>
                      {choice.description && (
                        <span
                          id={hintId}
                          style={{ fontSize: 'var(--text-xs)', color: 'var(--color-foreground-muted)' }}
                        >
                          {choice.description}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>

            {/* 3 — Player action card: the text this client actually
                submitted on the previous turn. */}
            {lastPlayerAction !== null && (
              <div data-testid="player-action-card" style={playerActionStyle}>
                <span style={playerActionLabelStyle}>You</span>
                <p style={playerActionTextStyle}>{lastPlayerAction}</p>
              </div>
            )}

            {/* 4 — Visual. `<ImagePanel>` owns the image job, so it is
                asked to render the design's caption row around the one
                genuine Regenerate handler: an honest scene label on the
                left, Regenerate and the (inert) archive affordance on
                the right. `<ImagePanel>` still owns Retry and the
                carousel, which are reused rather than duplicated. */}
            <figure style={visualFigureStyle}>
              <ImagePanel
                adventureId={adventure.id}
                branchId={adventure.current_branch.id}
                turnId={liveTurnId}
                title="Scene"
                renderActions={({ regenerate, isLoading, isDisabled }) => (
                  /* A plain <div>, not a <figcaption>: `<ImagePanel>`
                     renders this inside its own `<Card>` (an
                     `<article><div>`), so a <figcaption> here would be
                     nested three levels below the enclosing <figure>,
                     which is invalid. The label text still reads in
                     document order inside the "Scene" card. */
                  <div style={visualCaptionStyle}>
                    <span style={visualCaptionLabelStyle}>
                      <ImageIcon size={12} strokeWidth={1.75} aria-hidden="true" />
                      {liveTurnId === undefined
                        ? 'No rendered scene yet — generate one from the latest turn.'
                        : `Illustration for turn #${stream.liveSequenceNumber ?? liveTurnId}`}
                    </span>
                    <span style={visualCaptionActionsStyle}>
                      <Button
                        intent="secondary"
                        size="sm"
                        disabled={isDisabled}
                        onClick={regenerate}
                        data-testid="image-regenerate"
                        aria-label="Regenerate image for the current turn"
                      >
                        {isLoading ? 'Regenerating\u2026' : 'Regenerate'}
                      </Button>
                      {/* Inert. There is no image-archive route and no
                          archive listing behind one, so this is a real
                          `disabled` button rather than a link that would
                          404 — tabbing past it announces the reason. */}
                      <span
                        title={ARCHIVE_UNAVAILABLE_REASON}
                        style={{ display: 'inline-flex' }}
                      >
                        <Button
                          intent="ghost"
                          size="sm"
                          disabled
                          aria-label="Image archive"
                          aria-describedby={ARCHIVE_UNAVAILABLE_HINT_ID}
                        >
                          <Archive size={14} strokeWidth={1.75} aria-hidden="true" />
                          Image archive
                        </Button>
                      </span>
                      <span id={ARCHIVE_UNAVAILABLE_HINT_ID} style={visuallyHiddenStyle}>
                        {ARCHIVE_UNAVAILABLE_REASON}
                      </span>
                    </span>
                  </div>
                )}
              />
            </figure>

            {/* 5 — Trailing edge of the timeline. Inert; see
                `<NextTurnPending>`. */}
            <NextTurnPending />
          </div>
        </section>

        <ContextRail
          adventureId={adventureId}
          character={characterQuery.data}
          characterError={characterQuery.error ?? null}
          isCharacterLoading={characterQuery.isPending && !characterQuery.data}
          npcs={npcQuery.data}
          npcError={npcQuery.error ?? null}
          isNpcLoading={npcQuery.isPending && !npcQuery.data}
          mechanicEvent={resolvedMechanicEvent}
          inventoryItems={inventory.items}
          inventoryTotals={inventory.totals}
        />
      </div>

      <ActionBar
        value={freeText}
        onValueChange={setFreeText}
        onSubmit={(event) => void onSubmit(event)}
        isSubmitting={isSubmitting}
        isSubmitDisabled={!selectedChoiceId && freeText.trim().length === 0}
        onUndo={() => void onUndo()}
        onRedo={() => void onRedo()}
        onRetry={() => void onRetry()}
        canUndo={branchFlags.canUndo}
        canRedo={branchFlags.canRedo}
        canRetry={branchFlags.canRetry}
        isBranchOpsPending={branchOpsPending}
      />

      {isDrawerOpen && (
        <AdventureSettingsDrawer
          adventureId={adventure.id}
          branchId={adventure.current_branch.id}
          adventureSettings={adventureSettingsQuery.data}
          userSettings={playerSettingsQuery.data}
          isLoading={adventureSettingsQuery.isPending && !adventureSettingsQuery.data}
          error={adventureSettingsQuery.error ?? null}
          onSave={(body) => void onSaveAdventureSettings(body)}
          onClose={() => setDrawerOpen(false)}
          saving={updateAdventureSettings.isPending}
        />
      )}
    </div>
  );
}

function buildTypographyPreviewStyle(
  theme: string | number | boolean,
  verbosity: string | number | boolean,
): CSSProperties {
  // The preview surface reflects the design tokens so the live region
  // matches the actual light/dark palette. `<html data-theme>` is set by
  // the page on every resolved-theme change, so the variables flip with
  // the theme selector (S4-T06 cosmetic fix).
  void theme;
  const palette = { background: 'var(--color-bg)', foreground: 'var(--color-fg)', accent: 'var(--color-primary)' };

  // Verbosity: terse = 0.92x line-height, balanced = 1.4 (default),
  // rich = 1.6 with more letter-spacing.
  const lineHeight = verbosity === 'terse' ? 1.32 : verbosity === 'rich' ? 1.6 : 1.4;
  const letterSpacing = verbosity === 'rich' ? '0.01em' : '0';

  return {
    background: palette.background,
    color: palette.foreground,
    lineHeight,
    letterSpacing,
    // Accent token is referenced by suggested choices; the page itself
    // doesn't paint the accent directly, but exposing it lets a future
    // iteration render it inline.
    ['--color-preview-accent' as string]: palette.accent,
  };
}

// ---- HUD frame styles --------------------------------------------------
// The surface is a three-row frame that never lets the document scroll:
// the top bar and the bottom action bar are siblings of `bodyRowStyle`
// and therefore always on screen; only the story column and the rail
// scroll.
const surfaceStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const bodyRowStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'stretch',
  overflow: 'hidden',
};

const storyColumnStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflowY: 'auto',
  padding: 'var(--space-4)',
  display: 'flex',
  justifyContent: 'center',
};

// Comfortable reading measure for the serif narration, centred in the
// column (the `prose` utility caps itself at 60ch; the column is the
// wider of the two so the timeline cards get the full measure).
const storyMeasureStyle: CSSProperties = {
  width: '100%',
  maxWidth: HUD_STORY_MEASURE,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
};

const storyHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  flexWrap: 'wrap',
  paddingBottom: 'var(--space-2)',
  borderBottom: '1px solid var(--color-border)',
};

const storyHeaderActionsStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  flexWrap: 'wrap',
};

// Matches the ghost `<Button>` next to it without nesting one control
// inside another.
const ghostLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 'var(--control-touch-min)',
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--weight-medium)',
  textDecoration: 'none',
  color: 'var(--color-foreground)',
};

const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-foreground-subtle)',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 'var(--text-xl)',
  fontWeight: 'var(--weight-semibold)',
  lineHeight: 'var(--leading-tight)',
  margin: 0,
};

const metaRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
  flexWrap: 'wrap',
};

// Player-action card: brass left accent bar + mono text, so the player's
// own words never read as narration.
const playerActionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
  border: '1px solid var(--color-border)',
  borderLeft: '3px solid var(--color-primary)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
  padding: 'var(--space-3) var(--space-4)',
};

const playerActionLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--weight-semibold)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-primary)',
};

const playerActionTextStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-foreground)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const visualFigureStyle: CSSProperties = {
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
};

const visualCaptionStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  width: '100%',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-foreground-muted)',
};

// Left-hand scene label: glyph + honest text. `ImageAsset` carries no
// scene name, so this never invents one.
const visualCaptionLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  minWidth: 0,
};

const visualCaptionActionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  flexWrap: 'wrap',
  marginLeft: 'auto',
};

const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const contentWarningStyle: CSSProperties = {
  marginTop: 'var(--space-3)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-warning)',
};

const cardStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-4) var(--space-5)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
};

const worldGridStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-3)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};

const stateCardStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3) var(--space-4)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  alignItems: 'flex-start',
  background: 'var(--color-surface-muted)',
};

const stateHeadingStyle: CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-serif)',
  color: 'var(--color-foreground-muted)',
  margin: 0,
};

const stateListStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--space-1)',
  fontSize: 'var(--text-sm)',
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
