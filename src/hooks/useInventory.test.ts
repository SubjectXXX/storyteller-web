import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ADVENTURE_FIXTURE } from '@/fixtures/data';
import {
  extractInventory,
  isInventoryItem,
  summariseInventory,
  useInventory,
} from './useInventory';

describe('useInventory', () => {
  it('returns the inventory list and totals from branch state', () => {
    const { result } = renderHook(() => useInventory(ADVENTURE_FIXTURE.current_branch.state));
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.totals.totalCount).toBeGreaterThan(0);
    expect(result.current.totals.totalWeight).toBeGreaterThan(0);
    expect(result.current.totals.uniqueItems).toBe(result.current.items.length);
  });

  it('returns an empty inventory when state is missing or malformed', () => {
    const emptyState = renderHook(() => useInventory(undefined));
    expect(emptyState.result.current.items).toEqual([]);
    expect(emptyState.result.current.totals.totalCount).toBe(0);

    const noInventory = renderHook(() => useInventory({ location: 'archive' }));
    expect(noInventory.result.current.items).toEqual([]);

    const wrongShape = renderHook(() => useInventory({ inventory: 'not-an-array' }));
    expect(wrongShape.result.current.items).toEqual([]);
  });

  it('filters out malformed entries', () => {
    const state = {
      inventory: [
        { id: 'good', name: 'good', weight: 1, count: 1, slot: 'carry' },
        { id: 'bad' },
        null,
      ],
    };
    const { result } = renderHook(() => useInventory(state));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.id).toBe('good');
  });
});

describe('summariseInventory', () => {
  it('groups items by slot and accumulates weight/count', () => {
    const totals = summariseInventory([
      { id: 'a', name: 'A', description: null, weight: 1, count: 2, slot: 'carry' },
      { id: 'b', name: 'B', description: null, weight: 0.5, count: 4, slot: 'carry' },
      { id: 'c', name: 'C', description: null, weight: 0, count: 1, slot: 'quest' },
    ]);
    expect(totals.totalWeight).toBe(4);
    expect(totals.totalCount).toBe(7);
    expect(totals.uniqueItems).toBe(3);
    expect(totals.bySlot.carry).toBe(2);
    expect(totals.bySlot.quest).toBe(1);
  });
});

describe('extractInventory', () => {
  it('returns an empty list when state is null', () => {
    expect(extractInventory(null)).toEqual([]);
  });
});

describe('isInventoryItem', () => {
  it('rejects objects missing required fields', () => {
    expect(isInventoryItem({ id: 'x' })).toBe(false);
    expect(isInventoryItem(null)).toBe(false);
    expect(isInventoryItem(undefined)).toBe(false);
  });
});
