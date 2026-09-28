import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  ApiError,
  type AdventureMediaResponseShape,
  type Fetcher,
  type MediaItem,
  type RequestOptions,
} from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { AUTH_FIXTURE } from '@/fixtures/data';
import { PlayerMediaPanel } from './PlayerMediaPanel';

/** A captured call so assertions can inspect path / method / body. */
interface Call {
  readonly path: string;
  readonly method: string;
  readonly body: unknown;
}

function item(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 11,
    filename: 'portrait.png',
    mime_type: 'image/png',
    size_bytes: 2048,
    kind: 'image',
    // Deliberately an opaque third-party-looking URL: the panel must render
    // whatever the API returns and never rebuild a storage path.
    url: 'https://cdn.example.test/signed/abc123?sig=zzz',
    width: 640,
    height: 480,
    created_at: '2026-09-27T20:00:00Z',
    ...overrides,
  };
}

function folder(adventureId: number, items: ReadonlyArray<MediaItem>): AdventureMediaResponseShape {
  return {
    adventure_id: adventureId,
    folder: { id: 3, name: 'Your media', path: 'adventures/7/media', scope: 'adventure' },
    items,
  };
}

function makeWrapper(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Same guard the app's `session.ts` uses: some hosts expose no
  // `localStorage` at all, and the panel does not read the token itself.
  try {
    window.localStorage?.setItem('storyteller.session.token', AUTH_FIXTURE.token);
  } catch {
    // no storage — the AuthProvider runs signed-out and the panel is agnostic.
  }
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function mediaFetcher(overrides: {
  items?: ReadonlyArray<MediaItem>;
  onUpload?: (file: File) => unknown;
  onDelete?: (mediaId: number) => unknown;
  onList?: (callIndex: number) => unknown;
}): { fetcher: Fetcher; calls: Call[] } {
  const calls: Call[] = [];
  let listCalls = 0;
  const fetcher: Fetcher = async (path, options: RequestOptions = {}) => {
    const method = options.method ?? 'GET';
    calls.push({ path, method, body: options.body });
    if (method === 'GET' && path === '/adventures/7/media') {
      listCalls += 1;
      if (overrides.onList) return overrides.onList(listCalls);
      return folder(7, overrides.items ?? []);
    }
    if (method === 'POST' && path === '/adventures/7/media') {
      if (overrides.onUpload) {
        const file = (options.body as FormData).get('file') as File;
        return overrides.onUpload(file);
      }
      return item();
    }
    if (method === 'DELETE' && path === '/adventures/7/media/11') {
      if (overrides.onDelete) return overrides.onDelete(11);
      return { deleted: true, id: 11 };
    }
    throw new ApiError(404, { message: `no handler for ${method} ${path}`, code: 'not_found' });
  };
  return { fetcher, calls };
}

describe('PlayerMediaPanel — empty state', () => {
  it('explains the private folder when the API returns an empty item list', async () => {
    const { fetcher } = mediaFetcher({ items: [] });
    render(<PlayerMediaPanel adventureId={7} branchId={1} />, { wrapper: makeWrapper(fetcher) });

    const empty = await screen.findByText(/Nothing in your folder yet/i);
    expect(empty).not.toBeNull();
    // The grid only appears once there is something to list.
    expect(screen.queryByTestId('media-grid')).toBeNull();
    // The upload affordance is present even when the folder is empty.
    expect(screen.getByLabelText(/Add an image to your folder/i)).toBeTruthy();
  });

  it('surfaces a load failure as an alert instead of an empty folder', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(404, {
        message: 'This adventure is not yours.',
        code: 'not_found',
      });
    };
    render(<PlayerMediaPanel adventureId={7} branchId={1} />, { wrapper: makeWrapper(fetcher) });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('This adventure is not yours.');
    expect(screen.queryByText(/Nothing in your folder yet/i)).toBeNull();
  });
});

