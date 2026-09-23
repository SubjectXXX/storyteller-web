import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RECAP_FIXTURE } from '@/api-client';
import { MemoryPanel } from './MemoryPanel';

describe('MemoryPanel', () => {
  it('renders a recap timeline when the recap resource is provided', () => {
    render(<MemoryPanel recap={RECAP_FIXTURE} isLoading={false} error={null} />);
    expect(screen.getByRole('region', { name: /memory|recap/i })).toBeInTheDocument();
    for (const turn of RECAP_FIXTURE.turns) {
      expect(screen.getByText(turn.headline)).toBeInTheDocument();
    }
  });

  it('renders the Stage 5 placeholder when the recap is missing', () => {
    render(<MemoryPanel recap={undefined} isLoading={false} error={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(/stage 5|coming|memory/i);
  });

  it('renders the placeholder when the API returns 404', () => {
    render(
      <MemoryPanel recap={undefined} isLoading={false} error={{ message: 'Not found', status: 404 }} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/stage 5|coming|memory/i);
  });

  it('renders a loading indicator while the recap is pending', () => {
    render(<MemoryPanel recap={undefined} isLoading error={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });
});
