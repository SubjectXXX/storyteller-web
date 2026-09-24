import { lazy } from 'react';

export const HomePage = lazy(() => import('@/pages/HomePage'));
export const ScenarioLibraryPage = lazy(() => import('@/pages/ScenarioLibraryPage'));
export const ScenarioDetailPage = lazy(() => import('@/pages/ScenarioDetailPage'));
export const AdventurePage = lazy(() => import('@/pages/AdventurePage'));
export const PlaySurfacePlaceholder = lazy(() => import('@/pages/PlaySurfacePlaceholder'));
export const LoginPage = lazy(() => import('@/pages/LoginPage'));
export const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
export const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
export const UserSettingsPage = lazy(() => import('@/features/settings/UserSettingsPage'));
export const WalletPage = lazy(() => import('@/pages/WalletPage'));
export const ReferralsPage = lazy(() => import('@/pages/ReferralsPage'));
export const StorySeedPreviewPlaceholder = lazy(() => import('@/pages/StorySeedPreviewPlaceholder'));
export const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
