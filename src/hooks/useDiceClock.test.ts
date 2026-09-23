import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { CLOCK_TICK_FIXTURE, type TurnUsage } from '@/api-client';
import { extractMechanicEvent, useDiceClock } from './useDiceClock';

const CLOCK_USAGE: TurnUsage = {
  finishReason: 'stop',
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  latencyMs: 0,
  creditCost: 0,
  modelLabel: 'fixture',
  // The fixture embeds a clock event via the S4 mechanics payload.
  mechanics: CLOCK_TICK_FIXTURE,
} as unknown as TurnUsage;

describe('useDiceClock', () => {
  it('returns the clock event from usage when present', () => {
    const { result } = renderHook(() => useDiceClock(CLOCK_USAGE, null));
    expect(result.current?.kind).toBe('clock');
    if (result.current?.kind === 'clock') {
      expect(result.current.clock_id).toBe('suspicion');
      expect(result.current.to).toBe(2);
    }
  });

  it('falls back to state_after.mechanics when usage has none', () => {
    const stateAfter = { mechanics: CLOCK_TICK_FIXTURE };
    const { result } = renderHook(() => useDiceClock(null, stateAfter));
    expect(result.current?.kind).toBe('clock');
  });

  it('returns null when neither source has a mechanic event', () => {
    const { result } = renderHook(() => useDiceClock(null, null));
    expect(result.current).toBeNull();
  });
});

describe('extractMechanicEvent', () => {
  it('prefers usage over state_after', () => {
    const stateAfter = { mechanics: { kind: 'dice', formula: '1d6', total: 1 } };
    const result = extractMechanicEvent(CLOCK_USAGE, stateAfter);
    expect(result?.kind).toBe('clock');
  });

  it('returns null on bad shape', () => {
    // @ts-expect-error -- testing runtime guard
    expect(extractMechanicEvent({ mechanics: { kind: 'banana' } }, null)).toBeNull();
  });
});
