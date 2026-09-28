import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  ApiError,
  fixtureFetcher,
  withFixtureFallback,
  type Fetcher,
  type ImageJobResponse,
} from '@/api-client';
// Imported from the fixture module, not the `@/api-client` barrel: the
// barrel does not re-export every Stage 6 constant, and a missing export
// silently resolves to `undefined` at runtime rather than failing tsc.
import {
  DEFAULT_IMAGE_PROMPT,
  IMAGE_ASSET_FIXTURE,
  IMAGE_CAROUSEL_FIXTURE,
  IMAGE_JOB_COMPLETED_FIXTURE,
  IMAGE_JOB_PENDING_FIXTURE,
} from '@/fixtures/data';
import { AuthProvider } from '@/auth/AuthContext';
import { imageKeys, useImageCarousel, useImageJob } from './useImageGen';

function makeWrapper(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      {/* `AuthProvider` calls `useNavigate`, so the router has to wrap it. */}
      <MemoryRouter>
        <AuthProvider>
          <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Fails the way a dead network does: `fetch` rejects with a TypeError. */
const offlineLive: Fetcher = async () => {
  throw new TypeError('Failed to fetch');
};

/**
 * The image fixture contract as the *real* endpoints expose it (see
 * `routes/api.php`): create on the turn path, poll a numeric job id,
 * carousel on the adventure. Mirrors what `fixtureFetcher` must answer
 * so the degrade path can be exercised without a backend.
 */
function imageFixtureTransport(): Fetcher {
  return async (path, options = {}) => {
    const method = options.method ?? 'GET';
    if (method === 'POST' && /^\/adventures\/\d+\/turns\/\d+\/image$/.test(path)) {
      return IMAGE_JOB_PENDING_FIXTURE;
    }
    if (method === 'GET' && /^\/image-jobs\/\d+$/.test(path)) {
      const requested = Number(path.split('/').pop());
      return { ...IMAGE_JOB_COMPLETED_FIXTURE, job_id: Number.isInteger(requested) ? requested : IMAGE_JOB_COMPLETED_FIXTURE.job_id };
    }
    if (method === 'GET' && /^\/adventures\/\d+\/images$/.test(path)) {
      return { adventure_id: 7, assets: IMAGE_CAROUSEL_FIXTURE };
    }
    throw new ApiError(404, { message: `no fixture for ${method} ${path}`, code: 'not_found' });
  };
}

/** The degrade path logs a dev warning; keep the suite output quiet. */
function muteDegradeWarning(): void {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
}

describe('useImageJob', () => {
  it('creates a job and resolves the asset once the poll returns completed', async () => {
    const fetchLog: Array<{ method: string; path: string }> = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      fetchLog.push({ method: options.method ?? 'GET', path });
      const method = options.method ?? 'GET';
      if (method === 'POST' && path.startsWith('/adventures/')) {
        return IMAGE_JOB_PENDING_FIXTURE;
      }
      if (method === 'GET' && path.startsWith('/image-jobs/')) {
        return { ...IMAGE_JOB_COMPLETED_FIXTURE, job_id: IMAGE_JOB_PENDING_FIXTURE.job_id };
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
    await waitFor(() => expect(result.current.status).toBe('completed'), { timeout: 4000 });
    expect(result.current.asset?.url).toBe(IMAGE_ASSET_FIXTURE.url);
    expect(result.current.error).toBeNull();
    expect(fetchLog.some((entry) => entry.method === 'POST')).toBe(true);
    expect(fetchLog.some((entry) => entry.method === 'GET' && entry.path.startsWith('/image-jobs/'))).toBe(true);
  });

  // The live create call must hit the route the server actually
  // registers (`adventures.turns.image.store`) with only the fields
  // `SubmitImageJobRequest` accepts. The turn is addressed by the path,
  // so a `turn_id` in the body is dead weight the server drops.
  it('POSTs the turn image path with a prompt-only body', async () => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push({ method, path, body: options.body });
      if (method === 'POST') return IMAGE_JOB_PENDING_FIXTURE;
      return { ...IMAGE_JOB_COMPLETED_FIXTURE, job_id: IMAGE_JOB_PENDING_FIXTURE.job_id };
    };
    const { result } = renderHook(
      () => useImageJob(7, 1, 99, DEFAULT_IMAGE_PROMPT),
      { wrapper: makeWrapper(fetcher) },
    );
    act(() => {
      result.current.regenerate();
    });
    await waitFor(() => expect(result.current.status).toBe('completed'), { timeout: 4000 });

    const create = calls.find((call) => call.method === 'POST');
    expect(create?.path).toBe('/adventures/7/turns/99/image');
    expect(create?.body).toEqual({ prompt: DEFAULT_IMAGE_PROMPT });

    // The poll has to be a numeric id: the route is `->whereNumber`.
    const poll = calls.find((call) => call.method === 'GET');
    expect(poll?.path).toBe(`/image-jobs/${IMAGE_JOB_PENDING_FIXTURE.job_id}`);
    expect(poll?.path).toMatch(/^\/image-jobs\/\d+$/);
    expect(result.current.jobId).toBe(String(IMAGE_JOB_PENDING_FIXTURE.job_id));
  });

  it('surfaces a failed job and stops polling', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'POST' && path.startsWith('/adventures/')) {
        return IMAGE_JOB_PENDING_FIXTURE;
      }
      if (method === 'GET' && path.startsWith('/image-jobs/')) {
        // The API reports the failure reason as a plain string.
        const failed: ImageJobResponse = {
          ...IMAGE_JOB_PENDING_FIXTURE,
          job_id: IMAGE_JOB_PENDING_FIXTURE.job_id,
          status: 'failed',
          asset_url: null,
          error: 'Model refused the prompt',
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
    await waitFor(() => expect(result.current.status).toBe('failed'), { timeout: 4000 });
    expect(result.current.asset).toBeNull();
    expect(result.current.error?.message).toBe('Model refused the prompt');
    expect(result.current.error?.code).toBe('image_job_failed');
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
        return { ...IMAGE_JOB_PENDING_FIXTURE, job_id: 9200 + createCount };
      }
      if (method === 'GET' && path.startsWith('/image-jobs/')) {
        return { ...IMAGE_JOB_COMPLETED_FIXTURE, job_id: 9200 + createCount };
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

  // ---- Offline degrade ------------------------------------------------
  //
  // The degrade path is the one that is supposed to be guaranteed to
  // work, so it is asserted end to end: a dead network must still land
  // the player on the completed-image state.

  it('degrades a transport failure to the fixture image state', async () => {
    muteDegradeWarning();
    const fetcher = withFixtureFallback(offlineLive, imageFixtureTransport());
    const { result } = renderHook(
      () => useImageJob(7, 1, 99, DEFAULT_IMAGE_PROMPT),
      { wrapper: makeWrapper(fetcher) },
    );
    act(() => {
      result.current.regenerate();
    });
    await waitFor(() => expect(result.current.status).toBe('completed'), { timeout: 4000 });
    expect(result.current.error).toBeNull();
    expect(result.current.asset).not.toBeNull();
    expect(result.current.asset?.url).toBe(IMAGE_ASSET_FIXTURE.url);
    expect(result.current.isLoading).toBe(false);
  });

  // BLOCKED OUTSIDE THIS FILE: `fixtureFetcher` still keys the create
  // call on `/adventures/{id}/branches/{id}/image`, so the shipped
  // degrade path throws `no handler for POST /adventures/7/turns/99/image`
  // instead of returning the fixture. The regex lives in
  // `src/api-client/openapi.ts` (~line 1449) and must become
  // /^\/adventures\/\d+\/turns\/\d+\/image$/.
  it('shipped fixtureFetcher answers the real create path (degrade end to end)', async () => {
    muteDegradeWarning();
    const fetcher = withFixtureFallback(offlineLive, fixtureFetcher());
    const { result } = renderHook(
      () => useImageJob(7, 1, 99, DEFAULT_IMAGE_PROMPT),
      { wrapper: makeWrapper(fetcher) },
    );
    act(() => {
      result.current.regenerate();
    });
    await waitFor(() => expect(result.current.status).toBe('completed'), { timeout: 4000 });
    expect(result.current.error).toBeNull();
    expect(result.current.asset?.url).toBe(IMAGE_ASSET_FIXTURE.url);
  });

  // ---- Real server errors are never faked ---------------------------

  it.each([
    [401, 'Unauthenticated.'],
    [404, 'Turn not found for this adventure.'],
    [422, 'The prompt field is required.'],
    [500, 'Server Error'],
  ])('reports a %i as an honest error, never a fixture image', async (status, message) => {
    muteDegradeWarning();
    // Wrapped exactly like the app's default fetcher: a fixture is only
    // allowed to answer when the transport is dead.
    const failing: Fetcher = async () => {
      throw new ApiError(status, { message, code: 'upstream' });
    };
    const fetcher = withFixtureFallback(failing, imageFixtureTransport());
    const { result } = renderHook(
      () => useImageJob(7, 1, 99, DEFAULT_IMAGE_PROMPT),
      { wrapper: makeWrapper(fetcher) },
    );
    act(() => {
      result.current.regenerate();
    });
    await waitFor(() => expect(result.current.status).toBe('failed'), { timeout: 4000 });
    expect(result.current.error?.message).toBe(message);
    expect(result.current.asset).toBeNull();
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
