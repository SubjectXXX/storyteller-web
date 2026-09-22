/**
 * `useAuth` is the only auth-aware entry point in the player SPA. The
 * hook lives in `@/auth/useAuth.ts`; this file re-exports it so existing
 * imports `import { useAuth } from '@/hooks'` keep working.
 */
export { useAuth } from '@/auth/useAuth';
