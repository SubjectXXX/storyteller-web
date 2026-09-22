/**
 * `useAuth` is the only auth-aware entry point in the player SPA. Lives
 * here (not next to `<AuthProvider>`) so the React fast-refresh boundary
 * stays clean — context.tsx only exports components.
 */
import { useContext } from 'react';
import { AuthContext } from './context';
import type { AuthContextValue } from './AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be called inside <AuthProvider>');
  }
  return ctx;
}
