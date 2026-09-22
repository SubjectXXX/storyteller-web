/**
 * Session storage helpers used by `<AuthProvider>` and any consumer that
 * needs the bare bearer token (tests, future one-off fetches). Kept out of
 * `AuthContext.tsx` so the React fast-refresh boundary stays clean.
 */
import type { ApiClient, UserResponse } from '@/api-client';

export const SESSION_STORAGE_KEY = 'storyteller.session.token';

export function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    // Browsers can refuse localStorage in private mode or when disabled.
    return null;
  }
}

export function writeStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token === null) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SESSION_STORAGE_KEY, token);
    }
  } catch {
    // Ignore storage failures — the SPA still works in-memory for the
    // current session.
  }
}

export async function primeUserWithToken(token: string): Promise<UserResponse> {
  const { liveFetcher, createApi } = await import('@/api-client');
  const client: ApiClient = createApi(liveFetcher('/api', token));
  return client.me();
}

export function getStoredToken(): string | null {
  return readStoredToken();
}
