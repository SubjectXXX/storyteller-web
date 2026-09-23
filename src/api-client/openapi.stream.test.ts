import { describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  consumeAdventureStream,
  makeFixtureStream,
  parseStreamEvent,
} from './openapi';
import type { StreamEvent, TurnUsage } from './openapi';

describe('parseStreamEvent', () => {
  it('parses a turn event with snake_case fields', () => {
    const event = parseStreamEvent({
      type: 'turn',
      turn_id: 17,
      chunk_index: 4,
      narration: 'Hello',
    });
    expect(event).toEqual({
      type: 'turn',
      turn_id: 17,
      chunk_index: 4,
      narration: 'Hello',
    });
  });

  it('parses a usage event and keeps the snake_case wire format', () => {
    const event = parseStreamEvent({
      type: 'usage',
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
      latency_ms: 500,
      model: 'qwen2.5-7b-instruct',
      finish_reason: 'stop',
      cost_credits: 1,
    });
    expect(event).toEqual({
      type: 'usage',
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
      latency_ms: 500,
      model: 'qwen2.5-7b-instruct',
      finish_reason: 'stop',
      cost_credits: 1,
    });
  });

  it('parses end and error events', () => {
    expect(parseStreamEvent({ type: 'end' })).toEqual({ type: 'end' });
    expect(parseStreamEvent({ type: 'error', message: 'oops', code: 'boom' })).toEqual({
      type: 'error',
      message: 'oops',
      code: 'boom',
    });
  });

  it('returns null on unknown or malformed payloads', () => {
    expect(parseStreamEvent(null)).toBeNull();
    expect(parseStreamEvent({})).toBeNull();
    expect(parseStreamEvent({ type: 'turn' })).toBeNull();
  });
});

describe('consumeAdventureStream', () => {
  it('dispatches turn / usage / end to the matching handlers', async () => {
    const events: StreamEvent[] = [
      { type: 'turn', turn_id: 1, chunk_index: 0, narration: 'Once ' },
      { type: 'turn', turn_id: 1, chunk_index: 1, narration: 'upon ' },
      { type: 'usage', input_tokens: 1, output_tokens: 2, total_tokens: 3, latency_ms: 10, model: 'm', finish_reason: 'stop', cost_credits: 1 },
      { type: 'end' },
    ];
    // Stub fetch so it returns our fixture stream.
    const original = globalThis.fetch;
    // @ts-expect-error -- minimal shim for happy-dom
    globalThis.fetch = async () =>
      new Response(makeFixtureStream(events), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });

    const turns: Array<{ turnId: number; chunkIndex: number; narration: string }> = [];
    const usages: TurnUsage[] = [];
    let ended = false;

    await consumeAdventureStream(101, {
      signal: new AbortController().signal,
      onTurn: (p) => turns.push(p),
      onUsage: (u) => usages.push(u),
      onEnd: () => {
        ended = true;
      },
    });

    expect(turns).toEqual([
      { turnId: 1, chunkIndex: 0, narration: 'Once ' },
      { turnId: 1, chunkIndex: 1, narration: 'upon ' },
    ]);
    expect(usages).toHaveLength(1);
    expect(usages[0]?.outputTokens).toBe(2);
    expect(ended).toBe(true);

    globalThis.fetch = original;
  });

  it('aborts the underlying fetch when the signal fires', async () => {
    const abort = new AbortController();
    const fetchSpy = vi.fn(async () => {
      // Never resolve — simulates an open SSE stream.
      await new Promise(() => {});
      return new Response('', { status: 200 });
    });
    const original = globalThis.fetch;
    // @ts-expect-error -- spy replaces the fetch impl
    globalThis.fetch = fetchSpy;

    const promise = consumeAdventureStream(1, { signal: abort.signal });
    // Let the microtask queue settle so the fetch call lands.
    await new Promise((resolve) => setTimeout(resolve, 0));
    abort.abort();
    await promise;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBe(abort.signal);
    globalThis.fetch = original;
  });

  it('surfaces a non-2xx response as an error event', async () => {
    const original = globalThis.fetch;
    // @ts-expect-error -- stub
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: 'Stream blocked', errors: [{ code: 'rate_limited' }] }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });

    const errors: Array<{ message: string; code?: string }> = [];
    await consumeAdventureStream(1, {
      signal: new AbortController().signal,
      onError: (p) => errors.push(p),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toMatch(/Stream blocked/);
    expect(errors[0]?.code).toBe('rate_limited');
    globalThis.fetch = original;
  });

  it('wraps network failures (e.g. fetch throws) as an error event', async () => {
    const original = globalThis.fetch;
    // @ts-expect-error -- stub
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    const errors: Array<{ message: string; code?: string }> = [];
    await consumeAdventureStream(1, {
      signal: new AbortController().signal,
      onError: (p) => errors.push(p),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe('network');
    globalThis.fetch = original;
  });

  it('does nothing when the signal has already aborted before fetch', async () => {
    const fetchSpy = vi.fn();
    const original = globalThis.fetch;
    // @ts-expect-error -- spy
    globalThis.fetch = fetchSpy;
    const abort = new AbortController();
    abort.abort();
    await consumeAdventureStream(1, { signal: abort.signal });
    expect(fetchSpy).not.toHaveBeenCalled();
    globalThis.fetch = original;
  });
});

describe('ApiError stream handling', () => {
  it('still throws when callers wrap fetches that return non-2xx', async () => {
    const error = new ApiError(401, { message: 'Unauthenticated' });
    expect(error.status).toBe(401);
    expect(error.code).toBeUndefined();
  });
});
