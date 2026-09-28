/**
 * `<ContextRail>` — the fixed right-hand column of the player HUD.
 *
 * Layout contract:
 *   - fixed width (`HUD_RAIL_WIDTH`), hairline left border,
 *   - a tab strip PINNED at the top that never scrolls away,
 *   - a single `overflow-y: auto` body beneath it.
 *
 * Accessibility contract:
 *   - a real `tablist` / `tab` / `tabpanel` triple,
 *   - roving `tabindex` (only the selected tab is tabbable),
 *   - ArrowLeft / ArrowRight / Home / End move selection, matching the
 *     WAI-ARIA authoring practices and the pattern already used by
 *     `<MemoryPanel>`.
 *
 * The rail is presentational: every query result arrives as a prop from
 * `AdventurePage`, which already owns the hooks.
 */
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { CharacterPanel } from '@/features/play/CharacterPanel/CharacterPanel';
import { NpcRoster } from '@/features/play/NpcRoster/NpcRoster';
import { MemoryPanel } from '@/features/play/MemoryPanel/MemoryPanel';
import { DiceClockPanel } from '@/features/play/DiceClockPanel/DiceClockPanel';
import { InventoryPanel } from '@/features/play/InventoryPanel/InventoryPanel';
import { HUD_RAIL_WIDTH } from '@/features/play/hudLayout';
import type { CharacterResource, NpcResource } from '@/api-client';
import type { InventoryItem, InventoryTotals, MechanicEvent } from '@/hooks';

export type ContextRailTabId = 'character' | 'npcs' | 'memory' | 'dice';

/** Id prefix for the tab/tabpanel `aria-controls` + `aria-labelledby` pair. */
const CONTEXT_RAIL_ID_BASE = 'context-rail';

export interface ContextRailProps {
  readonly adventureId: number;
  readonly character: CharacterResource | undefined;
  readonly characterError: { readonly message: string } | null;
  readonly isCharacterLoading: boolean;
  readonly npcs: ReadonlyArray<NpcResource> | undefined;
  readonly npcError: { readonly message: string } | null;
  readonly isNpcLoading: boolean;
  readonly mechanicEvent: MechanicEvent | null;
  readonly inventoryItems: ReadonlyArray<InventoryItem>;
  readonly inventoryTotals: InventoryTotals;
  /** Active tab on first render. The design lands on `Character`. */
  readonly defaultTab?: ContextRailTabId;
}

const TABS: ReadonlyArray<{ readonly id: ContextRailTabId; readonly label: string }> = [
  { id: 'character', label: 'Character' },
  { id: 'npcs', label: 'NPC Codex' },
  { id: 'memory', label: 'Memory & Lore' },
  { id: 'dice', label: 'Dice & Checks' },
];

const railStyle: CSSProperties = {
  flex: `0 0 ${HUD_RAIL_WIDTH}`,
  width: HUD_RAIL_WIDTH,
  maxWidth: HUD_RAIL_WIDTH,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  borderLeft: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
};

// The tab strip is a sibling of the scroller, not a child, so scrolling
// the body can never move it.
const stripStyle: CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  gap: 'var(--space-1)',
  alignItems: 'stretch',
  borderBottom: '1px solid var(--color-border)',
  padding: 'var(--space-2)',
  background: 'var(--color-surface)',
  overflowX: 'auto',
};

const tabBaseStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--weight-medium)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  minHeight: 'var(--control-touch-min)',
  padding: 'var(--space-1) var(--space-3)',
  background: 'transparent',
  color: 'var(--color-foreground-muted)',
  border: 'none',
  borderBottom: '2px solid transparent',
};

const tabActiveStyle: CSSProperties = {
  ...tabBaseStyle,
  color: 'var(--color-primary)',
  borderBottomColor: 'var(--color-primary)',
};

const tabInactiveStyle: CSSProperties = {
  ...tabBaseStyle,
  borderBottomColor: 'transparent',
};

const bodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: 'var(--space-3)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
};

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
};

export function ContextRail({
  adventureId,
  character,
  characterError,
  isCharacterLoading,
  npcs,
  npcError,
  isNpcLoading,
  mechanicEvent,
  inventoryItems,
  inventoryTotals,
  defaultTab = 'character',
}: ContextRailProps): ReactElement {
  const [tab, setTab] = useState<ContextRailTabId>(defaultTab);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // There is exactly one rail per player view, so the ids are fixed
  // rather than generated — stable `aria-controls` / `aria-labelledby`
  // wiring is easier to assert and debug than a `useId()` prefix.
  const baseId = CONTEXT_RAIL_ID_BASE;

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const index = TABS.findIndex((entry) => entry.id === tab);
      if (index < 0) return;
      let nextIndex: number | null = null;
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (index + 1) % TABS.length;
          break;
        case 'ArrowLeft':
          nextIndex = (index - 1 + TABS.length) % TABS.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = TABS.length - 1;
          break;
        default:
          return;
      }
      const next = TABS[nextIndex];
      if (!next) return;
      event.preventDefault();
      setTab(next.id);
      tabRefs.current[next.id]?.focus();
    },
    [tab],
  );

  const panel = (id: ContextRailTabId): ReactNode => {
    switch (id) {
      case 'character':
        // The design groups the character sheet and what they carry in
        // one tab; the existing panels already own both structures, so
        // they are mounted as-is rather than rewritten.
        return (
          <div style={stackStyle}>
            <CharacterPanel
              character={character}
              isLoading={isCharacterLoading}
              error={characterError}
            />
            <InventoryPanel items={inventoryItems} totals={inventoryTotals} />
          </div>
        );
      case 'npcs':
        return (
          <NpcRoster npcs={npcs} isLoading={isNpcLoading} error={npcError} />
        );
      case 'memory':
        return <MemoryPanel adventureId={adventureId} title="Memory & Lore" />;
      case 'dice':
      default:
        return <DiceClockPanel event={mechanicEvent} title="Dice & Checks" />;
    }
  };

  return (
    <aside aria-label="Adventure context" style={railStyle}>
      <div role="tablist" aria-label="Adventure context tabs" style={stripStyle}>
        {TABS.map((entry) => {
          const selected = entry.id === tab;
          return (
            <button
              key={entry.id}
              ref={(node) => {
                tabRefs.current[entry.id] = node;
              }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${entry.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(entry.id)}
              onKeyDown={onKeyDown}
              style={selected ? tabActiveStyle : tabInactiveStyle}
              data-testid={`context-rail-tab-${entry.id}`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
      {/* Single tabpanel whose `aria-labelledby` tracks the selected tab —
          the same shape `<MemoryPanel>` already uses. */}
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        tabIndex={0}
        style={bodyStyle}
      >
        {panel(tab)}
      </div>
    </aside>
  );
}
