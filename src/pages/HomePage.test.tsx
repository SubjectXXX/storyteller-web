import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import HomePage from './HomePage';

describe('HomePage', () => {
  it('renders the welcome header and the featured scenario card', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /welcome/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /a quiet court/i })).toBeInTheDocument();
  });

  it('links to the scenario library', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /browse scenarios/i })).toHaveAttribute('href', '/scenarios');
  });
});
