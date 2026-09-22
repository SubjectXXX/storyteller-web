import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './LoginPage';
import {
  ApiClientProvider,
  ApiError,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { AUTH_FIXTURE } from '@/fixtures/data';

function renderWithFetcher(fetcher: Fetcher, initialEntries: string[] = ['/login']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter initialEntries={initialEntries}>
            <LoginPage />
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

describe('LoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the email + password form', () => {
    renderWithFetcher(async () => AUTH_FIXTURE);
    expect(screen.getByRole('heading', { level: 1, name: /welcome back/i }).textContent).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('POSTs /api/auth/login and persists the token on success', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push(`${method} ${path}`);
      if (path === '/auth/login' && method === 'POST') {
        return AUTH_FIXTURE;
      }
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      return undefined;
    };
    renderWithFetcher(fetcher);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    const password = screen.getByLabelText(/password/i) as HTMLInputElement;
    setNativeValue(email, 'wren@example.com');
    setNativeValue(password, '12345678');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(calls).toContain('POST /auth/login');
    });
    expect(window.localStorage.getItem('storyteller.session.token')).toBe(AUTH_FIXTURE.token);
  });

  it('surfaces the API error inline', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (path === '/auth/login' && method === 'POST') {
        throw new ApiError(422, { message: 'Invalid credentials', code: 'validation' });
      }
      return undefined;
    };
    renderWithFetcher(fetcher);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    const password = screen.getByLabelText(/password/i) as HTMLInputElement;
    setNativeValue(email, 'wren@example.com');
    setNativeValue(password, 'wrong-password');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const alert = screen.queryByRole('alert');
      expect(alert?.textContent).toMatch(/invalid email or password/i);
    });
  });
});
