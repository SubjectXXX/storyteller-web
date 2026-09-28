/**
 * AdventurePage — world panel wiring.
 *
 * The six Stage 4/5 play panels (Character, NPCs, Quests, Inventory,
 * Mechanics, Memory) are built and unit-tested in isolation, but the
 * page used to compute their data and never mount them. This suite
 * pins the wiring: each panel must appear on the play page with real
 * data from the mocked API, and must degrade to a loading / error /
 * empty state when its own endpoint misbehaves.
 *
 * Unlike the older `AdventurePage*.test.tsx` suites this file does not
 * touch `window.localStorage` (missing in this happy-dom build) and
 * does not need `<AuthProvider>` — the page and every hook it calls
 * read the API client from context, not the auth context.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import AdventurePage from './AdventurePage';
import {
  ADVENTURE_FIXTURE,
  ADVENTURE_SETTINGS_FIXTURE,
  ApiClientProvider,
  ApiError,
  BRANCH_TREE_FIXTURE,
  CHARACTER_FIXTURE,
  EFFECTIVE_SETTINGS_FIXTURE,
  LORE_FIXTURE,
  NPC_FIXTURE,
  PLAYER_SETTINGS_FIXTURE,
  RECAP_FIXTURE,
  makeFixtureStream,
  type Fetcher,
} from '@/api-client';

const ADVENTURE_ID = ADVENTURE_FIXTURE.id;

/** A real row from `branch.state.inventory` — the panel is client-derived. */
const LANTERN = (
  ADVENTURE_FIXTURE.current_branch.state.inventory as ReadonlyArray<{ id: string; name: string }>
).find((item) => item.id === 'item-lantern')!;

/** A pinned memory the stock `PINNED_MEMORY_FIXTURE` (empty list) can't supply. */
const PINNED_STAR = {
  adventure_id: ADVENTURE_ID,
  pinned: [
    {
      id: 7,
      kind: 'recap' as const,
      ref_id: '2',
      title: 'The cartographer hid something',
      body: 'Imogen asked for the letter by name — she already knew it existed.',
      pinned_at: '2026-09-22T18:05:00Z',
    },
  ],
};

function renderAt(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // The route supplies the page, so the wrapper takes no children.
  const Wrapper = (): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider fetcher={fetcher}>
        <MemoryRouter initialEntries={[`/adventures/${ADVENTURE_ID}`]}>
          <Routes>
            <Route path="/adventures/:id" element={<AdventurePage />} />
            <Route path="/not-a-real-page" element={<div>Not Found</div>} />
          </Routes>
        </MemoryRouter>
      </ApiClientProvider>
    </QueryClientProvider>
  );
  return render(<Wrapper />);
}

/** Answers every endpoint the play page reaches, with real panel data. */
function panelsFetcher(overrides: Record<string, () => unknown> = {}): Fetcher {
  return async (path) => {
    if (overrides[path]) return overrides[path]();
    if (path === `/adventures/${ADVENTURE_ID}`) return ADVENTURE_FIXTURE;
    if (path.startsWith(`/adventures/${ADVENTURE_ID}/stream`)) {
      return makeFixtureStream([{ type: 'end' }]);
    }
    if (path === `/adventures/${ADVENTURE_ID}/character`) return CHARACTER_FIXTURE;
    if (path === `/adventures/${ADVENTURE_ID}/npcs`) return NPC_FIXTURE;
    if (path === `/adventures/${ADVENTURE_ID}/recap`) return RECAP_FIXTURE;
    if (path === `/adventures/${ADVENTURE_ID}/lore`) return LORE_FIXTURE;
    if (path === `/adventures/${ADVENTURE_ID}/pinned-memories`) return PINNED_STAR;
    if (path === `/adventures/${ADVENTURE_ID}/branches`) return BRANCH_TREE_FIXTURE;
    if (path === `/adventures/${ADVENTURE_ID}/settings`) return ADVENTURE_SETTINGS_FIXTURE;
    if (path.startsWith('/me/settings/effective')) return EFFECTIVE_SETTINGS_FIXTURE;
    if (path === '/me/settings/player-defaults') return PLAYER_SETTINGS_FIXTURE;
    return undefined;
  };
}

