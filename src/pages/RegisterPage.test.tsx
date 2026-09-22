import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from './RegisterPage';
import {
  ApiClientProvider,
  ApiError,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { AUTH_FIXTURE } from '@/fixtures/data';

function renderWithFetcher(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter initialEntries={['/register']}>
            <RegisterPage />
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

function checkCheckbox(element: HTMLElement): void {
  setNativeValue(element, 'true');
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('RegisterPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders all four fields plus the adult attestation', () => {
    renderWithFetcher(async () => AUTH_FIXTURE);
    expect(screen.getByLabelText(/display name/i)).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password/i)).toBeTruthy();
    expect(screen.getByLabelText(/confirm password/i)).toBeTruthy();
    expect(screen.getByLabelText(/adult attestation/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /create account/i })).toBeTruthy();
  });

  it('blocks submission when the adult attestation is missing', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(422, { message: 'Adult attestation required', code: 'validation' });
    };
    renderWithFetcher(fetcher);

    setNativeValue(screen.getByLabelText(/display name/i), 'New User');
    setNativeValue(screen.getByLabelText(/email/i), 'new@example.com');
    setNativeValue(screen.getByLabelText(/^password/i), '12345678');
    setNativeValue(screen.getByLabelText(/confirm password/i), '12345678');
    // intentionally skip the adult attestation checkbox
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/must attest you are an adult/i)).toBeTruthy();
    });
  });

  it('blocks submission when the password confirmation does not match', async () => {
    renderWithFetcher(async () => AUTH_FIXTURE);

    setNativeValue(screen.getByLabelText(/display name/i), 'New User');
    setNativeValue(screen.getByLabelText(/email/i), 'new@example.com');
    setNativeValue(screen.getByLabelText(/^password/i), '12345678');
    setNativeValue(screen.getByLabelText(/confirm password/i), 'different-password');
    checkCheckbox(screen.getByLabelText(/adult attestation/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/does not match/i)).toBeTruthy();
    });
  });

  it('POSTs /api/auth/register and persists the token on success', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push(`${method} ${path}`);
      if (path === '/auth/register' && method === 'POST') return AUTH_FIXTURE;
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      return undefined;
    };
    renderWithFetcher(fetcher);

    setNativeValue(screen.getByLabelText(/display name/i), 'New User');
    setNativeValue(screen.getByLabelText(/email/i), 'new@example.com');
    setNativeValue(screen.getByLabelText(/^password/i), '12345678');
    setNativeValue(screen.getByLabelText(/confirm password/i), '12345678');
    checkCheckbox(screen.getByLabelText(/adult attestation/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(calls).toContain('POST /auth/register');
    });
    expect(window.localStorage.getItem('storyteller.session.token')).toBe(AUTH_FIXTURE.token);
  });
});
