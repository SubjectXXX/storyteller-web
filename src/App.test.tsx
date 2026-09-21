import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorShell, LoadingShell, NotFoundShell } from './shells';

describe('web application shells', () => {
  it('announces loading state', () => {
    render(<LoadingShell />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Loading your story…');
  });

  it('announces an error and offers retry', async () => {
    const retry = vi.fn();
    render(<ErrorShell onRetry={retry} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('offers a route home when a page is missing', () => {
    render(<NotFoundShell />);
    expect(screen.getByRole('heading', { name: /not part of the story/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to the player home/i })).toHaveAttribute('href', '/');
  });
});