describe('AdventurePage — world panel wiring', () => {
  it('mounts all six play panels with data from their own endpoints', async () => {
    renderAt(panelsFetcher());
    await waitFor(() => expect(screen.getByText(ADVENTURE_FIXTURE.title)).toBeTruthy());

    // Character — name + role come from GET /adventures/{id}/character.
    expect(await screen.findByText(CHARACTER_FIXTURE.name)).toBeTruthy();
    expect(screen.getByText(CHARACTER_FIXTURE.role)).toBeTruthy();
    expect(screen.getByText(CHARACTER_FIXTURE.notes as string)).toBeTruthy();

    // NPCs — roster rows from GET /adventures/{id}/npcs.
    expect(screen.getByText(NPC_FIXTURE[0]!.name)).toBeTruthy();
    expect(screen.getByText(NPC_FIXTURE[0]!.location as string)).toBeTruthy();

    // Quests — the panel is mounted; the API exposes no quest data yet
    // so it renders its documented empty state rather than staying absent.
    expect(screen.getByText(/no quests logged/i)).toBeTruthy();

    // Inventory — derived client-side from `branch.state.inventory`.
    expect(screen.getByText(LANTERN.name)).toBeTruthy();

    // Mechanics — derived from `branch.state.mechanics` (the Suspicion clock).
    expect(screen.getByText(/clock: suspicion/i)).toBeTruthy();

    // Memory — recap turns from GET /adventures/{id}/recap.
    expect(await screen.findByText(RECAP_FIXTURE.turns[0]!.headline)).toBeTruthy();
  });

  it('renders a pinned memory when the player has starred one', async () => {
    renderAt(panelsFetcher());
    await waitFor(() => expect(screen.getByText(ADVENTURE_FIXTURE.title)).toBeTruthy());
    // The Pinned tab is a sibling of the default Recap tab.
    const pinnedTab = await screen.findByTestId('memory-tab-pinned');
    pinnedTab.click();
    expect(await screen.findByText(PINNED_STAR.pinned[0]!.title)).toBeTruthy();
    expect(screen.getByText(PINNED_STAR.pinned[0]!.body)).toBeTruthy();
  });

  it('degrades to per-panel error states without breaking the page', async () => {
    const boom = (): never => {
      throw new ApiError(503, { message: 'world state offline', code: 'unavailable' });
    };
    renderAt(
      panelsFetcher({
        [`/adventures/${ADVENTURE_ID}/character`]: boom,
        [`/adventures/${ADVENTURE_ID}/npcs`]: boom,
        [`/adventures/${ADVENTURE_ID}/recap`]: boom,
        [`/adventures/${ADVENTURE_ID}/pinned-memories`]: boom,
      }),
    );

    // The page shell still renders — one dead endpoint must not blank the page.
    await waitFor(() => expect(screen.getByText(ADVENTURE_FIXTURE.title)).toBeTruthy());
    expect(screen.getByLabelText(/say or do something/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /submit turn/i })).toBeTruthy();

    // Character, NPC and recap panels each surface their own inline error.
    expect(await screen.findByText(/couldn’t load character: world state offline/i)).toBeTruthy();
    const alerts = screen.getAllByRole('alert').map((el) => el.textContent ?? '');
    expect(alerts.some((t) => /world state offline/.test(t))).toBe(true);

    // Quests, inventory and mechanics are fed from local data, so they keep
    // rendering despite the failed endpoints.
    expect(screen.getByText(/no quests logged/i)).toBeTruthy();
    expect(screen.getByText(LANTERN.name)).toBeTruthy();
    expect(screen.getByText(/clock: suspicion/i)).toBeTruthy();
  });

  it('shows the documented empty states when the world data is empty', async () => {
    renderAt(
      panelsFetcher({
        // `[]` is the contract for "this branch has surfaced nothing yet";
        // the quest log has no endpoint at all and is always empty today.
        [`/adventures/${ADVENTURE_ID}/npcs`]: () => [],
        [`/adventures/${ADVENTURE_ID}/recap`]: () => ({ ...RECAP_FIXTURE, turns: [] }),
      }),
    );
    await waitFor(() => expect(screen.getByText(ADVENTURE_FIXTURE.title)).toBeTruthy());

    expect(await screen.findByText(/no recap yet/i)).toBeTruthy();
    expect(screen.getByText(/no npcs in this branch/i)).toBeTruthy();
    expect(screen.getByText(/no quests logged/i)).toBeTruthy();
  });
});
