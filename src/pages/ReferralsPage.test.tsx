import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ReferralsPage from './ReferralsPage';

describe('ReferralsPage', () => {
  it('renders the invite code and the shareable link', () => {
    render(
      <MemoryRouter>
        <ReferralsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /bring another/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Invite code')).toHaveValue('WANDER-7821');
    expect(screen.getByLabelText('Shareable link')).toHaveValue('https://storyteller.test/r/WANDER-7821');
  });

  it('exposes the active status pill', () => {
    render(
      <MemoryRouter>
        <ReferralsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText(/cartographer tier/i)).toBeInTheDocument();
  });
});
