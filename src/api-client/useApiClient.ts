/**
 * Hook entry point for the api-client context. Kept in its own file so
 * `<ApiClientProvider>` (in `ApiClientContext.tsx`) only exports
 * components, which keeps the React fast-refresh boundary clean.
 */
import { useContext } from 'react';
import { ApiClientContext } from './context';
import type { ApiClient } from './openapi';

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be called inside <ApiClientProvider>');
  }
  return client;
}
