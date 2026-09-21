import { lazy } from 'react';

export const HomePage = lazy(() => import('@/pages/HomePage'));
export const ScenarioLibraryPage = lazy(() => import('@/pages/ScenarioLibraryPage'));
export const PlaySurfacePlaceholder = lazy(() => import('@/pages/PlaySurfacePlaceholder'));
export const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
export const WalletPage = lazy(() => import('@/pages/WalletPage'));
export const ReferralsPage = lazy(() => import('@/pages/ReferralsPage'));
export const StorySeedPreviewPlaceholder = lazy(() => import('@/pages/StorySeedPreviewPlaceholder'));
export const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
