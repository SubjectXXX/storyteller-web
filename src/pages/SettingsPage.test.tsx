import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from './SettingsPage';
import { ApiClientProvider, ApiError, fixtureFetcher } from '@/api-client';
import type { Fetcher } from '@/api-client';

function renderWithFetcher(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider fetcher={fetcher}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  it('renders all three setting groups from the fixtures', () => {
    renderWithFetcher(fixtureFetcher());
    expect(screen.getByText(/infinite narrative/i)).toBeInTheDocument();
    expect(screen.getByText(/reading typography/i)).toBeInTheDocument();
    expect(screen.getByText(/physical needs/i)).toBeInTheDocument();
  });

  it('flags inherited rows with the Inherited pill', () => {
    renderWithFetcher(fixtureFetcher());
    expect(screen.getAllByText(/inherited/i).length).toBeGreaterThanOrEqual(3);
  });

  it('flags the hunger row as Locked with a reason', () => {
    renderWithFetcher(fixtureFetcher());
    expect(screen.getByText(/hunger/i)).toBeInTheDocument();
    expect(screen.getAllByText(/locked/i).length).toBeGreaterThanOrEqual(1);
  });

  it('hits GET /api/me/settings on mount', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      calls.push(`${options.method ?? 'GET'} ${path}`);
      const { SETTINGS_FIXTURE } = await import('@/fixtures/data');
      return SETTINGS_FIXTURE;
    };
    renderWithFetcher(fetcher);

    await waitFor(() => {
      expect(calls.some((line) => line.endsWith('/me/settings'))).toBe(true);
    });
  });

  it('PUTs /api/me/settings when the user saves edits', async () => {
    const user = userEvent.setup();
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push({ method, path, body: options.body });
      if (method === 'GET') {
        const { SETTINGS_FIXTURE } = await import('@/fixtures/data');
        return SETTINGS_FIXTURE;
      }
      return { groups: options.body };
    };
    renderWithFetcher(fetcher);

    const editButtons = await screen.findAllByRole('button', { name: /edit/i });
    // Edit the first non-locked row to mark the page dirty.
    await user.click(editButtons[0]!);

    const save = await screen.findByRole('button', { name: /save changes/i });
    await user.click(save);

    await waitFor(() => {
      const putCall = calls.find((c) => c.method === 'PUT' && c.path === '/me/settings');
      expect(putCall).toBeDefined();
    });
  });

  it('renders the save-error banner when the PUT fails', async () => {
    const user = userEvent.setup();
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'GET') {
        const { SETTINGS_FIXTURE } = await import('@/fixtures/data');
        return SETTINGS_FIXTURE;
      }
      throw new ApiError(422, { message: 'Validation failed', code: 'invalid_payload' });
    };
    renderWithFetcher(fetcher);

    const editButtons = await screen.findAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]!);

    const save = await screen.findByRole('button', { name: /save changes/i });
    await user.click(save);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/save failed/i);
    });
  });
});
