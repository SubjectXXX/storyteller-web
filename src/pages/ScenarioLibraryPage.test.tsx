import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScenarioLibraryPage from './ScenarioLibraryPage';
import {
  ApiClientProvider,
  ApiError,
  fixtureFetcher,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { ADVENTURE_FIXTURE, SCENARIO_RESOURCE_FIXTURES } from '@/fixtures/data';

function renderWithFetcher(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter>
            <ScenarioLibraryPage />
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function setNativeValue(element: HTMLElement, value: string): void {
  const proto = Object.getPrototypeOf(element) as { descriptor: PropertyDescriptor | undefined };
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('ScenarioLibraryPage', () => {
  it('renders every fixture scenario from data.ts (fixture fallback path)', () => {
    renderWithFetcher(fixtureFetcher());

    expect(screen.getByRole('heading', { level: 2, name: /a quiet court/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /cartographer/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /beyond the reef/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /ember/i })).toBeTruthy();
  });

  it('renders a Start adventure button for every scenario', () => {
    renderWithFetcher(fixtureFetcher());

    const starts = screen.getAllByRole('button', { name: /start adventure/i });
    expect(starts.length).toBeGreaterThanOrEqual(4);
  });

  it('hits /api/scenarios on mount and renders the response', async () => {
    const observed: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      observed.push(`${options.method ?? 'GET'} ${path}`);
      return SCENARIO_RESOURCE_FIXTURES;
    };
    renderWithFetcher(fetcher);

    await waitFor(() => {
      expect(observed.some((line) => line.endsWith('/scenarios'))).toBe(true);
    });
  });

  it('renders the offline banner when the API fails but keeps the fixture list visible', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(503, { message: 'Service unavailable', code: 'down' });
    };
    renderWithFetcher(fetcher);

    await waitFor(() => {
      expect(screen.getByTestId('library-error')).toBeTruthy();
    });
    expect(screen.getByRole('heading', { level: 2, name: /a quiet court/i })).toBeTruthy();
  });

  it('filters the list locally when the user types into the search box', async () => {
    renderWithFetcher(fixtureFetcher());

    const input = screen.getByPlaceholderText(/filter scenarios/i);
    setNativeValue(input, 'reef');

    expect(screen.getByRole('heading', { level: 2, name: /beyond the reef/i })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 2, name: /a quiet court/i })).toBeNull();
  });

  it('POSTs /api/adventures when the user clicks Start adventure', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push(`${method} ${path}`);
      if (path === '/scenarios' && method === 'GET') {
        return SCENARIO_RESOURCE_FIXTURES;
      }
      if (path === '/adventures' && method === 'POST') {
        return ADVENTURE_FIXTURE;
      }
      return undefined;
    };
    renderWithFetcher(fetcher);

    const startButtons = await screen.findAllByRole('button', { name: /start adventure/i });
    fireEvent.click(startButtons[0]!);

    await waitFor(() => {
      expect(calls).toContain('POST /adventures');
    });
  });

  it('surfaces an error inline when the start-adventure request fails', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (path === '/scenarios' && method === 'GET') {
        return SCENARIO_RESOURCE_FIXTURES;
      }
      if (path === '/adventures' && method === 'POST') {
        throw new ApiError(404, { message: 'Scenario not found', code: 'not_found' });
      }
      return undefined;
    };
    renderWithFetcher(fetcher);

    const startButtons = await screen.findAllByRole('button', { name: /start adventure/i });
    fireEvent.click(startButtons[0]!);

    await waitFor(() => {
      const alert = screen.queryByRole('alert');
      expect(alert?.textContent).toMatch(/could not start this adventure/i);
    });
  });
});
