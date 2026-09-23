import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestLog, type Quest } from './QuestLog';

const QUESTS: ReadonlyArray<Quest> = [
  {
    id: 'find-letter',
    title: 'Find the cartographer\u2019s last letter',
    description: 'It was mailed from the harbour and never arrived.',
    status: 'active',
    reward: '50 credits + map fragment',
  },
  {
    id: 'pay-imogen',
    title: 'Pay back Imogen for the courier fee',
    description: null,
    status: 'completed',
    reward: null,
  },
];

describe('QuestLog', () => {
  it('renders a quest list when quests are provided', () => {
    render(<QuestLog quests={QUESTS} />);
    expect(screen.getByRole('list', { name: /quest/i })).toBeInTheDocument();
    expect(screen.getByTestId('quest-find-letter')).toHaveTextContent(
      /cartographer/i,
    );
    expect(screen.getByText(/50 credits/i)).toBeInTheDocument();
  });

  it('renders an empty state when the quest list is empty', () => {
    render(<QuestLog quests={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent(/no quests/i);
  });

  it('renders an empty state when no quests are passed', () => {
    render(<QuestLog quests={undefined} />);
    expect(screen.getByRole('status')).toHaveTextContent(/no quests|coming/i);
  });
});
