import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  ApiError,
  DEFAULT_IMAGE_PROMPT,
  IMAGE_ASSET_FIXTURE,
  IMAGE_CAROUSEL_FIXTURE,
  IMAGE_JOB_COMPLETED_FIXTURE,
  IMAGE_JOB_QUEUED_FIXTURE,
  type Fetcher,
  type ImageJobResponse,
} from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { imageKeys, useImageCarousel, useImageJob } from './useImageGen';

function makeWrapper(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('useImageJob', () => {
  it('creates a job and resolves the asset once the poll returns completed', async () => {
    const fetchLog: Array<{ method: string; path: string }> = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      fetchLog.push({ method: options.method ?? 'GET', path });
      const method = options.method ?? 'GET';
      if (method === 'POST' && path.startsWith('/adventures/')) {
        return IMAGE_JOB_QUEUED_FIXTURE;
      }
      if (method === 'GET' && path.startsWith('/image-jobs/')) {
        const completed: ImageJobResponse = {
          ...IMAGE_JOB_COMPLETED_FIXTURE,
          job_id: IMAGE_JOB_QUEUED_FIXTURE.job_id,
          asset: IMAGE_ASSET_FIXTURE,
        };
        return completed;
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { result } = renderHook(
      () => useImageJob(7, 1, 99, DEFAULT_IMAGE_PROMPT),
      { wrapper: makeWrapper(fetcher) },
    );
    // The hook no longer auto-fires on mount; the player must press
    // Regenerate. Press it once and confirm the create call lands.
    act(() => {
      result.current.regenerate();
    });
    await waitFor(() => expect(result.current.status).toBe('completed'));
    expect(result.current.asset?.url).toBe(IMAGE_ASSET_FIXTURE.url);
    expect(result.current.error).toBeNull();
    expect(fetchLog.some((entry) => entry.method === 'POST')).toBe(true);
    expect(fetchLog.some((entry) => entry.method === 'GET' && entry.path.startsWith('/image-jobs/'))).toBe(true);
  });

  it('surfaces a failed job and stops polling', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'POST' && path.startsWith('/adventures/')) {
        return IMAGE_JOB_QUEUED_FIXTURE;
      }
      if (method === 'GET' && path.startsWith('/image-jobs/')) {
        const failed: ImageJobResponse = {
          ...IMAGE_JOB_QUEUED_FIXTURE,
          job_id: IMAGE_JOB_QUEUED_FIXTURE.job_id,
          status: 'failed',
          asset: null,
          error: { message: 'Model refused the prompt', code: 'policy_violation' },
        };
        return failed;
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { result } = renderHook(() => useImageJob(7, 1, 99, DEFAULT_IMAGE_PROMPT), {
      wrapper: makeWrapper(fetcher),
    });
    act(() => {
      result.current.regenerate();
    });
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.asset).toBeNull();
    expect(result.current.error?.code).toBe('policy_violation');
  });

  it('does not create a job when branchId is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called');
    };
    const { result } = renderHook(
      () => useImageJob(undefined, 1, 99, DEFAULT_IMAGE_PROMPT),
      { wrapper: makeWrapper(fetcher) },
    );
    expect(result.current.jobId).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.isLoading).toBe(false);
  });

  // R24 DI-1 follow-on: a fresh adventure load must not fire the
  // image-job create POST before the player clicks Regenerate. This
  // avoids a 404 noise on the Network tab when the active turn id
  // falls back to TURN_FIXTURE.id (which is not a real turn).
  it('does not fire create until the player presses Regenerate', () => {
    let createCount = 0;
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'POST' && path.startsWith('/adventures/')) {
        createCount += 1;
      }
      return undefined;
    };
    const { result } = renderHook(
      () => useImageJob(7, 1, 99, DEFAULT_IMAGE_PROMPT),
      { wrapper: makeWrapper(fetcher) },
    );
    expect(createCount).toBe(0);
    expect(result.current.jobId).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('regenerate issues a fresh create call with the new prompt', async () => {
    let createCount = 0;
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'POST' && path.startsWith('/adventures/')) {
        createCount += 1;
        return { ...IMAGE_JOB_QUEUED_FIXTURE, job_id: `job-${createCount}` };
      }
      if (method === 'GET' && path.startsWith('/image-jobs/')) {
        return { ...IMAGE_JOB_COMPLETED_FIXTURE, job_id: `job-${createCount}`, asset: IMAGE_ASSET_FIXTURE };
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { result } = renderHook(
      () => useImageJob(7, 1, 99, DEFAULT_IMAGE_PROMPT),
      { wrapper: makeWrapper(fetcher) },
    );
    act(() => {
      result.current.regenerate('A snowy forest at dawn');
    });
    await waitFor(() => expect(createCount).toBeGreaterThan(0));
    const initialCreateCount = createCount;
    act(() => {
      result.current.regenerate('A moonlit alley');
    });
    await waitFor(() => expect(createCount).toBeGreaterThan(initialCreateCount));
    expect(createCount).toBeGreaterThan(initialCreateCount);
  });
});

describe('useImageCarousel', () => {
  it('returns the carousel asset list', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/7/images`) {
        return { adventure_id: 7, assets: IMAGE_CAROUSEL_FIXTURE };
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { result } = renderHook(() => useImageCarousel(7), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.assets).toHaveLength(IMAGE_CAROUSEL_FIXTURE.length);
  });

  it('does not run when the adventure id is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called');
    };
    const { result } = renderHook(() => useImageCarousel(undefined), {
      wrapper: makeWrapper(fetcher),
    });
    expect(result.current.isFetching).toBe(false);
  });
});

describe('imageKeys', () => {
  it('exposes stable query keys for callers that want to invalidate manually', () => {
    expect(imageKeys.all).toEqual(['image']);
    expect(imageKeys.job('job-1')).toEqual(['image', 'job', 'job-1']);
    expect(imageKeys.job(undefined)).toEqual(['image', 'job', '__missing__']);
    expect(imageKeys.carousel(42)).toEqual(['image', 'carousel', 42]);
  });
});