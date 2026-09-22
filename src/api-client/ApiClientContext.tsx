import type { ReactElement, ReactNode } from 'react';
import { createApi, liveFetcher, withFixtureFallback, type ApiClient, type Fetcher } from './openapi';
import { ApiClientContext } from './context';

interface ApiClientProviderProps {
  readonly children: ReactNode;
  /**
   * Override the default fetcher. The default is `liveFetcher('/api')`
   * wrapped with `withFixtureFallback`, so the SPA degrades gracefully when
   * the API container is offline in dev. Tests inject a deterministic
   * fetcher via the `fetcher` prop.
   */
  readonly fetcher?: Fetcher;
  readonly authToken?: string | null;
}

export function ApiClientProvider({
  children,
  fetcher,
  authToken,
}: ApiClientProviderProps): ReactElement {
  const client = createApi(fetcher ?? defaultFetcher(authToken ?? undefined));
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

function defaultFetcher(authToken?: string): Fetcher {
  const live = liveFetcher('/api', authToken);
  return withFixtureFallback(live);
}

export type { ApiClient };
