import type { ReactElement } from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { PageShell } from '@/components/PageShell';
import { LoadingPanel } from '@/components/LoadingPanel';
import { AuthGate } from '@/components/AuthGate';
import {
  AdventurePage,
  HomePage,
  LoginPage,
  NotFoundPage,
  PlaySurfacePlaceholder,
  ReferralsPage,
  RegisterPage,
  ScenarioLibraryPage,
  SettingsPage,
  StorySeedPreviewPlaceholder,
  WalletPage,
} from './lazyPages';

function wrap(element: ReactElement, requireAuth = false): ReactElement {
  const inner = (
    <Suspense fallback={<LoadingPanel label="Loading" />}>{element}</Suspense>
  );
  return (
    <PageShell>
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
      <Route path="/adventures/:id" element={wrap(<AdventurePage />, true)} />
      <Route path="/play/:adventureId?" element={wrap(<PlaySurfacePlaceholder />)} />
      <Route path="/login" element={wrap(<LoginPage />)} />
      <Route path="/register" element={wrap(<RegisterPage />)} />
      <Route path="/settings" element={wrap(<SettingsPage />, true)} />
      <Route path="/wallet" element={wrap(<WalletPage />, true)} />
      <Route path="/referrals" element={wrap(<ReferralsPage />, true)} />
      <Route path="/story-seed-preview" element={wrap(<StorySeedPreviewPlaceholder />)} />
      <Route path="/admin" element={<Navigate to="/admin-not-available-here" replace />} />
      <Route path="*" element={wrap(<NotFoundPage />)} />
    </Routes>
  );
}
