import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SettingsPage from './SettingsPage';

describe('SettingsPage', () => {
  it('renders all three setting groups from the fixtures', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/infinite narrative/i)).toBeInTheDocument();
    expect(screen.getByText(/reading typography/i)).toBeInTheDocument();
    expect(screen.getByText(/physical needs/i)).toBeInTheDocument();
  });

  it('flags inherited rows with the Inherited pill', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/inherited/i).length).toBeGreaterThanOrEqual(3);
  });

  it('flags the hunger row as Locked with a reason', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/hunger/i)).toBeInTheDocument();
    expect(screen.getAllByText(/locked/i).length).toBeGreaterThanOrEqual(1);
  });
});
