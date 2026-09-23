import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BRANCH_TREE_FIXTURE } from '@/api-client';
import { BranchBar } from './BranchBar';

describe('BranchBar', () => {
  it('renders the active branch name and depth pill', () => {
    render(
      <BranchBar
        tree={BRANCH_TREE_FIXTURE.branches}
        activeBranchId={BRANCH_TREE_FIXTURE.active_branch_id}
        isPending={false}
        error={null}
        onRetry={() => undefined}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );
    const active = BRANCH_TREE_FIXTURE.branches.find((b) => b.is_active)!;
    expect(screen.getByText(active.name)).toBeInTheDocument();
    expect(screen.getByText(`depth ${active.depth}`)).toBeInTheDocument();
  });

  it('disables buttons when the active branch cannot do that op', () => {
    render(
      <BranchBar
        tree={BRANCH_TREE_FIXTURE.branches}
        activeBranchId={BRANCH_TREE_FIXTURE.active_branch_id}
        isPending={false}
        error={null}
        onRetry={() => undefined}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );
    const redo = screen.getByRole('button', { name: /redo/i });
    expect(redo).toBeDisabled();
  });

  it('invokes the retry callback when clicked', () => {
    const onRetry = vi.fn();
    render(
      <BranchBar
        tree={BRANCH_TREE_FIXTURE.branches}
        activeBranchId={BRANCH_TREE_FIXTURE.active_branch_id}
        isPending={false}
        error={null}
        onRetry={onRetry}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the branch tree popover when toggled open', () => {
    render(
      <BranchBar
        tree={BRANCH_TREE_FIXTURE.branches}
        activeBranchId={BRANCH_TREE_FIXTURE.active_branch_id}
        isPending={false}
        error={null}
        onRetry={() => undefined}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /view tree|hide tree/i }));
    expect(screen.getByRole('dialog', { name: /branch tree/i })).toBeInTheDocument();
    for (const node of BRANCH_TREE_FIXTURE.branches) {
      expect(screen.getByText(`#${node.id} ${node.name}`)).toBeInTheDocument();
    }
  });

  it('renders an error alert when the error prop is set', () => {
    render(
      <BranchBar
        tree={BRANCH_TREE_FIXTURE.branches}
        activeBranchId={BRANCH_TREE_FIXTURE.active_branch_id}
        isPending={false}
        error={{ message: 'Branch does not allow retry' }}
        onRetry={() => undefined}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/retry/i);
  });

  it('falls back to a placeholder when no tree is available', () => {
    render(
      <BranchBar
        tree={undefined}
        activeBranchId={undefined}
        isPending={false}
        error={null}
        onRetry={() => undefined}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /view tree/i })).toBeDisabled();
  });
});
