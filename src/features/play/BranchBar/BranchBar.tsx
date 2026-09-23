/**
 * `<BranchBar>` — the active-branch header + Retry/Undo/Redo buttons +
 * tree popover. The component never fetches: it consumes the branch tree
 * from `useBranchTree` (already running on `AdventurePage`) and dispatches
 * the three mutations via the supplied callbacks.
 */
import { useId, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import type { BranchTreeNode } from '@/api-client';

export interface BranchBarProps {
  readonly tree: ReadonlyArray<BranchTreeNode> | undefined;
  readonly activeBranchId: number | undefined;
  readonly isPending: boolean;
  readonly error: { readonly message: string } | null;
  readonly onRetry: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly title?: string;
}

const popoverRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--space-2)',
  padding: 'var(--space-1) var(--space-2)',
  borderRadius: 'var(--radius-sm)',
};

export function BranchBar({
  tree,
  activeBranchId,
  isPending,
  error,
  onRetry,
  onUndo,
  onRedo,
  title = 'Branch',
}: BranchBarProps): ReactElement {
  const active = useMemo(() => tree?.find((b) => b.is_active) ?? null, [tree, activeBranchId]);
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  const canRetry = active?.can_retry ?? false;
  const canUndo = active?.can_undo ?? false;
  const canRedo = active?.can_redo ?? false;

  return (
    <Card
      title={title}
      subtitle={
        <span style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'var(--weight-medium)' }}>{active?.name ?? '—'}</span>
          {active && (
            <Pill intent="muted" title={`Depth ${active.depth}`}>
              depth {active.depth}
            </Pill>
          )}
          <Button
            intent="ghost"
            size="sm"
            onClick={() => setOpen((prev) => !prev)}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={popoverId}
            disabled={!tree || tree.length === 0}
          >
            {open ? 'Hide tree' : 'View tree'}
          </Button>
        </span>
      }
    >
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 0 }}>
          {error.message}
        </p>
      )}
      <div
        role="group"
        aria-label="Branch navigation"
        style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}
      >
        <Button
          intent="secondary"
          size="sm"
          onClick={onRetry}
          disabled={!canRetry || isPending}
          aria-label="Retry the current branch from the active turn"
        >
          Retry
        </Button>
        <Button
          intent="secondary"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo || isPending}
          aria-label="Undo the last turn in this branch"
        >
          Undo
        </Button>
        <Button
          intent="secondary"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo || isPending}
          aria-label="Redo the next turn in this branch"
        >
          Redo
        </Button>
      </div>
      {open && tree && tree.length > 0 && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Branch tree"
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2)',
            background: 'var(--color-surface)',
          }}
        >
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-1)' }}>
            {tree.map((node) => {
              const isActive = node.id === activeBranchId;
              return (
                <li
                  key={node.id}
                  style={{
                    ...popoverRowStyle,
                    background: isActive ? 'var(--color-surface-muted)' : 'transparent',
                    fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-regular)',
                  }}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span>
                    #{node.id} {node.name}{' '}
                    {isActive && (
                      <Pill intent="info" title="Currently active branch">
                        active
                      </Pill>
                    )}
                  </span>
                  <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
                    depth {node.depth} · {node.turn_count} turn{node.turn_count === 1 ? '' : 's'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}