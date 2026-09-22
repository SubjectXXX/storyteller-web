/**
 * Module-level React context for the api-client. Kept in its own file so
 * `<ApiClientProvider>` (in `ApiClientContext.tsx`) only exports
 * components and the React fast-refresh boundary stays clean.
 */
import { createContext } from 'react';
import type { ApiClient } from './openapi';

export const ApiClientContext = createContext<ApiClient | null>(null);
