import type { ReactElement, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { LoadingPanel } from '@/components/LoadingPanel';

interface AuthGateProps {
  readonly children: ReactNode;
  /** Where to send unauthenticated visitors. Defaults to `/login`. */
  readonly redirectTo?: string;
}

/**
 * Wrap a route element to require an authenticated session. On first paint
 * we still need to read the bearer token from `localStorage` and resolve
 * the user via `GET /api/auth/me`; while that promise is pending we show a
 * loading panel so the page doesn't briefly render in an unauthenticated
 * state (which would otherwise trigger an immediate redirect to /login).
 */
export function AuthGate({ children, redirectTo = '/login' }: AuthGateProps): ReactElement {
  const { token, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <LoadingPanel label="Checking your session" intent="page" />
    );
  }

  if (token === null) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    const params = new URLSearchParams({ next });
    return <Navigate to={`${redirectTo}?${params.toString()}`} replace />;
  }

  return <>{children}</>;
}
