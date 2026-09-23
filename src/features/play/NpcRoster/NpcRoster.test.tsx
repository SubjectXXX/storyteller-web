import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NPC_ROSTER_FIXTURE } from '@/api-client';
import { NpcRoster } from './NpcRoster';

describe('NpcRoster', () => {
  it('renders one card per NPC and shows disposition', () => {
    render(<NpcRoster npcs={NPC_ROSTER_FIXTURE} isLoading={false} error={null} />);
    for (const npc of NPC_ROSTER_FIXTURE) {
      expect(screen.getByText(npc.name)).toBeInTheDocument();
      expect(screen.getByText(npc.role)).toBeInTheDocument();
    }
  });

  it('renders a loading state', () => {
    render(<NpcRoster npcs={undefined} isLoading error={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('renders an error state', () => {
    render(
      <NpcRoster
        npcs={undefined}
        isLoading={false}
        error={{ message: 'NPC backend offline' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/offline/i);
  });

  it('renders an empty state when the roster is empty', () => {
    render(<NpcRoster npcs={[]} isLoading={false} error={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(/no npc|alone|empty/i);
  });
});
