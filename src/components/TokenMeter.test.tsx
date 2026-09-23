import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenMeter } from './TokenMeter';
import type { TurnUsage } from '@/api-client';

const SAMPLE_USAGE: TurnUsage = {
  inputTokens: 120,
  outputTokens: 87,
  totalTokens: 207,
  latencyMs: 1450,
  model: 'qwen2.5-7b-instruct',
  finishReason: 'stop',
  costCredits: 4,
};

describe('TokenMeter', () => {
  it('renders nothing when no usage is provided', () => {
    const { container } = render(<TokenMeter usage={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders input / output / total tokens and the cost', () => {
    render(<TokenMeter usage={SAMPLE_USAGE} />);
    expect(screen.getByTestId('token-meter')).toBeTruthy();
    expect(screen.getByTitle('Input tokens').textContent).toMatch(/120/);
    expect(screen.getByTitle('Output tokens').textContent).toMatch(/87/);
    expect(screen.getByTitle('Total tokens').textContent).toMatch(/207/);
    expect(screen.getByTitle('Credit cost for this turn').textContent).toMatch(/4 credits/);
    expect(screen.getByTitle('Model').textContent).toMatch(/qwen2\.5-7b-instruct/);
    expect(screen.getByTitle('Finish reason').textContent).toMatch(/stop/);
  });

  it('uses the length finish-reason intent when the model truncated', () => {
    render(<TokenMeter usage={{ ...SAMPLE_USAGE, finishReason: 'length' }} />);
    expect(screen.getByTitle('Finish reason').textContent).toMatch(/length/);
  });
});
