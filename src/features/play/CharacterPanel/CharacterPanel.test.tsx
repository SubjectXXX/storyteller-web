import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CHARACTER_FIXTURE } from '@/api-client';
import { CharacterPanel } from './CharacterPanel';

describe('CharacterPanel', () => {
  it('renders the character name, role, stats, and traits', () => {
    render(<CharacterPanel character={CHARACTER_FIXTURE} isLoading={false} error={null} />);
    expect(screen.getByRole('heading', { name: CHARACTER_FIXTURE.name })).toBeInTheDocument();
    expect(screen.getByText(CHARACTER_FIXTURE.role)).toBeInTheDocument();
    for (const stat of CHARACTER_FIXTURE.stats) {
      expect(screen.getByText(stat.label)).toBeInTheDocument();
    }
    for (const trait of CHARACTER_FIXTURE.traits) {
      expect(screen.getByText(trait.label)).toBeInTheDocument();
    }
  });

  it('renders a loading state when the query is pending', () => {
    render(<CharacterPanel character={undefined} isLoading error={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('renders an error state with an alert role', () => {
    render(
      <CharacterPanel
        character={undefined}
        isLoading={false}
        error={{ message: 'Could not fetch character' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/could not fetch character/i);
  });

  it('renders an empty state when no character is provided', () => {
    render(<CharacterPanel character={undefined} isLoading={false} error={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(/no character|coming/i);
  });
});
