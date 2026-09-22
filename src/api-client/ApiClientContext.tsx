import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { createApi, liveFetcher, withFixtureFallback, type ApiClient, type Fetcher } from './openapi';

const ApiClientContext = createContext<ApiClient | null>(null);

interface ApiClientProviderProps {
  readonly children: ReactNode;
  /**
   * Override the default fetcher. The default is `liveFetcher('/api')`
   * wrapped with `withFixtureFallback`, so the SPA degrades gracefully when
   * the API container is offline in dev. Tests inject a deterministic
   * fetcher via the `fetcher` prop.
   */
  readonly fetcher?: Fetcher;
  readonly authToken?: string;
}

export function ApiClientProvider({
  children,
  fetcher,
  authToken,
}: ApiClientProviderProps): ReactElement {
  const client = createApi(fetcher ?? defaultFetcher(authToken));
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be called inside <ApiClientProvider>');
  }
  return client;
}

function defaultFetcher(authToken?: string): Fetcher {
  const live = liveFetcher('/api', authToken);
  return withFixtureFallback(live);
}
