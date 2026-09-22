import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import WalletPage from './WalletPage';

describe('WalletPage', () => {
  it('renders the balance, the tier card, and the package list', () => {
    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /credits/i })).toBeInTheDocument();
    expect(screen.getByText(/wayfinder/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /credit packages/i })).toBeInTheDocument();
  });

  it('disables Buy on the ineligible Vault Pack', () => {
    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>,
    );

    const buttons = screen.getAllByRole('button', { name: /unavailable|buy/i });
    const unavailable = buttons.find((b) => b.textContent?.toLowerCase().includes('unavailable'));
    expect(unavailable).toBeDefined();
    expect(unavailable).toBeDisabled();
  });
});