describe('PlayerMediaPanel — listing', () => {
  it('renders the items the API returned, with the opaque url untouched', async () => {
    const { fetcher } = mediaFetcher({
      items: [
        item(),
        item({
          id: 12,
          filename: 'map.png',
          url: 'https://cdn.example.test/signed/def456?sig=yyy',
          size_bytes: 512 * 1024,
          width: null,
          height: null,
        }),
      ],
    });
    render(<PlayerMediaPanel adventureId={7} branchId={1} />, { wrapper: makeWrapper(fetcher) });

    const grid = await screen.findByRole('list', { name: /images you uploaded/i });
    expect(grid).not.toBeNull();
    const thumb = screen.getByTestId('media-thumb-11') as HTMLImageElement;
    expect(thumb.getAttribute('src')).toBe('https://cdn.example.test/signed/abc123?sig=zzz');
    // Filename is the only alt text the wire contract provides.
    expect(thumb.getAttribute('alt')).toBe('portrait.png');
    const first = screen.getByTestId('media-item-11');
    expect(first.textContent).toContain('portrait.png');
    expect(first.textContent).toContain('2 KB');
    expect(first.textContent).toContain('640×480');
    const second = screen.getByTestId('media-item-12');
    expect(second.textContent).toContain('map.png');
    expect(second.textContent).toContain('512 KB');
    // Delete is a real, named control per item.
    expect(screen.getByRole('button', { name: 'Delete portrait.png' })).not.toBeNull();
  });
});

describe('PlayerMediaPanel — upload', () => {
  it('posts a multipart FormData to the adventure media path', async () => {
    const { fetcher, calls } = mediaFetcher({ items: [] });
    render(<PlayerMediaPanel adventureId={7} branchId={1} />, { wrapper: makeWrapper(fetcher) });

    const input = await screen.findByLabelText(/Add an image to your folder/i);
    const file = new File(['binary-bytes'], 'portrait.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const post = calls.find((call) => call.method === 'POST');
      expect(post).toBeTruthy();
      expect(post?.path).toBe('/adventures/7/media');
      expect(post?.body).toBeInstanceOf(FormData);
      const form = post?.body as FormData;
      expect((form.get('file') as File).name).toBe('portrait.png');
      expect(form.get('kind')).toBe('image');
    });

    const success = await screen.findByTestId('media-upload-success');
    expect(success.textContent).toContain('portrait.png');
  });

  it('shows the API message verbatim when the upload is rejected', async () => {
    const { fetcher } = mediaFetcher({
      items: [],
      onUpload: () => {
        throw new ApiError(413, {
          message: 'That image is 14.2 MB; the limit is 10 MB.',
          code: 'file_too_large',
        });
      },
    });
    render(<PlayerMediaPanel adventureId={7} branchId={1} />, { wrapper: makeWrapper(fetcher) });

    const input = await screen.findByLabelText(/Add an image to your folder/i);
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'huge.png', { type: 'image/png' })] },
    });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('That image is 14.2 MB; the limit is 10 MB.');
  });
});

describe('PlayerMediaPanel — delete', () => {
  it('deletes the item and refetches the folder', async () => {
    const deleted: number[] = [];
    let listed = false;
    const { fetcher, calls } = mediaFetcher({
      items: [item()],
      onDelete: (mediaId) => {
        deleted.push(mediaId);
        return { deleted: true, id: mediaId };
      },
      onList: () => {
        // Second read reflects the removal, mirroring the real API.
        const items = listed ? [] : [item()];
        listed = true;
        return folder(7, items);
      },
    });
    render(<PlayerMediaPanel adventureId={7} branchId={1} />, { wrapper: makeWrapper(fetcher) });

    const button = await screen.findByRole('button', { name: 'Delete portrait.png' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(deleted).toEqual([11]);
    });
    const removeCall = calls.find((call) => call.method === 'DELETE');
    expect(removeCall?.path).toBe('/adventures/7/media/11');
    // Invalidation re-reads the authoritative list.
    const listCalls = calls.filter(
      (call) => call.method === 'GET' && call.path === '/adventures/7/media',
    );
    expect(listCalls.length).toBeGreaterThan(1);
    await waitFor(() => {
      expect(screen.getByText(/Nothing in your folder yet/i)).not.toBeNull();
    });
  });
});
