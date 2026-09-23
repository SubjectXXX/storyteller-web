import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
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

expect.extend({ toHaveNoViolations });

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

describe('MemoryPanel accessibility', () => {
  it('passes axe when the recap tab is populated', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${RECAP_FIXTURE.adventure_id}/recap`) {
        return RECAP_FIXTURE;
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { container } = render(<MemoryPanel adventureId={RECAP_FIXTURE.adventure_id} />, {
      wrapper: makeWrapper(fetcher),
    });
    // Wait a tick so the async recap query resolves.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes axe when the lore tab is populated', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${LORE_FIXTURE.adventure_id}/lore`) {
        return LORE_FIXTURE;
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { container } = render(
      <MemoryPanel adventureId={LORE_FIXTURE.adventure_id} defaultTab="lore" />,
      { wrapper: makeWrapper(fetcher) },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes axe when the pinned tab is empty', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${PINNED_MEMORY_FIXTURE.adventure_id}/pinned-memories`) {
        return PINNED_MEMORY_FIXTURE;
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { container } = render(
      <MemoryPanel adventureId={PINNED_MEMORY_FIXTURE.adventure_id} defaultTab="pinned" />,
      { wrapper: makeWrapper(fetcher) },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});