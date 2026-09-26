import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { router } from '@/router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/auth/AuthContext';
import '@storyteller/design-system/tokens.css';
import '@storyteller/design-system/reset.css';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Per-page opt-in (e.g. `useAdventure`) sets this to true so the
      // player resumes their adventure on tab-refocus without us hammering
      // /api on every route change.
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById('root');
if (!root) {
  throw new Error('Storyteller web — no #root element rendered by index.html');
}

// Order matters: QueryClientProvider → BrowserRouter → AuthProvider → router.
// R38b — `AuthProvider` now calls `useNavigate()` inside `signOut()` to
// route the operator to `/login` after a sign-out click. That hook
// requires a `Router` ancestor, so the router must sit above the auth
// provider. The auth context still owns the bearer token + ApiClient,
// so every route continues to render with the correct Authorization
// header (or none, when signed out).
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename="/web">
          <AuthProvider>{router()}</AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
