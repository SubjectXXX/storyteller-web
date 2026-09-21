import type { ReactElement } from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { PageShell } from '@/components/PageShell';
import { LoadingPanel } from '@/components/LoadingPanel';
import {
  HomePage,
  NotFoundPage,
  PlaySurfacePlaceholder,
  ReferralsPage,
  ScenarioLibraryPage,
  SettingsPage,
  StorySeedPreviewPlaceholder,
  WalletPage,
} from './lazyPages';

function wrap(element: ReactElement): ReactElement {
  return (
    <PageShell>
      <Suspense fallback={<LoadingPanel label="Loading" />}>{element}</Suspense>
    </PageShell>
  );
}

export function router(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={wrap(<HomePage />)} />
      <Route path="/scenarios" element={wrap(<ScenarioLibraryPage />)} />
      <Route path="/play/:adventureId?" element={wrap(<PlaySurfacePlaceholder />)} />
      <Route path="/settings" element={wrap(<SettingsPage />)} />
      <Route path="/wallet" element={wrap(<WalletPage />)} />
      <Route path="/referrals" element={wrap(<ReferralsPage />)} />
      <Route path="/story-seed-preview" element={wrap(<StorySeedPreviewPlaceholder />)} />
      <Route path="/admin" element={<Navigate to="/admin-not-available-here" replace />} />
      <Route path="*" element={wrap(<NotFoundPage />)} />
    </Routes>
  );
}
