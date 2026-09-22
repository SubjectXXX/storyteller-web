/**
 * Module-level React context for the auth provider. Kept in its own file
 * so `<AuthProvider>` (in `AuthContext.tsx`) only exports components and
 * the React fast-refresh boundary stays clean.
 */
import { createContext } from 'react';
import type { AuthContextValue } from './AuthContext';

export const AuthContext = createContext<AuthContextValue | null>(null);
