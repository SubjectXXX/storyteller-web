/**
 * `<InventoryPanel>` — list items carried in `branch.state.inventory` with
 * weight + count totals. Pure presentational; the parent hands it the items
 * already extracted from the active branch.
 */
import type { CSSProperties, ReactElement } from 'react';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { EmptyState } from '@/ui/EmptyState';
import type { InventoryItem, InventoryTotals } from '@/hooks';

export interface InventoryPanelProps {
  readonly items: ReadonlyArray<InventoryItem>;
  readonly totals: InventoryTotals;
  readonly title?: string;
}

const slotLabel: Record<InventoryItem['slot'], string> = {
  carry: 'Carry',
  worn: 'Worn',
  stored: 'Stored',
  quest: 'Quest',
};

function ItemRow({ item }: { item: InventoryItem }): ReactElement {
  return (
    <li
      data-testid={`inventory-${item.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        padding: 'var(--space-2) var(--space-3)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface)',
      }}
    >
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontWeight: 'var(--weight-medium)' }}>{item.name}</span>
        <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
          ×{item.count} · {item.weight}kg
        </span>
      </span>
      <span style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
        <Pill intent="muted" title={`Slot: ${slotLabel[item.slot]}`}>
          {slotLabel[item.slot]}
        </Pill>
      </span>
      {item.description && (
        <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
          {item.description}
        </span>
      )}
    </li>
  );
}

const listStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-2)',
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

export function InventoryPanel({
  items,
  totals,
  title = 'Inventory',
}: InventoryPanelProps): ReactElement {
  if (items.length === 0) {
    return (
      <Card title={title}>
        <EmptyState
          title="You are carrying nothing"
          description="Items you pick up will appear here as the story unfolds."
        />
      </Card>
    );
  }
  return (
    <Card
      title={title}
      subtitle={
        <span style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Pill intent="muted" title="Unique items">{totals.uniqueItems} items</Pill>
          <Pill intent="muted" title="Total stack count">{totals.totalCount} total</Pill>
          <Pill intent="info" title="Total carried weight">{totals.totalWeight}kg</Pill>
        </span>
      }
    >
      <ul aria-label="Inventory items" style={listStyle}>
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </ul>
    </Card>
  );
}