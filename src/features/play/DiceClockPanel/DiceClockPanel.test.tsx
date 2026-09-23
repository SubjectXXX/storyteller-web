import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CLOCK_TICK_FIXTURE } from '@/api-client';
import { DiceClockPanel } from './DiceClockPanel';

describe('DiceClockPanel', () => {
  it('renders the clock tick label and progress', () => {
    render(<DiceClockPanel event={CLOCK_TICK_FIXTURE} />);
    expect(screen.getByRole('group', { name: /suspicion/i })).toBeInTheDocument();
    expect(screen.getByText(`2 / ${CLOCK_TICK_FIXTURE.max}`)).toBeInTheDocument();
  });

  it('renders a dice roll when the event kind is dice', () => {
    const diceEvent = {
      kind: 'dice' as const,
      formula: '1d20+3',
      total: 18,
      rolls: [15],
      modifier: 3,
      success: 'pass' as const,
      reason: 'Stealth check vs. locked door',
      actor_id: 'player',
    };
    render(<DiceClockPanel event={diceEvent} />);
    expect(screen.getByText(/1d20\+3/)).toBeInTheDocument();
    expect(screen.getByText(/18/)).toBeInTheDocument();
    expect(screen.getByText(/pass/i)).toBeInTheDocument();
  });

  it('renders an idle message when no mechanic event has happened', () => {
    render(<DiceClockPanel event={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(/no mechanic|idle|quiet/i);
  });
});
