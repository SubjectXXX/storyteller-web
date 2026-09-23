/**
 * `useDiceClock` — derive the latest dice / clock mechanic event from the
 * latest turn.
 *
 * The S4 server writes a `mechanics` block onto every turn at either
 * `turn.usage.mechanics` (when the request budgets tokens) or
 * `turn.state_after.mechanics` (when the rule engine mutates state). The
 * SPA never fetches a separate endpoint — it pulls the latest mechanic
 * from the most recent `TurnResource` and exposes it as a hook-friendly
 * tuple.
 *
 * Wire contract:
 *
 *   type MechanicKind = 'dice' | 'clock';
 *
 *   interface DiceRoll {
 *     kind: 'dice';
 *     formula: string;       // e.g. "1d20+3"
 *     total: number;
 *     rolls: number[];
 *     modifier: number;
 *     success: 'pass' | 'fail' | 'mixed' | null;
 *     reason: string | null; // "Stealth check vs. locked door"
 *     actor_id: string | null;
 *   }
 *
 *   interface ClockTick {
 *     kind: 'clock';
 *     clock_id: string;
 *     label: string;         // "Suspicion"
 *     from: number;          // 0..max
 *     to: number;            // 0..max
 *     max: number;
 *     reason: string | null; // "Imogen saw you read the letter."
 *   }
 *
 *   type MechanicEvent = DiceRoll | ClockTick;
 *
 *   // At most one event per turn (the server picks the latest).
 *   TurnResource.usage.mechanics?: MechanicEvent;
 *   TurnResource.state_after.mechanics?: MechanicEvent;
 */
import { useMemo } from 'react';
import type { TurnUsage } from '@/api-client';

export type MechanicKind = 'dice' | 'clock';

export interface DiceRoll {
  readonly kind: 'dice';
  readonly formula: string;
  readonly total: number;
  readonly rolls: ReadonlyArray<number>;
  readonly modifier: number;
  readonly success: 'pass' | 'fail' | 'mixed' | null;
  readonly reason: string | null;
  readonly actor_id: string | null;
}

export interface ClockTick {
  readonly kind: 'clock';
  readonly clock_id: string;
  readonly label: string;
  readonly from: number;
  readonly to: number;
  readonly max: number;
  readonly reason: string | null;
}

export type MechanicEvent = DiceRoll | ClockTick;

function isDiceRoll(value: unknown): value is DiceRoll {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.kind === 'dice' &&
    typeof v.formula === 'string' &&
    typeof v.total === 'number'
  );
}

function isClockTick(value: unknown): value is ClockTick {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.kind === 'clock' &&
    typeof v.clock_id === 'string' &&
    typeof v.from === 'number' &&
    typeof v.to === 'number'
  );
}

/**
 * Pick the most recent mechanic event from the supplied usage + state.
 * `usage` wins when both are present so the player sees the latest.
 */
export function extractMechanicEvent(
  usage: TurnUsage | null,
  stateAfter: Readonly<Record<string, unknown>> | null,
): MechanicEvent | null {
  // Usage is the canonical "latest" in our wire shape; if absent, fall back
  // to `state_after.mechanics`.
  if (usage) {
    const usageMechanic = (usage as unknown as { mechanics?: unknown }).mechanics;
    if (isDiceRoll(usageMechanic)) return usageMechanic;
    if (isClockTick(usageMechanic)) return usageMechanic;
  }
  if (stateAfter && typeof stateAfter === 'object') {
    const stateMechanic = (stateAfter as { mechanics?: unknown }).mechanics;
    if (isDiceRoll(stateMechanic)) return stateMechanic;
    if (isClockTick(stateMechanic)) return stateMechanic;
  }
  return null;
}

/**
 * Derive the latest mechanic event from `usage` + `state_after`. Hook form
 * for direct consumption by `<DiceClockPanel>`.
 */
export function useDiceClock(
  usage: TurnUsage | null,
  stateAfter: Readonly<Record<string, unknown>> | null,
): MechanicEvent | null {
  return useMemo(() => extractMechanicEvent(usage, stateAfter), [usage, stateAfter]);
}