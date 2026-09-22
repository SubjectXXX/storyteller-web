import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { router } from '@/router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ApiClientProvider } from '@/api-client';
import '@storyteller/design-system/tokens.css';
import '@storyteller/design-system/reset.css';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById('root');
if (!root) {
  throw new Error('Storyteller web — no #root element rendered by index.html');
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider>
          <BrowserRouter>{router()}</BrowserRouter>
        </ApiClientProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
