/**
 * AuthContext — bearer-token session for the Storyteller player SPA.
 *
 * The token is persisted to `localStorage` (see `./session.ts`) so a
 * refresh resumes the adventure. The context exposes `token` (read from
 * `localStorage` on mount), `user` (lazy `GET /api/auth/me` once the
 * token resolves), and the `signIn` / `signUp` / `signOut` actions.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApiClientProvider,
  type ApiClient,
  type AuthResponse,
  type SignInRequest,
  type SignUpRequest,
  type UserResponse,
} from '@/api-client';
import { primeUserWithToken, readStoredToken, writeStoredToken } from './session';
import { AuthContext } from './context';

export interface AuthContextValue {
  /** Bearer token. `null` when the user is signed out. */
  readonly token: string | null;
  /** Profile for the signed-in user. `null` while loading or signed-out. */
  readonly user: UserResponse | null;
  /** True once the initial `me()` fetch has settled (success or failure). */
  readonly ready: boolean;
  /** True while the initial `me()` is in flight. */
  readonly loading: boolean;
  /** Last auth error (sign-in / sign-up failure or initial-me rejection). */
  readonly error: Error | null;
  /** Exchange email + password for a Sanctum bearer token. */
  readonly signIn: (body: SignInRequest) => Promise<AuthResponse>;
  /** Create an account and receive a Sanctum bearer token. */
  readonly signUp: (body: SignUpRequest) => Promise<AuthResponse>;
  /** Revoke the current token (server + local). */
  readonly signOut: () => Promise<void>;
}

interface AuthProviderProps {
  readonly children: ReactNode;
}

/**
 * Wraps `<ApiClientProvider>` with the bearer token, then exposes the
 * session through `useAuth()`. Mount this in `main.tsx` between
 * `QueryClientProvider` and `BrowserRouter` so the auth context is the
 * first thing the router tree sees (matches ADR-0001 layering).
 */
export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const queryClient = useQueryClient();
  // Lazy-init: only read storage once, on first render.
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<UserResponse | null>(null);
  const [ready, setReady] = useState<boolean>(token === null);
  const [loading, setLoading] = useState<boolean>(token !== null);
  const [error, setError] = useState<Error | null>(null);

  // Bootstrap the user profile from the stored token (if any). The async
  // work happens in an effect so the initial render stays synchronous; if
  // the token is rejected we drop it and surface an error.
  useEffect(() => {
    if (token === null) {
      // No token to resolve — the lazy initial state already marked us ready.
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await primeUserWithToken(token);
        if (cancelled) return;
        setUser(me);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setUser(null);
        setError(err instanceof Error ? err : new Error(String(err)));
        writeStoredToken(null);
        setToken(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signIn = useCallback(
    async (body: SignInRequest): Promise<AuthResponse> => {
      setError(null);
      const { liveFetcher, createApi } = await import('@/api-client');
      const client: ApiClient = createApi(liveFetcher('/api'));
      try {
        const result = await client.signIn(body);
        writeStoredToken(result.token);
        setToken(result.token);
        setUser(result.user);
        setReady(true);
        setLoading(false);
        // Refetch any auth-gated query so the freshly-signed-in user sees
        // their wallet / adventures immediately.
        void queryClient.invalidateQueries();
        return result;
      } catch (err) {
        const apiErr = err instanceof Error ? err : new Error(String(err));
        setError(apiErr);
        throw apiErr;
      }
    },
    [queryClient],
  );

  const signUp = useCallback(
    async (body: SignUpRequest): Promise<AuthResponse> => {
      setError(null);
      const { liveFetcher, createApi } = await import('@/api-client');
      const client: ApiClient = createApi(liveFetcher('/api'));
      try {
        const result = await client.signUp(body);
        writeStoredToken(result.token);
        setToken(result.token);
        setUser(result.user);
        setReady(true);
        setLoading(false);
        void queryClient.invalidateQueries();
        return result;
      } catch (err) {
        const apiErr = err instanceof Error ? err : new Error(String(err));
        setError(apiErr);
        throw apiErr;
      }
    },
    [queryClient],
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      if (token) {
        const { liveFetcher, createApi } = await import('@/api-client');
        const client: ApiClient = createApi(liveFetcher('/api', token));
        await client.signOut();
      }
    } catch {
      // Even if the server revocation fails, clear locally so the user is
      // signed out in the SPA.
    } finally {
      writeStoredToken(null);
      setToken(null);
      setUser(null);
      setReady(true);
      setLoading(false);
      void queryClient.clear();
    }
  }, [queryClient, token]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, ready, loading, error, signIn, signUp, signOut }),
    [token, user, ready, loading, error, signIn, signUp, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      <ApiClientProvider authToken={token}>{children}</ApiClientProvider>
    </AuthContext.Provider>
  );
}
