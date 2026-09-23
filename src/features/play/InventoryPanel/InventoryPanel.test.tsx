import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ADVENTURE_FIXTURE } from '@/fixtures/data';
import { extractInventory, summariseInventory } from '@/hooks/useInventory';
import { InventoryPanel } from './InventoryPanel';

describe('InventoryPanel', () => {
  it('lists every item, weight, count, and slot totals', () => {
    const items = extractInventory(ADVENTURE_FIXTURE.current_branch.state);
    const totals = summariseInventory(items);
    render(<InventoryPanel items={items} totals={totals} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(items.length);
    expect(screen.getByText(/weight/i)).toBeInTheDocument();
  });

  it('renders the empty state when no items are present', () => {
    render(
      <InventoryPanel
        items={[]}
        totals={{ totalWeight: 0, uniqueItems: 0, totalCount: 0, bySlot: {} }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/empty|no items|carrying nothing/i);
  });
});
