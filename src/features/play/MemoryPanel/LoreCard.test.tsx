import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LORE_FIXTURE, type LoreEntry } from '@/api-client';
import { LoreCard } from './LoreCard';

describe('LoreCard', () => {
  it('renders the entry title, body, key badge, and version pill', () => {
    const entry: LoreEntry = LORE_FIXTURE.entries[0]!;
    render(<LoreCard entry={entry} />);
    expect(screen.getByText(entry.title)).toBeInTheDocument();
    expect(screen.getByText(entry.body)).toBeInTheDocument();
    expect(screen.getByText(entry.key)).toBeInTheDocument();
    expect(screen.getByText(`v${entry.version}`)).toBeInTheDocument();
    expect(screen.getByTestId(`lore-card-${entry.key}`)).toBeInTheDocument();
  });

  it('exposes a Copy key affordance with an accessible label', () => {
    const entry: LoreEntry = LORE_FIXTURE.entries[0]!;
    render(<LoreCard entry={entry} />);
    expect(
      screen.getByRole('button', { name: `Copy key ${entry.key}` }),
    ).toBeInTheDocument();
  });

  it('renders a tag pill for every tag on the entry', () => {
    const entry: LoreEntry = LORE_FIXTURE.entries[1]!;
    render(<LoreCard entry={entry} />);
    for (const tag of entry.tags) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
  });

  it('hides the Copy key button when the compact variant is requested', () => {
    const entry: LoreEntry = LORE_FIXTURE.entries[0]!;
    render(<LoreCard entry={entry} compact />);
    expect(
      screen.queryByRole('button', { name: `Copy key ${entry.key}` }),
    ).not.toBeInTheDocument();
  });
});