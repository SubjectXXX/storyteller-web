import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  SAMPLE_IMAGE_ALT,
  type Fetcher,
  type ImageJobResponse,
} from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { ImagePanel } from './ImagePanel';

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

describe('ImagePanel', () => {
  it('renders the latest carousel asset before any job resolves', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/adventures/7/images') {
        return { adventure_id: 7, assets: IMAGE_CAROUSEL_FIXTURE };
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    render(<ImagePanel adventureId={7} branchId={1} turnId={2} />, {
      wrapper: makeWrapper(fetcher),
    });
    const img = await screen.findByTestId('image-current');
    expect(img).toHaveAttribute('alt', SAMPLE_IMAGE_ALT);
  });

  it('renders the regenerate control with a clear accessible name', () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    render(<ImagePanel adventureId={7} branchId={1} turnId={2} />, {
      wrapper: makeWrapper(fetcher),
    });
    expect(
      screen.getByRole('button', { name: /regenerate image for the current turn/i }),
    ).toBeInTheDocument();
  });

  it('shows an error panel with a retry button when the job fails', async () => {
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
          error: { message: 'Model overloaded', code: 'overloaded' },
        };
        return failed;
      }
      if (path === '/adventures/7/images') {
        return { adventure_id: 7, assets: [] };
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    render(<ImagePanel adventureId={7} branchId={1} turnId={2} />, {
      wrapper: makeWrapper(fetcher),
    });
    expect(await screen.findByTestId('image-error')).toHaveTextContent(/Model overloaded/);
    expect(screen.getByTestId('image-retry')).toBeInTheDocument();
  });

  it('disables the regenerate button when the panel has no branch/turn id', () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    render(<ImagePanel adventureId={7} branchId={undefined} turnId={undefined} />, {
      wrapper: makeWrapper(fetcher),
    });
    expect(screen.getByTestId('image-regenerate')).toBeDisabled();
  });

  it('uses the supplied initial prompt verbatim', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/adventures/7/images') {
        return { adventure_id: 7, assets: [IMAGE_ASSET_FIXTURE] };
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    render(
      <ImagePanel
        adventureId={7}
        branchId={1}
        turnId={2}
        initialPrompt="A snowy forest at dawn"
      />,
      { wrapper: makeWrapper(fetcher) },
    );
    const prompt = await screen.findByTestId('image-prompt');
    expect(prompt).toHaveTextContent(/A snowy forest at dawn/);
    // sanity: not the default
    expect(prompt).not.toHaveTextContent(DEFAULT_IMAGE_PROMPT);
  });

  it('lets the user click regenerate to re-trigger the hook', async () => {
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
      if (path === '/adventures/7/images') {
        return { adventure_id: 7, assets: IMAGE_CAROUSEL_FIXTURE };
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const user = userEvent.setup();
    render(<ImagePanel adventureId={7} branchId={1} turnId={2} />, {
      wrapper: makeWrapper(fetcher),
    });
    // Wait for the initial create to settle.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const initial = createCount;
    await user.click(screen.getByTestId('image-regenerate'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createCount).toBeGreaterThan(initial);
  });
});