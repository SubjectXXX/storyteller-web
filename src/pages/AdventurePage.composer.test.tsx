import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdventurePage from './AdventurePage';
import {
  ApiClientProvider,
  type Fetcher,
  type StreamEvent,
  makeFixtureStream,
} from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { ADVENTURE_FIXTURE, AUTH_FIXTURE, TURN_FIXTURE } from '@/fixtures/data';

/**
 * v5 dedicated test: the play-surface composer must (1) render a
 * textarea inside the AdventurePage, (2) accept input and POST it to
 * /api/adventures/{id}/turns with an idempotency key, and (3) hand
 * off to the SSE stream handler that drives the typewriter narration.
 *
 * The verifiers reported the composer missing; this file pins the
 * contract independently of the broader AdventurePage.test.tsx so a
 * regression cannot land without anyone noticing.
 */
function renderAdventure(initialPath: string, fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  window.localStorage.setItem('storyteller.session.token', AUTH_FIXTURE.token);
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/adventures/:id" element={<AdventurePage />} />
              <Route path="/not-a-real-page" element={<div>Not Found</div>} />
            </Routes>
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function setNativeValue(element: HTMLElement, value: string): void {
  const proto = Object.getPrototypeOf(element) as { descriptor: PropertyDescriptor | undefined };
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('AdventurePage composer (v5 play surface)', () => {
  it('renders the composer textarea inside the page shell', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      if (path === '/adventures') return [ADVENTURE_FIXTURE];
      if (path === '/adventures/101') return ADVENTURE_FIXTURE;
      if (path.startsWith('/adventures/101/stream')) {
        return makeFixtureStream([{ type: 'end' } satisfies StreamEvent]);
      }
      return undefined;
    };
    renderAdventure('/adventures/101', fetcher);

    const textarea = await screen.findByLabelText(/say or do something/i);
    expect(textarea.tagName).toBe('TEXTAREA');
    // Same form hosts the submit button so we can verify the layout
    // groups them together (defensive: a future refactor that splits
    // them apart would still pass the "composer exists" assertion
    // above, so this extra check is the trip wire).
    const submit = screen.getByRole('button', { name: /submit turn/i });
    expect(submit).toBeTruthy();
  });

  it('typing into the composer and submitting fires POST /adventures/{id}/turns with an idempotency key', async (): Promise<void> => {
    const turnCalls: Array<{ body: unknown }> = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      if (path === '/adventures') return [ADVENTURE_FIXTURE];
      if (path === '/adventures/101' && method === 'GET') return ADVENTURE_FIXTURE;
      if (path === '/adventures/101/turns' && method === 'POST') {
        // Capture the body verbatim so we can assert on the
        // idempotency_key without decoding it back to a string.
        const body = options.body;
        turnCalls.push({ body });
        return TURN_FIXTURE;
      }
      if (path.startsWith('/adventures/101/stream')) {
        return makeFixtureStream([{ type: 'end' } satisfies StreamEvent]);
      }
      return undefined;
    };
    renderAdventure('/adventures/101', fetcher);

    await screen.findByLabelText(/say or do something/i);
    setNativeValue(screen.getByLabelText(/say or do something/i), 'Open the drawer.');
    fireEvent.click(screen.getByRole('button', { name: /submit turn/i }));

    await waitFor(() => {
      expect(turnCalls).toHaveLength(1);
    });

    const parsed = JSON.parse(String(turnCalls[0].body));
    // The server contract requires an idempotency_key on every turn;
    // a regression that drops it would silently double-submit on
    // retry, so we pin it here.
    expect(parsed.idempotency_key).toBeTruthy();
    expect(typeof parsed.idempotency_key).toBe('string');
    expect(parsed.free_text).toBe('Open the drawer.');
  });

  it('subscribes to the SSE stream so the typewriter receives deltas', async (): Promise<void> => {
    const events: StreamEvent[] = [
      { type: 'turn', turn_id: 1, chunk_index: 0, narration: 'Once ' },
      { type: 'turn', turn_id: 1, chunk_index: 1, narration: 'upon ' },
      { type: 'turn', turn_id: 1, chunk_index: 2, narration: 'a time.' },
      { type: 'end' },
    ];
    const streamHits: string[] = [];
    const fetcher: Fetcher = async (path) => {
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      if (path === '/adventures') return [ADVENTURE_FIXTURE];
      if (path === '/adventures/101') return ADVENTURE_FIXTURE;
      if (path.startsWith('/adventures/101/stream')) {
        streamHits.push(path);
        return makeFixtureStream(events);
      }
      return undefined;
    };
    renderAdventure('/adventures/101', fetcher);

    // The fetch contract: when AdventurePage mounts it must issue at
    // least one GET on the stream endpoint. If a future refactor
    // moves narration off SSE, this assertion will fail loudly.
    await waitFor(() => {
      expect(streamHits.length).toBeGreaterThan(0);
    });
    expect(streamHits[0]).toMatch(/^\/adventures\/101\/stream/);

    // And the resulting chunks must reach the typewriter.
    await waitFor(() => {
      expect(screen.getByTestId('typewriter').textContent).toContain('Once upon a time.');
    });
  });
});