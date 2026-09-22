import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './HomePage';
import { ApiClientProvider, fixtureFetcher } from '@/api-client';

function renderWithProviders(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider fetcher={fixtureFetcher()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  it('renders the welcome header and the featured scenario card', () => {
    renderWithProviders();

    expect(screen.getByRole('heading', { level: 1, name: /welcome/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /a quiet court/i })).toBeInTheDocument();
  });

  it('links to the scenario library', () => {
    renderWithProviders();
    expect(screen.getByRole('link', { name: /browse scenarios/i })).toHaveAttribute('href', '/scenarios');
  });
});
