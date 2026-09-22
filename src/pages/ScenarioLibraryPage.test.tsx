import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ScenarioLibraryPage from './ScenarioLibraryPage';

describe('ScenarioLibraryPage', () => {
  it('renders every fixture scenario from data.ts', () => {
    render(
      <MemoryRouter>
        <ScenarioLibraryPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 2, name: /a quiet court/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /cartographer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /beyond the reef/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /ember/i })).toBeInTheDocument();
  });

  it('renders a Start run link for every scenario', () => {
    render(
      <MemoryRouter>
        <ScenarioLibraryPage />
      </MemoryRouter>,
    );
    const starts = screen.getAllByRole('link', { name: /start run/i });
    expect(starts.length).toBeGreaterThanOrEqual(4);
    expect(starts[0]).toHaveAttribute('href', '/play/demo-romance');
  });

  it('renders the rating pills', () => {
    render(
      <MemoryRouter>
        <ScenarioLibraryPage />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/all ages/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/mature/i).length).toBeGreaterThanOrEqual(2);
  });
});
