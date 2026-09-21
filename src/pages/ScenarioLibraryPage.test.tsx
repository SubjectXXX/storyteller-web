import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ScenarioLibraryPage from './ScenarioLibraryPage';

describe('ScenarioLibraryPage', () => {
  it('renders the three fixture scenarios and filters by title', () => {
    render(
      <MemoryRouter>
        <ScenarioLibraryPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('A Quiet Court')).toBeTruthy();
    expect(screen.getByText('The Cartographer\u2019s Last Letter')).toBeTruthy();
    expect(screen.getByText('Beyond the Reef')).toBeTruthy();

    const search = screen.getByPlaceholderText('Filter scenarios');
    fireEvent.change(search, { target: { value: 'reef' } });

    expect(screen.queryByText('A Quiet Court')).toBeNull();
    expect(screen.getByText('Beyond the Reef')).toBeTruthy();
  });
});
