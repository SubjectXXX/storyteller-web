import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  ApiError,
  LORE_FIXTURE,
  PINNED_MEMORY_FIXTURE,
  RECAP_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { MemoryPanel } from './MemoryPanel';

function makeWrapper(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('MemoryPanel', () => {
  it('renders the recap tab by default and shows the chronicle turns', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${RECAP_FIXTURE.adventure_id}/recap`) {
        return RECAP_FIXTURE;
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    render(<MemoryPanel adventureId={RECAP_FIXTURE.adventure_id} />, {
      wrapper: makeWrapper(fetcher),
    });
    for (const turn of RECAP_FIXTURE.turns) {
      expect(await screen.findByText(turn.headline)).toBeInTheDocument();
    }
  });

  it('renders the Stage 5 placeholder when the recap endpoint returns 404', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(404, { message: 'Coming in Stage 5', code: 'not_implemented' });
    };
    render(<MemoryPanel adventureId={42} />, { wrapper: makeWrapper(fetcher) });
    expect(await screen.findByText(/Stage 5/)).toBeInTheDocument();
  });

  it('switches to the lore tab and renders the lore entries', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${LORE_FIXTURE.adventure_id}/lore`) {
        return LORE_FIXTURE;
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const user = userEvent.setup();
    render(<MemoryPanel adventureId={LORE_FIXTURE.adventure_id} />, {
      wrapper: makeWrapper(fetcher),
    });
    await user.click(screen.getByTestId('memory-tab-lore'));
    for (const entry of LORE_FIXTURE.entries) {
      expect(await screen.findByText(entry.title)).toBeInTheDocument();
    }
  });

  it('renders the Pinned empty state when the list is empty', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${PINNED_MEMORY_FIXTURE.adventure_id}/pinned-memories`) {
        return PINNED_MEMORY_FIXTURE;
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const user = userEvent.setup();
    render(<MemoryPanel adventureId={PINNED_MEMORY_FIXTURE.adventure_id} />, {
      wrapper: makeWrapper(fetcher),
    });
    await user.click(screen.getByTestId('memory-tab-pinned'));
    expect(await screen.findByText(/No pinned memories yet/i)).toBeInTheDocument();
  });

  it('keeps the tabs accessible (role=tab + aria-selected)', () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    render(<MemoryPanel adventureId={42} />, { wrapper: makeWrapper(fetcher) });
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });
});