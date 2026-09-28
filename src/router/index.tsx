import type { ReactElement } from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { PageShell } from '@/components/PageShell';
import { LoadingPanel } from '@/components/LoadingPanel';
import { AuthGate } from '@/components/AuthGate';
import {
  AdventurePage,
  AdventuresListPage,
  HomePage,
  LoginPage,
  NotFoundPage,
  PlaySurfacePlaceholder,
  ReferralsPage,
  RegisterPage,
  ScenarioDetailPage,
  ScenarioLibraryPage,
  StorySeedPreviewPlaceholder,
  UserSettingsPage,
  WalletPage,
} from './lazyPages';

function wrap(
  element: ReactElement,
  requireAuth = false,
  layout: 'default' | 'hud' = 'default',
): ReactElement {
  const inner = (
    <Suspense fallback={<LoadingPanel label="Loading" />}>{element}</Suspense>
  );
  return (
    <PageShell layout={layout}>
      {requireAuth ? <AuthGate>{inner}</AuthGate> : inner}
    </PageShell>
  );
}

/**
 * Auth requirements (per ADR-0001 + S2 spec):
 *  - Public: /, /library, /seed-preview, /play/:adventureId?, /login, /register
 *  - Auth:   /adventures/:id, /wallet, /settings, /referrals
 */
export function router(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={wrap(<HomePage />)} />
      <Route path="/scenarios" element={wrap(<ScenarioLibraryPage />)} />
      <Route path="/scenarios/:slug" element={wrap(<ScenarioDetailPage />)} />
      <Route path="/adventures" element={wrap(<AdventuresListPage />, true)} />
      {/* The desktop player view is the only route that opts into the
          fixed, non-scrolling HUD frame. Every other route keeps the
          scrolling document layout. */}
      <Route path="/adventures/:id" element={wrap(<AdventurePage />, true, 'hud')} />
      <Route path="/play/:adventureId?" element={wrap(<PlaySurfacePlaceholder />)} />
      <Route path="/login" element={wrap(<LoginPage />)} />
      <Route path="/register" element={wrap(<RegisterPage />)} />
      <Route path="/settings" element={wrap(<UserSettingsPage />, true)} />
      <Route path="/wallet" element={wrap(<WalletPage />, true)} />
      <Route path="/referrals" element={wrap(<ReferralsPage />, true)} />
      <Route path="/story-seed-preview" element={wrap(<StorySeedPreviewPlaceholder />)} />
      <Route path="/admin" element={<Navigate to="/admin-not-available-here" replace />} />
      <Route path="*" element={wrap(<NotFoundPage />)} />
    </Routes>
  );
}
