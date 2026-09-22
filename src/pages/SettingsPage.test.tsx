import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from './SettingsPage';
import {
  ApiClientProvider,
  ApiError,
  fixtureFetcher,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { SETTINGS_RESOURCE_FIXTURE } from '@/fixtures/data';

function renderWithFetcher(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter>
            <SettingsPage />
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  it('renders the two setting groups (reading + content warnings)', () => {
    renderWithFetcher(fixtureFetcher());
    expect(screen.getByRole('group', { name: /reading experience/i })).toBeTruthy();
    expect(screen.getByRole('group', { name: /content warnings/i })).toBeTruthy();
  });

  it('renders the theme/font/motion controls', () => {
    renderWithFetcher(fixtureFetcher());
    expect(screen.getByLabelText(/theme/i)).toBeTruthy();
    expect(screen.getByLabelText(/font size/i)).toBeTruthy();
    expect(screen.getByLabelText(/typewriter mode/i)).toBeTruthy();
    expect(screen.getByLabelText(/reduce motion/i)).toBeTruthy();
  });

  it('hits GET /api/me/settings on mount', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      calls.push(`${options.method ?? 'GET'} ${path}`);
      return SETTINGS_RESOURCE_FIXTURE;
    };
    renderWithFetcher(fetcher);

    await waitFor(() => {
      expect(calls.some((line) => line.endsWith('/me/settings'))).toBe(true);
    });
  });

  it('PUTs /api/me/settings when the user saves edits', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push({ method, path, body: options.body });
      if (method === 'GET') return SETTINGS_RESOURCE_FIXTURE;
      return { ...SETTINGS_RESOURCE_FIXTURE, ...((options.body ?? {}) as Partial<typeof SETTINGS_RESOURCE_FIXTURE>) };
    };
    renderWithFetcher(fetcher);

    const select = await screen.findByLabelText(/theme/i);
    fireEvent.change(select, { target: { value: 'dark' } });

    const save = await screen.findByRole('button', { name: /save changes/i });
    fireEvent.click(save);

    await waitFor(() => {
      const putCall = calls.find((c) => c.method === 'PUT' && c.path === '/me/settings');
      expect(putCall).toBeDefined();
    });
  });

  it('renders the save-error banner when the PUT fails', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'GET') return SETTINGS_RESOURCE_FIXTURE;
      throw new ApiError(422, { message: 'Validation failed', code: 'invalid_payload' });
    };
    renderWithFetcher(fetcher);

    const select = await screen.findByLabelText(/theme/i);
    fireEvent.change(select, { target: { value: 'dark' } });

    const save = await screen.findByRole('button', { name: /save changes/i });
    fireEvent.click(save);

    await waitFor(() => {
      const alert = screen.queryByRole('alert');
      expect(alert?.textContent).toMatch(/save failed/i);
    });
  });
});
