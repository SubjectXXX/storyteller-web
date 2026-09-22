import { describe, expect, it } from 'vitest';
import { ApiError, createApi, fixtureFetcher, liveFetcher, withFixtureFallback } from './openapi';
import type { Fetcher } from './openapi';

describe('liveFetcher', () => {
  it('builds a URL using the configured base path', async () => {
    const captured: Array<{ url: string; init: RequestInit }> = [];
    // @ts-expect-error -- minimal fetch shim for happy-dom
    globalThis.fetch = async (url: string, init: RequestInit) => {
      captured.push({ url, init });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const fetcher = liveFetcher('/api');
    const result = await fetcher('/scenarios', { method: 'GET' });

    expect(captured).toHaveLength(1);
    expect(captured[0]?.url).toBe('/api/scenarios');
    expect(captured[0]?.init.method).toBe('GET');
    expect(result).toEqual({ ok: true });
  });

  it('serialises JSON bodies and adds the bearer token when configured', async () => {
    const captured: Array<{ url: string; init: RequestInit }> = [];
    // @ts-expect-error -- minimal fetch shim
    globalThis.fetch = async (url: string, init: RequestInit) => {
      captured.push({ url, init });
      return new Response('{}', { status: 200 });
    };

    const fetcher = liveFetcher('/api', 'token-abc');
    await fetcher('/wallet/top-up', { method: 'POST', body: { packageId: 'pkg-starter' } });

    const init = captured[0]?.init as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-abc');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ packageId: 'pkg-starter' }));
  });

  it('throws ApiError on non-2xx responses', async () => {
    // @ts-expect-error -- minimal fetch shim
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: 'Not Found', code: 'scenario_not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });

    const fetcher = liveFetcher('/api');
    await expect(fetcher('/scenarios/does-not-exist')).rejects.toBeInstanceOf(ApiError);
    try {
      await fetcher('/scenarios/does-not-exist');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
      expect((err as ApiError).code).toBe('scenario_not_found');
    }
  });
});

describe('fixtureFetcher', () => {
  const api = createApi(fixtureFetcher());

  it('returns the full scenario list', async () => {
    const list = await api.listScenarios();
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.find((s) => s.id === 'demo-romance')).toBeDefined();
  });

  it('filters scenarios by rating query', async () => {
    const list = await api.listScenarios({ rating: 'mature' });
    expect(list.every((s) => s.rating === 'mature')).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it('returns a single scenario by id', async () => {
    const scenario = await api.getScenario('demo-romance');
    expect(scenario.title).toBeTruthy();
    expect(scenario.id).toBe('demo-romance');
  });

  it('throws ApiError(404) for an unknown scenario', async () => {
    await expect(api.getScenario('does-not-exist')).rejects.toMatchObject({
      status: 404,
      code: 'scenario_not_found',
    });
  });

  it('returns the play turn for a scenario id', async () => {
    const turn = await api.getPlayTurn('demo-romance');
    expect(turn.choices.length).toBeGreaterThanOrEqual(2);
  });

  it('returns the wallet fixture', async () => {
    const wallet = await api.getWallet();
    expect(wallet.currency).toBe('credits');
    expect(wallet.packages.length).toBeGreaterThan(0);
  });

  it('returns a checkout URL for a top-up request', async () => {
    const result = await api.topUpWallet({ packageId: 'pkg-starter' });
    expect(result.reservationId).toContain('pkg-starter');
    expect(result.checkoutUrl).toContain('pkg-starter');
  });

  it('returns the referral fixture', async () => {
    const referral = await api.getReferral();
    expect(referral.code).toMatch(/^[A-Z0-9-]+$/);
  });

  it('round-trips settings via PUT', async () => {
    const settings = await api.getSettings();
    const result = await api.updateSettings({ groups: settings });
    expect(result.groups).toEqual(settings);
  });
});

describe('withFixtureFallback', () => {
  it('delegates to the primary fetcher on success', async () => {
    const primary: Fetcher = async (path) => ({ path, from: 'primary' });
    const wrapped = withFixtureFallback(primary, fixtureFetcher());

    const result = (await wrapped('/scenarios')) as { path: string; from: string };
    expect(result.from).toBe('primary');
  });

  it('switches to the fixture fetcher on network errors', async () => {
    const primary: Fetcher = async () => {
      throw new TypeError('Failed to fetch');
    };
    const wrapped = withFixtureFallback(primary, fixtureFetcher());

    const list = (await wrapped('/scenarios')) as Array<{ id: string }>;
    expect(list.find((s) => s.id === 'demo-romance')).toBeDefined();
  });

  it('re-throws ApiError from the primary fetcher', async () => {
    const primary: Fetcher = async () => {
      throw new ApiError(403, { message: 'Forbidden', code: 'forbidden' });
    };
    const wrapped = withFixtureFallback(primary, fixtureFetcher());

    await expect(wrapped('/me/settings')).rejects.toMatchObject({ status: 403, code: 'forbidden' });
  });
});
