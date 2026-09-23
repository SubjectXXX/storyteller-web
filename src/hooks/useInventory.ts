/**
 * `useInventory` — derive the inventory list from the current branch state.
 *
 * The server stores inventory inside `branch.state.inventory` as a list of
 * items. There is no dedicated `GET /api/adventures/{id}/inventory`
 * endpoint; the SPA consumes `useAdventure(id).data.current_branch.state`
 * and pulls out the `inventory` array. Keeping the derivation client-side
 * means the inventory is always in sync with the branch version the rest of
 * the page reads.
 *
 * Wire contract (sourced from `BranchResource.state.inventory`):
 *
 *   BranchResource.state = Readonly<Record<string, unknown>>
 *   BranchResource.state.inventory = ReadonlyArray<InventoryItem> where
 *
 *   interface InventoryItem {
 *     id: string;
 *     name: string;
 *     description: string | null;
 *     weight: number;          // kg; 0 means weightless
 *     count: number;           // stack size; >=1
 *     slot: 'carry' | 'worn' | 'stored' | 'quest';
 *     icon?: string | null;
 *   }
 *
 * The hook never fetches. Pass it the current `state` object from the
 * adventure query and it returns the parsed list (or `[]` when missing).
 */
import { useMemo } from 'react';

export type InventorySlot = 'carry' | 'worn' | 'stored' | 'quest';

export interface InventoryItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly weight: number;
  readonly count: number;
  readonly slot: InventorySlot;
  readonly icon?: string | null;
}

export interface InventoryTotals {
  readonly totalWeight: number;
  readonly uniqueItems: number;
  readonly totalCount: number;
  readonly bySlot: Readonly<Partial<Record<InventorySlot, number>>>;
}

export function isInventoryItem(value: unknown): value is InventoryItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.weight === 'number' &&
    typeof v.count === 'number' &&
    typeof v.slot === 'string'
  );
}

export function extractInventory(state: unknown): ReadonlyArray<InventoryItem> {
  if (!state || typeof state !== 'object') return [];
  const raw = (state as Record<string, unknown>).inventory;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isInventoryItem);
}

export function summariseInventory(items: ReadonlyArray<InventoryItem>): InventoryTotals {
  const bySlot: Partial<Record<InventorySlot, number>> = {};
  let totalWeight = 0;
  let totalCount = 0;
  for (const item of items) {
    totalWeight += item.weight * item.count;
    totalCount += item.count;
    bySlot[item.slot] = (bySlot[item.slot] ?? 0) + 1;
  }
  return {
    totalWeight,
    uniqueItems: items.length,
    totalCount,
    bySlot,
  };
}

/**
 * Derive the inventory + totals from the current branch state. Returns an
 * empty list (and zeroed totals) until the parent supplies state.
 */
export function useInventory(state: unknown): {
  readonly items: ReadonlyArray<InventoryItem>;
  readonly totals: InventoryTotals;
} {
  const items = useMemo(() => extractInventory(state), [state]);
  const totals = useMemo(() => summariseInventory(items), [items]);
  return { items, totals };
}