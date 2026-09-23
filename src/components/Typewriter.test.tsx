import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { Typewriter } from './Typewriter';
import { ApiClientProvider } from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { SETTINGS_RESOURCE_FIXTURE } from '@/fixtures/data';

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

describe('Typewriter', () => {
  it('renders text characters progressively and finishes with the full text', () => {
    vi.useFakeTimers();
    const fetcher: Fetcher = async () => SETTINGS_RESOURCE_FIXTURE;
    const wrapper = makeWrapper(fetcher);
    const { container } = render(<Typewriter text="Hello, world!" intervalMs={10} charsPerTick={3} />, {
      wrapper,
    });

    const element = container.querySelector('[data-testid="typewriter"]') as HTMLElement;
    expect(element).toBeTruthy();
    // 13 chars / 3 chars per tick -> 5 ticks (0, 3, 6, 9, 12, 15 capped).
    for (let i = 0; i < 4; i++) {
      act(() => {
        vi.advanceTimersByTime(10);
      });
    }
    expect(element.textContent).toContain('Hello, world!');
    expect(element.getAttribute('data-complete')).toBe('true');
    vi.useRealTimers();
  });

  it('renders the full text immediately when reduced_motion is enabled', async () => {
    const fetcher: Fetcher = async () => ({ ...SETTINGS_RESOURCE_FIXTURE, reduced_motion: true });
    const wrapper = makeWrapper(fetcher);
    const { container, findByTestId } = render(<Typewriter text="Skip animation" intervalMs={50} />, {
      wrapper,
    });
    const element = await findByTestId('typewriter');
    expect(element.textContent).toContain('Skip animation');
    expect(element.getAttribute('data-complete')).toBe('true');
    expect(container).toBeTruthy();
  });

  it('resets the reveal when the text prop changes', () => {
    vi.useFakeTimers();
    const fetcher: Fetcher = async () => SETTINGS_RESOURCE_FIXTURE;
    const wrapper = makeWrapper(fetcher);
    const { rerender, container } = render(<Typewriter text="First turn." intervalMs={10} />, {
      wrapper,
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    let element = container.querySelector('[data-testid="typewriter"]') as HTMLElement;
    expect(element.textContent).toContain('First turn.');

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <ApiClientProvider fetcher={fetcher}>
            <Typewriter text="Second turn." intervalMs={10} />
          </ApiClientProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
    // Reset to empty before the new animation starts.
    element = container.querySelector('[data-testid="typewriter"]') as HTMLElement;
    expect(element.textContent).toBe('Second turn.');
    vi.useRealTimers();
  });
});
