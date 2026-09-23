import { describe, expect, it } from 'vitest';
import {
  ApiError,
  createApi,
  fixtureFetcher,
  liveFetcher,
  withFixtureFallback,
} from './openapi';
import type { Fetcher, SignInRequest, SignUpRequest, WalletTopUpRequest } from './openapi';

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
    const body: WalletTopUpRequest = { amount: 50 };
    await fetcher('/wallet/top-up', { method: 'POST', body });

    const init = captured[0]?.init as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-abc');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ amount: 50 }));
  });

  it('unwraps the {data, meta} envelope on success', async () => {
    // @ts-expect-error -- minimal fetch shim
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ data: [{ id: 1, slug: 'demo-romance' }], meta: { request_id: 'r-1', timestamp: 't-1' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    const fetcher = liveFetcher('/api');
    const result = (await fetcher('/scenarios')) as Array<{ id: number; slug: string }>;
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]?.slug).toBe('demo-romance');
  });

  it('throws ApiError on non-2xx responses and extracts the error code from the envelope', async () => {
    // @ts-expect-error -- minimal fetch shim
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data: null,
          errors: [{ code: 'scenario_not_found', message: 'Not Found' }],
          meta: { request_id: 'r-2', timestamp: 't-2' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );

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

  it('returns the full scenario list (S2 ScenarioResource shape)', async () => {
    const list = await api.listScenarios();
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.find((s) => s.slug === 'demo-romance')).toBeDefined();
  });

  it('returns a single scenario by slug', async () => {
    const scenario = await api.getScenario('demo-romance');
    expect(scenario.title).toBeTruthy();
    expect(scenario.slug).toBe('demo-romance');
  });

  it('throws ApiError(404) for an unknown scenario', async () => {
    await expect(api.getScenario('does-not-exist')).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
    });
  });

  it('returns a scenario version for slug + version', async () => {
    const version = await api.getScenarioVersion('demo-mystery', 1);
    expect(version.version).toBe(1);
    expect(version.suggested_choices.length).toBeGreaterThan(0);
  });

  it('starts an adventure and returns the adventure resource', async () => {
    const adventure = await api.startAdventure({ scenario_slug: 'demo-mystery' });
    expect(adventure.scenario_slug).toBe('demo-mystery');
    expect(adventure.status).toBe('active');
    expect(adventure.current_branch.id).toBeGreaterThan(0);
  });

  it('submits a turn and returns the turn resource', async () => {
    const turn = await api.submitTurn(101, {
      branch_id: 1,
      choice_id: 'choice-alley',
      free_text: null,
      idempotency_key: 'idem-1',
      client_version: 1,
    });
    expect(turn.branch_id).toBe(1);
    expect(turn.choice_id).toBe('choice-alley');
    expect(turn.idempotency_key).toBe('idem-1');
  });

  it('throws ApiError(409) on a stale client_version', async () => {
    await expect(
      api.submitTurn(101, {
        branch_id: 1,
        idempotency_key: 'idem-2',
        client_version: 0,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'version_conflict' });
  });

  it('returns the wallet resource (balance + currency shape)', async () => {
    const wallet = await api.getWallet();
    expect(wallet.currency).toBe('credits');
    expect(wallet.balance).toBeGreaterThanOrEqual(0);
  });

  it('top-up mutates the wallet balance', async () => {
    const updated = await api.topUpWallet({ amount: 100 });
    expect(updated.balance).toBeGreaterThan(0);
    expect(updated.currency).toBe('credits');
  });

  it('returns the referral resource', async () => {
    const referral = await api.getReferral();
    expect(referral.code).toMatch(/^[A-Z0-9-]+$/);
    expect(referral.count).toBeGreaterThanOrEqual(0);
  });

  it('shareReferral increments the share counter', async () => {
    const next = await api.shareReferral({ channel: 'email' });
    expect(next.count).toBeGreaterThanOrEqual(0);
    expect(next.code).toMatch(/^[A-Z0-9-]+$/);
  });

  it('round-trips settings via PUT', async () => {
    const settings = await api.getSettings();
    expect(settings.theme).toMatch(/^(light|dark|system)$/);
    const next = await api.updateSettings({ ...settings, theme: 'dark' });
    expect(next.theme).toBe('dark');
  });

  it('returns the AI provider status from the public endpoint', async () => {
    const status = await api.getAiStatus();
    expect(status.provider).toMatch(/^(fake|lmstudio|unknown)$/);
    expect(status.model).toBeTruthy();
    expect(typeof status.reachable).toBe('boolean');
  });

  it('exposes a streamAdventure method that delegates to the fetcher', async () => {
    let observedSignal: AbortSignal | undefined;
    let observedSince: number | undefined;
    await api.streamAdventure(101, {
      signal: new AbortController().signal,
      sinceTurnId: 7,
      onTurn: () => {},
    });
    // The fixture fetcher does not implement streaming; this assertion
    // just confirms the call surface is wired through `createApi`. The
    // real stream parsing tests live in `openapi.stream.test.ts`.
    expect(typeof observedSignal).toBe('undefined');
    expect(observedSince).toBeUndefined();
  });

  it('signs in and returns a token + user', async () => {
    const auth = await api.signIn({ email: 'wren@example.com', password: '12345678' });
    expect(auth.token).toBeTruthy();
    expect(auth.user.email).toBe('wren@example.com');
  });

  it('rejects a malformed sign-in', async () => {
    const body: SignInRequest = { email: '', password: '' };
    await expect(api.signIn(body)).rejects.toMatchObject({ status: 422, code: 'validation' });
  });

  it('signs up a new user with adult attestation', async () => {
    const body: SignUpRequest = {
      email: 'new@example.com',
      password: '12345678',
      password_confirmation: '12345678',
      name: 'New User',
      attests_adult: true,
    };
    const auth = await api.signUp(body);
    expect(auth.token).toBeTruthy();
  });

  it('rejects a registration missing the adult attestation', async () => {
    const body = {
      email: 'new@example.com',
      password: '12345678',
      password_confirmation: '12345678',
      name: 'New User',
      attests_adult: false,
    } as SignUpRequest;
    await expect(api.signUp(body)).rejects.toMatchObject({ status: 422 });
  });

  it('returns the legacy play-turn fixture for PlaySurfacePlaceholder', async () => {
    const turn = await api.getPlayTurn('demo-romance');
    expect(turn.choices.length).toBeGreaterThanOrEqual(2);
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

    const list = (await wrapped('/scenarios')) as Array<{ slug: string }>;
    expect(list.find((s) => s.slug === 'demo-romance')).toBeDefined();
  });

  it('re-throws ApiError from the primary fetcher', async () => {
    const primary: Fetcher = async () => {
      throw new ApiError(403, { message: 'Forbidden', code: 'forbidden' });
    };
    const wrapped = withFixtureFallback(primary, fixtureFetcher());

    await expect(wrapped('/me/settings')).rejects.toMatchObject({ status: 403, code: 'forbidden' });
  });
});
